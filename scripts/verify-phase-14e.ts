import "dotenv/config";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, mkdir, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, posix } from "node:path";
import { chromium } from "playwright";
import { Client } from "basic-ftp";
import mysql from "mysql2/promise";
import { eq } from "drizzle-orm";
import { requestHandler } from "@tanstack/react-start/server";
import { db, closeDb } from "../src/server/db";
import { adminUsers, resourceItems } from "../src/server/db/schema";
import {
  ADMIN_SESSION_COOKIE_NAME,
  createAdminSession,
  deleteAdminSession,
} from "../src/server/auth";
import {
  createResource,
  updateResourceMetadata,
  deleteResource,
  getResourcesForAdmin,
  getPublishedResources,
  getPublishedResourceBySlug,
  ResourceApplicationError,
} from "../src/server/resources";
import { sourceRecords, verifyResources } from "./migrate-resources-static";

const base = "http://127.0.0.1:5177";
const hash = (bytes: Buffer | string) =>
  createHash("sha256").update(bytes).digest("hex");
async function inRequest(operation: () => Promise<unknown>) {
  let error: unknown;
  const handler = requestHandler(async () => {
    try {
      await operation();
    } catch (failure) {
      error = failure;
    }
    return new Response(null, { status: 204 });
  });
  await handler(new Request(base), {});
  if (error) throw error;
}
async function galleryInventory() {
  const client = new Client(20000),
    keys: string[] = [];
  try {
    await client.access({
      host: process.env["MEDIA_FTP_HOST"]!,
      port: Number(process.env["MEDIA_FTP_PORT"]),
      user: process.env["MEDIA_FTP_USERNAME"]!,
      password: process.env["MEDIA_FTP_PASSWORD"]!,
      secure: true,
    });
    async function walk(directory: string) {
      for (const file of await client.list(
        posix.join(process.env["MEDIA_FTP_ROOT"]!, directory),
      )) {
        const key = posix.join(directory, file.name);
        if (file.isDirectory) await walk(key);
        else keys.push(key);
      }
    }
    await walk("gallery");
    return keys.sort();
  } finally {
    client.close();
  }
}

async function main() {
  console.log("Checking source and database fidelity.");
  globalThis.__umangaMySqlPool ??= mysql.createPool({
    uri: process.env["DATABASE_URL"]!,
    connectionLimit: 1,
  });
  const source = sourceRecords();
  const original = await verifyResources();
  const selected = original.find((item) => item.slug === source[0]!.slug)!;
  const connection = globalThis.__umangaMySqlPool;
  const tables = [
    "news_items",
    "event_items",
    "gallery_items",
    "gallery_albums",
    "our_work_items",
    "story_items",
    "inbox_threads",
    "inbox_messages",
    "admin_sessions",
  ];
  async function snapshot() {
    const result: Record<string, mysql.RowDataPacket[]> = {};
    for (const table of tables) {
      const [rows] = await connection.query<mysql.RowDataPacket[]>(
        `SELECT * FROM ${table} ORDER BY id`,
      );
      result[table] = rows;
    }
    return result;
  }
  const before = await snapshot();
  assert.deepEqual(
    tables.slice(0, 8).map((table) => before[table]!.length),
    [3, 4, 26, 1, 8, 5, 3, 4],
  );
  const media = await galleryInventory();
  assert.deepEqual(
    media,
    before["gallery_items"]!.map((row) =>
      String(row["image_storage_key"]),
    ).sort(),
  );
  const mediaHashes: Record<string, string> = {};
  for (const photo of before["gallery_items"]!) {
    const response = await fetch(String(photo["image_url"]));
    assert.equal(response.status, 200);
    mediaHashes[String(photo["id"])] = hash(
      Buffer.from(await response.arrayBuffer()),
    );
  }
  const staticHash = hash(await readFile("src/data/resources.ts"));
  for (const operation of [
    () => createResource(source[0]),
    () =>
      updateResourceMetadata({
        id: selected.id,
        metadata: { title: "Unauthorized test" },
      }),
    () => deleteResource(selected.id),
    () => getResourcesForAdmin(),
  ]) {
    await assert.rejects(
      () => inRequest(operation),
      (error: unknown) =>
        error instanceof ResourceApplicationError &&
        error.code === "UNAUTHORIZED",
    );
  }
  assert.deepEqual(
    (await getPublishedResources()).map((item) => item.slug),
    source.map((item) => item.slug),
  );
  const [admin] = await db.select().from(adminUsers).limit(1);
  assert(admin);
  const session = await createAdminSession(admin.id);
  const browser = await chromium.launch({
    executablePath:
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
  });
  const page = await context.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const secrets = Object.entries(process.env)
    .filter(
      ([key, value]) =>
        /PASSWORD|SECRET|TOKEN|DATABASE_URL/.test(key) &&
        value &&
        value.length >= 8,
    )
    .map(([, value]) => value!);
  async function visit(path: string) {
    console.log(`Checking public route: ${path}`);
    const response = await page.goto(base + path);
    await page.waitForLoadState("networkidle");
    const html = await response!.text();
    assert(!html.includes("admin@umanganepal.org"));
    for (const secret of secrets)
      assert(!html.includes(secret), "Secret exposed in public response.");
    return response!;
  }
  const artifacts = join(tmpdir(), "umanga-phase14e-verification");
  await mkdir(artifacts, { recursive: true });
  async function resourceLinks() {
    return page
      .locator('main a[href^="/resources/"]')
      .evaluateAll((links) => links.map((link) => link.getAttribute("href")));
  }
  async function edit(title: string, content: string, published: boolean) {
    console.log(`Checking admin edit; published=${published}`);
    const adminPage = await authenticated.newPage();
    try {
      await adminPage.goto(base + "/admin/resources");
      await adminPage.waitForLoadState("networkidle");
      const card = adminPage
        .locator("article")
        .filter({ hasText: selected.slug });
      await card.getByRole("button", { name: "Edit", exact: true }).click();
      const dialog = adminPage.getByRole("dialog");
      await dialog.locator("#resource-title").fill(title);
      await dialog.locator("#resource-content").fill(content);
      await dialog
        .getByLabel("Published", { exact: true })
        .setChecked(published);
      await dialog
        .getByRole("button", { name: "Save Resource", exact: true })
        .click();
      await dialog.waitFor({ state: "hidden" });
    } finally {
      await adminPage.close();
    }
  }
  const authenticated = await browser.newContext();
  await authenticated.addCookies([
    {
      name: ADMIN_SESSION_COOKIE_NAME,
      value: session.token,
      url: base,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  try {
    if (!process.argv.includes("--admin-only")) {
      await visit("/resources");
      assert.deepEqual(
        await resourceLinks(),
        source.map((item) => "/resources/" + item.slug),
      );
      await page
        .getByRole("textbox", { name: "Search resources" })
        .fill("anxiety");
      assert.deepEqual(await resourceLinks(), [
        "/resources/understanding-anxiety",
      ]);
      await page.getByRole("textbox", { name: "Search resources" }).fill("");
      for (const item of source) {
        const response = await visit("/resources/" + item.slug);
        assert.equal(response.status(), 200);
        assert.equal(await page.locator("h1").innerText(), item.title);
        const paragraphs = await page
          .locator("article .grid > div.flex.flex-col.gap-5 > p")
          .allTextContents();
        assert.deepEqual(paragraphs, item.content.split("\n\n"));
        const related = source
          .filter(
            (other) =>
              other.slug !== item.slug && other.category === item.category,
          )
          .concat(
            source.filter(
              (other) =>
                other.slug !== item.slug && other.category !== item.category,
            ),
          )
          .slice(0, 3);
        assert.deepEqual(
          await resourceLinks(),
          related.map((other) => "/resources/" + other.slug),
        );
        assert.equal(
          (await getPublishedResourceBySlug(item.slug))!.content,
          item.content,
        );
      }
      assert.equal(
        (await visit("/resources/phase-14e-nonexistent")).status(),
        404,
      );
      for (const width of [390, 1440]) {
        await page.setViewportSize({ width, height: 900 });
        for (const path of ["/resources", "/resources/" + selected.slug, "/"]) {
          assert.equal((await visit(path)).status(), 200);
          assert(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
          );
          await page.evaluate(async () => {
            for (
              let y = 0;
              y < document.documentElement.scrollHeight;
              y += innerHeight
            ) {
              scrollTo(0, y);
              await new Promise((resolve) => setTimeout(resolve, 100));
            }
            scrollTo(0, 0);
          });
          await page.waitForTimeout(700);
          await page.screenshot({
            path: join(
              artifacts,
              `${path === "/" ? "home" : path === "/resources" ? "listing" : "detail"}-${width}.png`,
            ),
            fullPage: true,
          });
          if (path === "/")
            assert.deepEqual(
              await resourceLinks(),
              source.slice(0, 6).map((item) => "/resources/" + item.slug),
            );
        }
      }
    }
    await edit(selected.title, selected.content, false);
    assert.equal(await getPublishedResourceBySlug(selected.slug), null);
    assert.equal((await getPublishedResources()).length, 9);
    await visit("/resources");
    assert(!(await resourceLinks()).includes("/resources/" + selected.slug));
    const missing = await visit("/resources/" + selected.slug);
    assert.equal(missing.status(), 404);
    assert(!(await missing.text()).includes(selected.content));
    assert(!(await missing.text()).includes(selected.title));
    assert(
      !(await missing.text()).includes(selected.content.split("\n\n")[0]!),
    );
    await visit("/");
    assert(!(await resourceLinks()).includes("/resources/" + selected.slug));
    await visit("/resources/" + source[1]!.slug);
    assert(!(await resourceLinks()).includes("/resources/" + selected.slug));
    await edit(selected.title, selected.content, true);
    const changedTitle = selected.title + " — Phase 14E नमस्ते 🌿";
    const changedContent = selected.content + "\n\nनमस्ते उमङ्ग नेपाल 🌿";
    await edit(changedTitle, changedContent, true);
    await visit("/resources/" + selected.slug);
    assert.equal(await page.locator("h1").innerText(), changedTitle);
    assert(
      (await page.locator("article").first().innerText()).includes(
        "नमस्ते उमङ्ग नेपाल 🌿",
      ),
    );
    assert.equal(
      (await getPublishedResourceBySlug(selected.slug))!.content,
      changedContent,
    );
    await visit("/resources");
    assert((await page.locator("main").innerText()).includes(changedTitle));
    await visit("/");
    assert((await page.locator("main").innerText()).includes(changedTitle));
    await visit("/resources/" + source[1]!.slug);
    assert((await page.locator("main").innerText()).includes(changedTitle));
    await edit(selected.title, selected.content, selected.published);
    assert.deepEqual(errors, []);
    for (const file of await readdir(".output/public/assets")) {
      if (!/\.(js|css|json)$/.test(file)) continue;
      const text = await readFile(join(".output/public/assets", file), "utf8");
      assert(!text.includes("admin@umanganepal.org"));
      for (const secret of secrets) assert(!text.includes(secret));
    }
    console.log(
      "10 detail URLs, exact paragraphs/related order, listing search, homepage first-six, SSR/404, publication exclusion, real admin edit propagation, mobile/desktop and security passed.",
    );
  } finally {
    // Restore the exact captured editorial row and timestamp, even if browser assertions fail.
    const { id, createdAt, ...values } = selected;
    await db.update(resourceItems).set(values).where(eq(resourceItems.id, id));
    await deleteAdminSession(session.token);
    await browser.close();
    await verifyResources();
    assert.deepEqual(await db.select().from(resourceItems), original);
    assert.deepEqual(await snapshot(), before);
    assert.equal(hash(await readFile("src/data/resources.ts")), staticHash);
    assert.deepEqual(await galleryInventory(), media);
    for (const photo of before["gallery_items"]!) {
      const response = await fetch(String(photo["image_url"]));
      assert.equal(response.status, 200);
      assert.equal(
        hash(Buffer.from(await response.arrayBuffer())),
        mediaHashes[String(photo["id"])],
      );
    }
    await closeDb();
    console.log(
      "10/10 source fidelity restored; original timestamps, all other records/sessions and 26 Gallery media objects/hashes preserved. No emails/media uploads.",
    );
  }
}
main().catch((error) => {
  console.error(
    error instanceof Error ? error.name : "Unknown verification error",
  );
  console.error(
    error instanceof assert.AssertionError
      ? error.message
      : "Phase 14E browser verification failed; inspect the focused harness.",
  );
  if (error instanceof Error && error.name === "TimeoutError")
    console.error(error.message.split("\n").slice(0, 5).join("\n"));
  else if (
    error instanceof Error &&
    !(error instanceof assert.AssertionError)
  ) {
    let message = error.message.split("\n")[0]!;
    for (const [key, value] of Object.entries(process.env))
      if (/PASSWORD|SECRET|TOKEN|DATABASE_URL|MEDIA_FTP/.test(key) && value)
        message = message.split(value).join("[redacted]");
    console.error(message);
  }
  process.exitCode = 1;
});
