// Manual verification: temporary data/media/session are removed in finally.
import "dotenv/config";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { readFile, mkdir, writeFile, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, posix } from "node:path";
import { chromium } from "playwright";
import mysql from "mysql2/promise";
import { Client } from "basic-ftp";
import { requestHandler } from "@tanstack/react-start/server";
import { db, closeDb, getDb } from "../src/server/db";
import {
  adminUsers,
  galleryAlbums,
  galleryItems,
} from "../src/server/db/schema";
import {
  ADMIN_SESSION_COOKIE_NAME,
  createAdminSession,
  deleteAdminSession,
} from "../src/server/auth";
import {
  createGalleryItem,
  updateGalleryItemMetadata,
  deleteGalleryItem,
  createGalleryAlbum,
  deleteGalleryAlbum,
  getPublishedGalleryPage,
  GalleryApplicationError,
} from "../src/server/gallery";
import {
  createResource,
  updateResourceMetadata,
  deleteResource,
  getPublishedResources,
  ResourceApplicationError,
} from "../src/server/resources";
import { mediaExists, deleteMedia } from "../src/server/storage";

const base = "http://127.0.0.1:5177";
const prefix = `Phase 14D Verification ${randomUUID()}`;
const artifacts = join(tmpdir(), "umanga-phase14d-verification");
const hash = (bytes: Buffer | string) =>
  createHash("sha256").update(bytes).digest("hex");

async function inRequest<T>(
  token: string | undefined,
  operation: () => Promise<T>,
) {
  let result: T | undefined, error: unknown;
  const handler = requestHandler(async () => {
    try {
      result = await operation();
    } catch (failure) {
      error = failure;
    }
    return new Response(null, { status: 204 });
  });
  await handler(
    new Request(base, {
      headers: token ? { cookie: `${ADMIN_SESSION_COOKIE_NAME}=${token}` } : {},
    }),
    {},
  );
  if (error) throw error;
  return result as T;
}
async function galleryMedia() {
  const client = new Client(20000);
  try {
    await client.access({
      host: process.env["MEDIA_FTP_HOST"]!,
      port: Number(process.env["MEDIA_FTP_PORT"]),
      user: process.env["MEDIA_FTP_USERNAME"]!,
      password: process.env["MEDIA_FTP_PASSWORD"]!,
      secure: true,
    });
    const keys: string[] = [];
    async function walk(path: string) {
      for (const file of await client.list(
        posix.join(process.env["MEDIA_FTP_ROOT"]!, path),
      )) {
        const key = posix.join(path, file.name);
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
  await mkdir(artifacts, { recursive: true });
  const connection = await mysql.createConnection(process.env["DATABASE_URL"]!);
  const baseline = JSON.parse(
    await readFile(join(tmpdir(), "umanga-phase14d-baseline.json"), "utf8"),
  ) as Record<string, Record<string, unknown>[]>;
  async function rows(table: string) {
    const [rows] = await connection.query<mysql.RowDataPacket[]>(
      `SELECT * FROM ${table} ORDER BY id`,
    );
    return rows;
  }
  const originalMedia = await galleryMedia();
  const originalHashes: Record<string, string> = {};
  for (const row of baseline["gallery_items"]!) {
    const response = await fetch(String(row["image_url"]));
    assert.equal(response.status, 200);
    originalHashes[String(row["id"])] = hash(
      Buffer.from(await response.arrayBuffer()),
    );
  }
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
  await context.addCookies([
    {
      name: ADMIN_SESSION_COOKIE_NAME,
      value: session.token,
      url: base,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  const page = await context.newPage();
  page.setDefaultTimeout(15000);
  async function visit(url: string) {
    await page.goto(url);
    await page.waitForLoadState("networkidle");
  }
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const results: Record<string, unknown> = {};
  const ownedKeys = new Set<string>();
  async function rememberMedia() {
    for (const row of await rows("gallery_items"))
      if (String(row["title"]).startsWith(prefix))
        ownedKeys.add(String(row["image_storage_key"]));
    await writeFile(
      join(artifacts, "owned-media.json"),
      JSON.stringify([...ownedKeys]),
    );
  }
  async function screenshot(name: string, width = 1440) {
    await page.setViewportSize({ width, height: 900 });
    await page.screenshot({
      path: join(artifacts, `${name}-${width}.png`),
      fullPage: true,
    });
    assert(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      `Horizontal overflow: ${name} ${width}`,
    );
  }
  async function waitDialogClose() {
    await page
      .getByRole("dialog")
      .waitFor({ state: "hidden", timeout: 180000 });
  }
  const body = "नमस्ते उमङ्ग नेपाल 🌿\n\nपहिलो अनुच्छेद।\n\nदोस्रो अनुच्छेद।";
  try {
    console.log("Unauthorized checks");
    const image = { buffer: Buffer.from("invalid"), mimeType: "image/png" };
    for (const operation of [
      () =>
        createGalleryItem({
          metadata: { title: prefix, published: true },
          image,
        }),
      () =>
        createGalleryAlbum({
          metadata: {
            name: prefix,
            title: prefix,
            category: "Event",
            published: true,
          },
          images: [image],
        }),
      () =>
        updateGalleryItemMetadata({
          id: String(baseline["gallery_items"]![0]!["id"]),
          metadata: { title: prefix, published: true },
        }),
      () => deleteGalleryItem(String(baseline["gallery_items"]![0]!["id"])),
      () => deleteGalleryAlbum("00000000-0000-4000-8000-000000000000"),
    ])
      await assert.rejects(
        () => inRequest<unknown>(undefined, operation),
        (error) =>
          error instanceof GalleryApplicationError &&
          error.code === "UNAUTHORIZED",
      );
    for (const operation of [
      () => createResource({}),
      () => updateResourceMetadata({}),
      () => deleteResource("00000000-0000-4000-8000-000000000000"),
    ])
      await assert.rejects(
        () => inRequest<unknown>(undefined, operation),
        (error) =>
          error instanceof ResourceApplicationError &&
          error.code === "UNAUTHORIZED",
      );
    results["unauthorized"] =
      "All Gallery and Resource mutation boundaries rejected.";
    console.log("Resource real UI lifecycle");
    await visit(`${base}/admin/resources`);
    await page.getByRole("heading", { name: "No resources yet." }).waitFor();
    await page
      .getByRole("button", { name: "Create Resource", exact: true })
      .click();
    await page.getByLabel("Title", { exact: true }).fill(`${prefix} संसाधन 🌿`);
    await page
      .getByLabel("Slug", { exact: true })
      .fill("phase-14d-resource-verification");
    await page
      .getByLabel("Excerpt", { exact: true })
      .fill("Temporary resource verification.");
    await page.getByLabel("Content", { exact: true }).fill(body);
    await page.getByLabel("Category", { exact: true }).fill("Mental health");
    await page.getByLabel("Type", { exact: true }).selectOption("guide");
    await page.getByLabel("Reading Time (minutes)", { exact: true }).fill("7");
    await page.getByLabel("Sort Order", { exact: true }).fill("2");
    await page.getByLabel("Published At", { exact: true }).fill("2026-10-08");
    await page.getByLabel("Reviewed At", { exact: true }).fill("2026-10-08");
    await screenshot("resource-create", 390);
    await page
      .getByRole("button", { name: "Save Resource", exact: true })
      .click();
    await waitDialogClose();
    const [resource] = await rows("resource_items");
    assert(resource);
    assert.equal(resource["content"], body);
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    assert.equal(
      await page.getByLabel("Content", { exact: true }).inputValue(),
      body,
    );
    await page
      .getByLabel("Title", { exact: true })
      .fill(`${prefix} Updated 🌿`);
    assert.equal(
      await page.getByLabel("Slug", { exact: true }).inputValue(),
      "phase-14d-resource-verification",
    );
    await page.getByLabel("Published", { exact: true }).uncheck();
    await page
      .getByRole("button", { name: "Save Resource", exact: true })
      .click();
    await waitDialogClose();
    assert.equal((await getPublishedResources()).length, 0);
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await page.getByLabel("Published", { exact: true }).check();
    await page
      .getByRole("button", { name: "Save Resource", exact: true })
      .click();
    await waitDialogClose();
    assert.equal((await getPublishedResources()).length, 1);
    await page
      .getByRole("button", { name: "Create Resource", exact: true })
      .click();
    for (const [label, value] of [
      ["Title", `${prefix} Duplicate`],
      ["Slug", "phase-14d-resource-verification"],
      ["Excerpt", "Temporary"],
      ["Content", body],
      ["Category", "Mental health"],
    ])
      await page.getByLabel(label!, { exact: true }).fill(value!);
    await page
      .getByRole("button", { name: "Save Resource", exact: true })
      .click();
    await page
      .getByRole("alert")
      .filter({ hasText: "Slug already exists" })
      .waitFor();
    assert.equal((await rows("resource_items")).length, 1);
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await screenshot("resources", 1440);
    await screenshot("resources", 390);
    await page
      .getByRole("button", { name: `Delete ${prefix} Updated 🌿`, exact: true })
      .click();
    await page
      .getByRole("button", { name: "Delete Resource", exact: true })
      .click();
    await page.getByRole("alertdialog").waitFor({ state: "hidden" });
    assert.equal((await rows("resource_items")).length, 0);
    results["resources"] =
      "Real UI create/refresh/edit/publication/duplicate/delete, Unicode and paragraphs passed.";
    console.log("Gallery single-photo real UI");
    const images = await page.evaluate(() =>
      [
        [360, 540],
        [600, 360],
        [450, 450],
      ].map(([width, height], index) => {
        const canvas = document.createElement("canvas");
        canvas.width = width!;
        canvas.height = height!;
        const context = canvas.getContext("2d")!;
        context.fillStyle = ["#b5ddd2", "#e9bcbd", "#d1d79f"][index]!;
        context.fillRect(0, 0, width!, height!);
        context.fillStyle = "#263c36";
        context.font = "20px sans-serif";
        context.fillText("Phase 14D temporary image", 20, 40);
        context.fillText(`${width} x ${height}`, 20, 75);
        return canvas.toDataURL("image/png").split(",")[1]!;
      }),
    );
    const fixtures = images.map((encoded, index) => ({
      name: `phase14d-${index}.png`,
      mimeType: "image/png",
      buffer: Buffer.from(encoded, "base64"),
    }));
    await visit(`${base}/admin/gallery`);
    await page
      .getByRole("button", { name: "Add Gallery Image", exact: true })
      .click();
    await page.getByLabel("Title", { exact: true }).fill(`${prefix} Single`);
    await page.getByLabel("Caption", { exact: false }).fill(body);
    await page.getByLabel("Category", { exact: true }).selectOption("Activity");
    await page
      .getByLabel("Activity Name", { exact: true })
      .fill("Mental health कला 🌿");
    await page.locator('input[type="file"]').setInputFiles(fixtures[0]!);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Add Gallery Image", exact: true })
      .click();
    await waitDialogClose();
    await rememberMedia();
    const single = (await rows("gallery_items")).find(
      (row) => row["title"] === `${prefix} Single`,
    );
    assert(single);
    assert.equal(single["category"], "Activity");
    assert.equal(single["image_width"], 360);
    assert.equal(single["image_height"], 540);
    const singleCard = page.getByRole("article").filter({
      has: page.getByRole("heading", {
        name: `${prefix} Single`,
        exact: true,
      }),
    });
    await singleCard.getByRole("button", { name: "Edit", exact: true }).click();
    await page.getByLabel("Category", { exact: true }).selectOption("Session");
    await page
      .getByLabel("Session Name", { exact: true })
      .fill("Mental health session 🌿");
    await page
      .getByRole("button", { name: "Save Changes", exact: true })
      .click();
    await waitDialogClose();
    results["single"] =
      "Uploaded and edited category/context through UI; portrait dimensions stored.";
    console.log("Gallery 26 rejected; 25-photo album real UI upload");
    const metadata = {
      name: `${prefix} Album`,
      title: `${prefix} Album Photos`,
      caption: body,
      category: "Event",
      contextName: "Mental health कार्यक्रम 🌿",
      published: true,
    };
    await assert.rejects(
      () =>
        inRequest(session.token, () =>
          createGalleryAlbum({
            metadata,
            images: Array.from({ length: 26 }, () => fixtures[0]!),
          }),
        ),
      (error) =>
        error instanceof GalleryApplicationError &&
        error.code === "INVALID_DATA",
    );
    await page
      .getByRole("button", { name: "Upload Album", exact: true })
      .click();
    await page.getByLabel("Album Name", { exact: true }).fill(metadata.name);
    await page.getByLabel("Title", { exact: true }).fill(metadata.title);
    await page.getByLabel("Caption", { exact: true }).fill(body);
    await page
      .getByLabel("Event Name", { exact: true })
      .fill(metadata.contextName);
    await page.locator('input[type="file"]').setInputFiles(
      Array.from({ length: 26 }, (_, index) => ({
        ...fixtures[index % 3]!,
        name: `phase14d-${index}.png`,
      })),
    );
    await page.getByRole("alert").filter({ hasText: "at most 25" }).waitFor();
    await page.locator('input[type="file"]').setInputFiles(
      Array.from({ length: 25 }, (_, index) => ({
        ...fixtures[index % 3]!,
        name: `phase14d-${index}.png`,
      })),
    );
    await screenshot("gallery-album-upload", 390);
    await page
      .getByRole("dialog")
      .getByRole("button", { name: "Upload Album", exact: true })
      .click();
    await waitDialogClose();
    await rememberMedia();
    const [album] = await rows("gallery_albums");
    assert(album);
    const photos = (await rows("gallery_items")).filter(
      (row) => row["album_id"] === album["id"],
    );
    assert.equal(photos.length, 25);
    for (const photo of photos) {
      assert.equal(photo["title"], metadata.title);
      assert.equal(photo["caption"], body.replaceAll("\n", "\r\n"));
      assert.equal(photo["category"], "Event");
      assert.equal(photo["context_name"], metadata.contextName);
      assert(await mediaExists(String(photo["image_storage_key"])));
    }
    await assert.rejects(() =>
      inRequest(session.token, () =>
        createGalleryItem({
          metadata: {
            title: prefix,
            published: true,
            albumId: String(album["id"]),
          },
          image: fixtures[0]!,
        }),
      ),
    );
    await rememberMedia();
    assert.equal((await rows("gallery_items")).length, 28);
    results["album"] =
      "25 photos accepted through real UI; 26 rejected by UI/backend; adding a 26th photo to existing album rejected.";
    console.log("Public pagination and combined filters");
    const first = await getPublishedGalleryPage({}),
      second = await getPublishedGalleryPage({ page: 2 });
    assert.equal(first.items.length, 25);
    assert.equal(second.items.length, 3);
    const [sorted] = await connection.query<mysql.RowDataPacket[]>(
      "SELECT id FROM gallery_items WHERE published=1 ORDER BY created_at DESC,id DESC",
    );
    assert.deepEqual(
      [...first.items, ...second.items].map((row) => row.id),
      sorted.map((row) => row["id"]),
    );
    for (const query of [
      { q: "Mental health" },
      { category: "Event" },
      { album: album["id"] },
      { q: "Mental health", category: "Event" },
      { q: "Mental health", album: album["id"] },
      { category: "Event", album: album["id"] },
      { q: "Mental health", category: "Event", album: album["id"] },
      { q: prefix, page: 2 },
    ]) {
      const result = await getPublishedGalleryPage(query);
      assert(result.totalCount > 0);
      for (const item of result.items) {
        if ("album" in query) assert.equal(item.albumId, album["id"]);
        if ("category" in query) assert.equal(item.category, "Event");
      }
    }
    assert.equal(
      (await getPublishedGalleryPage({ q: "कार्यक्रम" })).totalCount,
      25,
    );
    await visit(`${base}/gallery`);
    await page.getByRole("list", { name: "Gallery photos" }).waitFor();
    assert.equal(
      await page
        .getByRole("list", { name: "Gallery photos" })
        .getByRole("listitem")
        .count(),
      25,
    );
    await page.getByRole("button", { name: "Next page", exact: true }).click();
    await page.waitForURL(/page=2/);
    await page.getByRole("status").filter({ hasText: "Page 2" }).waitFor();
    await page.getByLabel("Category", { exact: true }).selectOption("Event");
    await page.waitForURL(/page=1/);
    await page
      .getByLabel("Album", { exact: true })
      .selectOption(String(album["id"]));
    await page
      .getByRole("searchbox", { name: "Search photos", exact: true })
      .fill("Mental health");
    await page
      .getByRole("button", { name: "Search photos", exact: true })
      .click();
    await page.waitForURL(/q=Mental/);
    await page.reload();
    await page.waitForLoadState("networkidle");
    assert.equal(
      await page.getByLabel("Album", { exact: true }).inputValue(),
      album["id"],
    );
    assert.equal(
      await page.getByLabel("Category", { exact: true }).inputValue(),
      "Event",
    );
    assert.equal(
      await page
        .getByRole("searchbox", { name: "Search photos", exact: true })
        .inputValue(),
      "Mental health",
    );
    for (const width of [390, 768, 1440]) {
      await screenshot("gallery-masonry", width);
      const ratios = await page
        .locator('ul[aria-label="Gallery photos"] img')
        .evaluateAll((images) =>
          images
            .filter(
              (image) =>
                (image as HTMLImageElement).complete &&
                (image as HTMLImageElement).naturalWidth > 0,
            )
            .map((image) => {
              const img = image as HTMLImageElement;
              return {
                natural: img.naturalWidth / img.naturalHeight,
                rendered:
                  img.getBoundingClientRect().width /
                  img.getBoundingClientRect().height,
              };
            }),
        );
      assert(ratios.length > 0);
      ratios.forEach((ratio) =>
        assert(Math.abs(ratio.natural - ratio.rendered) < 0.01),
      );
    }
    const trigger = page
      .getByRole("button", { name: `Preview ${metadata.title}`, exact: true })
      .first();
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();
    await page.getByRole("dialog").waitFor();
    assert(
      await page.evaluate(
        () => getComputedStyle(document.body).overflow === "hidden",
      ),
    );
    await page.getByRole("dialog").getByRole("img").click();
    assert(await page.getByRole("dialog").isVisible());
    await page.keyboard.press("Escape");
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    assert(
      await trigger.evaluate((element) => element === document.activeElement),
    );
    await trigger.click();
    await page
      .getByRole("button", { name: "Close image preview", exact: true })
      .click();
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await trigger.click();
    await page.getByRole("dialog").click({ position: { x: 5, y: 75 } });
    await page.getByRole("dialog").waitFor({ state: "hidden" });
    await page
      .getByRole("button", { name: "Clear filters", exact: true })
      .click();
    await page.waitForURL(
      (url) =>
        !url.searchParams.get("category") &&
        !url.searchParams.get("album") &&
        !url.searchParams.get("q"),
    );
    await page.getByRole("status").filter({ hasText: "28 photos" }).waitFor();
    assert.equal(
      await page.getByLabel("Category", { exact: true }).inputValue(),
      "",
    );
    results["publicGallery"] =
      "Latest-first 1/25/26 boundaries, 25/page, eight combined filter cases, Unicode search, URL refresh/reset, natural ratios at 390/768/1440, lightbox image/backdrop/Escape/close/scroll-lock/focus passed.";
    console.log("Events CTA and static Resources freeze");
    await visit(`${base}/events`);
    const events = await rows("event_items");
    for (const event of events) {
      const card = page.getByRole("article").filter({
        has: page.getByRole("heading", {
          name: String(event["title"]),
          exact: true,
        }),
      });
      await card.waitFor();
      assert.equal(
        await card
          .getByRole("link", { name: "Contact for Registration" })
          .count(),
        event["registration_open"] ? 1 : 0,
      );
      if (event["registration_open"])
        assert.equal(
          await card
            .getByRole("link", { name: "Contact for Registration" })
            .getAttribute("href"),
          "/contact",
        );
    }
    await screenshot("events", 390);
    await screenshot("events", 1440);
    const registration = page
      .getByRole("link", { name: "Contact for Registration" })
      .first();
    if (await registration.count()) {
      await registration.click();
      await page.waitForURL(`${base}/contact`);
    }
    await visit(`${base}/resources`);
    assert(!(await page.locator("body").innerText()).includes(prefix));
    await screenshot("public-resources-static", 390);
    results["events"] =
      "All four records checked; open-only CTA links to /contact, no form submitted.";
    console.log("Admin responsive checks and UI cleanup");
    await visit(`${base}/admin/gallery`);
    await screenshot("admin-gallery", 390);
    await screenshot("admin-gallery", 1440);
    const albumCard = page
      .getByRole("article")
      .filter({
        has: page.getByRole("heading", { name: metadata.title, exact: true }),
      })
      .first();
    await albumCard
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Delete Image", exact: true })
      .click();
    await page.getByRole("alertdialog").waitFor({ state: "hidden" });
    const [sharedSource] = await connection.query<mysql.RowDataPacket[]>(
      "SELECT * FROM gallery_items WHERE album_id=? LIMIT 1",
      [album["id"]],
    );
    const shared = sharedSource[0]!;
    await connection.execute(
      "INSERT INTO gallery_items(id,title,image_url,image_storage_key,published) VALUES(?,?,?,?,1)",
      [
        randomUUID(),
        `${prefix} Shared`,
        shared["image_url"],
        shared["image_storage_key"],
      ],
    );
    await page
      .getByRole("button", {
        name: `Delete album ${metadata.name}`,
        exact: true,
      })
      .click();
    await screenshot("album-delete", 390);
    await page
      .getByRole("button", { name: "Delete Album", exact: true })
      .click();
    await page
      .getByRole("alertdialog")
      .waitFor({ state: "hidden", timeout: 180000 });
    assert(
      await mediaExists(String(shared["image_storage_key"])),
      "Referenced media must survive album deletion.",
    );
    await page
      .getByRole("article")
      .filter({
        has: page.getByRole("heading", {
          name: `${prefix} Shared`,
          exact: true,
        }),
      })
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Delete Image", exact: true })
      .click();
    await page.getByRole("alertdialog").waitFor({ state: "hidden" });
    assert.equal(await mediaExists(String(shared["image_storage_key"])), false);
    await page
      .getByRole("article")
      .filter({
        has: page.getByRole("heading", {
          name: `${prefix} Single`,
          exact: true,
        }),
      })
      .getByRole("button", { name: "Delete", exact: true })
      .click();
    await page
      .getByRole("alertdialog")
      .getByRole("button", { name: "Delete Image", exact: true })
      .click();
    await page
      .getByRole("alertdialog")
      .waitFor({ state: "hidden", timeout: 60000 });
    console.log("Album rollback compensation: injected DB failure");
    const client = getDb(),
      originalTransaction = client.transaction;
    client.transaction = async () => {
      throw new Error("Controlled persistence failure");
    };
    try {
      await assert.rejects(() =>
        inRequest(session.token, () =>
          createGalleryAlbum({
            metadata: { ...metadata, name: `${prefix} Failed` },
            images: [fixtures[1]!],
          }),
        ),
      );
    } finally {
      client.transaction = originalTransaction;
    }
    assert.deepEqual(await galleryMedia(), originalMedia);
    results["compensation"] =
      "Injected DB failure after upload removed media; no album/photo rows left.";
    const originalUpload = Client.prototype.uploadFrom;
    let uploadCalls = 0;
    Client.prototype.uploadFrom = async function (
      ...args: Parameters<typeof originalUpload>
    ) {
      if (++uploadCalls === 2)
        throw new Error("Controlled upload failure before transfer");
      return originalUpload.apply(this, args);
    };
    try {
      await assert.rejects(() =>
        inRequest(session.token, () =>
          createGalleryAlbum({
            metadata: { ...metadata, name: `${prefix} Upload Failure` },
            images: [fixtures[0]!, fixtures[1]!],
          }),
        ),
      );
    } finally {
      Client.prototype.uploadFrom = originalUpload;
    }
    assert.deepEqual(await galleryMedia(), originalMedia);
    results["uploadFailure"] =
      "Second upload rejected before transfer; the first uploaded photo was compensated and no album/photo rows remained.";
    results["browserErrors"] = errors;
    assert.deepEqual(errors, []);
  } catch (error) {
    await page.screenshot({
      path: join(artifacts, "failure.png"),
      fullPage: true,
    });
    console.error(
      "Verification step failed:",
      error instanceof Error ? error.message : "Unknown error",
      "Browser errors:",
      errors,
    );
    throw error;
  } finally {
    // Only remove records carrying the exact verification prefix; preserve all baseline IDs.
    for (const album of await rows("gallery_albums"))
      if (String(album["name"]).startsWith(prefix))
        await inRequest(session.token, () => deleteGalleryAlbum(album["id"]));
    for (const photo of await rows("gallery_items"))
      if (
        String(photo["title"]).startsWith(prefix) &&
        !baseline["gallery_items"]!.some((row) => row["id"] === photo["id"])
      )
        await inRequest(session.token, () => deleteGalleryItem(photo["id"]));
    for (const resource of await rows("resource_items"))
      if (String(resource["title"]).startsWith(prefix))
        await inRequest(session.token, () => deleteResource(resource["id"]));
    for (const key of ownedKeys) {
      if (await mediaExists(key)) await deleteMedia(key);
    }
    await deleteAdminSession(session.token);
    await browser.close();
    for (const [table, original] of Object.entries(baseline)) {
      const current = await rows(table);
      const comparable =
        table === "gallery_items"
          ? current.map((row) =>
              Object.fromEntries(
                Object.keys(original[0]!).map((key) => [key, row[key]]),
              ),
            )
          : current;
      assert.equal(
        JSON.stringify(comparable),
        JSON.stringify(original),
        `${table} baseline preservation`,
      );
      console.log(`${table}: ${current.length}; original values preserved`);
    }
    assert.equal((await rows("gallery_albums")).length, 0);
    assert.deepEqual(await galleryMedia(), originalMedia);
    for (const key of ownedKeys) assert.equal(await mediaExists(key), false);
    for (const row of baseline["gallery_items"]!) {
      const response = await fetch(String(row["image_url"]));
      assert.equal(response.status, 200);
      assert.equal(
        hash(Buffer.from(await response.arrayBuffer())),
        originalHashes[String(row["id"])],
      );
    }
    await writeFile(
      join(artifacts, "results.json"),
      JSON.stringify(results, null, 2),
    );
    await connection.end();
    await closeDb();
    console.log("Cleanup and original database/media snapshots verified.");
  }
}
async function verifyInterruptedTransfer() {
  const before = await db.select().from(galleryItems);
  const albumsBefore = await db.select().from(galleryAlbums);
  const [admin] = await db.select().from(adminUsers).limit(1);
  assert(admin);
  const session = await createAdminSession(admin.id);
  const response = await fetch(before[0]!.imageUrl);
  const image = {
    buffer: Buffer.from(await response.arrayBuffer()),
    mimeType: response.headers.get("content-type")!.split(";")[0]!,
  };
  const original = Client.prototype.uploadFrom;
  const allocated: string[] = [];
  let calls = 0;
  Client.prototype.uploadFrom = async function (
    ...args: Parameters<typeof original>
  ) {
    const key = posix.relative(
      process.env["MEDIA_FTP_ROOT"]!,
      posix.join(await this.pwd(), args[1]),
    );
    assert(/^gallery\/\d{4}\/\d{2}\/[a-f0-9-]+\.(jpg|png|webp)$/.test(key));
    allocated.push(key);
    const result = await original.apply(this, args);
    if (++calls === 2) throw new Error("Controlled post-transfer failure");
    return result;
  };
  try {
    await assert.rejects(() =>
      inRequest(session.token, () =>
        createGalleryAlbum({
          metadata: {
            name: "Phase 14D Interrupted Transfer Verification",
            title: "Phase 14D Interrupted Transfer Verification",
            category: "Event",
            published: true,
          },
          images: [image, image],
        }),
      ),
    );
    const remaining: string[] = [];
    for (const key of allocated)
      if (await mediaExists(key)) remaining.push(key);
    console.log(
      `Post-transfer compensation: ${remaining.length} unclaimed controlled object(s).`,
    );
    await mkdir(artifacts, { recursive: true });
    await writeFile(
      join(artifacts, "transfer-failure-result.json"),
      JSON.stringify({
        unclaimedObjects: remaining.length,
        albumRowsCreated:
          (await db.select().from(galleryAlbums)).length - albumsBefore.length,
      }),
    );
  } finally {
    Client.prototype.uploadFrom = original;
    for (const key of allocated) {
      await deleteMedia(key);
      assert.equal(await mediaExists(key), false);
    }
    await deleteAdminSession(session.token);
    assert.deepEqual(await db.select().from(galleryItems), before);
    assert.deepEqual(await db.select().from(galleryAlbums), albumsBefore);
    await closeDb();
    console.log(
      "Exact controlled transfer objects and session removed; Gallery unchanged.",
    );
  }
}
async function scanPublicAssets() {
  const values = Object.entries(process.env).filter(
    ([key, value]) =>
      /PASSWORD|SECRET|TOKEN|DATABASE_URL/.test(key) &&
      value &&
      value.length >= 8,
  );
  let scanned = 0;
  for (const file of await readdir(".output/public/assets")) {
    if (!/\.(js|css|json)$/.test(file)) continue;
    const text = await readFile(join(".output/public/assets", file), "utf8");
    assert(
      !text.includes("admin@umanganepal.org"),
      "Internal mailbox in public asset.",
    );
    for (const [, value] of values)
      assert(!text.includes(value!), "Credential found in public asset.");
    scanned++;
  }
  console.log(
    `Public credential/internal-mailbox scan passed: ${scanned} assets.`,
  );
}
async function verifyReadOnlySurfaces() {
  await mkdir(artifacts, { recursive: true });
  const browser = await chromium.launch({
    executablePath:
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true,
  });
  const [admin] = await db.select().from(adminUsers).limit(1);
  assert(admin);
  const session = await createAdminSession(admin.id);
  try {
    const anonymous = await browser.newContext();
    const page = await anonymous.newPage();
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const path of ["/admin/resources", "/admin/gallery"]) {
      await page.goto(base + path);
      await page.waitForURL(base + "/admin");
      assert.equal(
        await page
          .getByRole("button", { name: "Create Resource", exact: true })
          .count(),
        0,
      );
    }
    for (const path of [
      "/",
      "/news",
      "/events",
      "/our-work",
      "/stories",
      "/resources",
      "/gallery",
    ]) {
      const response = await page.goto(base + path);
      assert.equal(response?.status(), 200);
      await page.waitForLoadState("networkidle");
      assert(
        !(await page.locator("body").innerText()).includes(
          "admin@umanganepal.org",
        ),
      );
    }
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(base + "/gallery");
      await page.waitForLoadState("networkidle");
      assert.equal(
        await page
          .getByRole("list", { name: "Gallery photos" })
          .getByRole("listitem")
          .count(),
        2,
      );
      assert.equal(
        await page
          .getByRole("navigation", { name: "Gallery pagination" })
          .count(),
        0,
      );
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await page.screenshot({
        path: join(artifacts, `gallery-final-${width}.png`),
        fullPage: true,
      });
    }
    const authenticated = await browser.newContext({
      viewport: { width: 390, height: 900 },
    });
    await authenticated.addCookies([
      {
        name: ADMIN_SESSION_COOKIE_NAME,
        value: session.token,
        url: base,
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
    const adminPage = await authenticated.newPage();
    adminPage.on("pageerror", (error) => errors.push(error.message));
    for (const path of ["/admin/resources", "/admin/gallery"]) {
      await adminPage.goto(base + path);
      await adminPage.waitForLoadState("networkidle");
      const button = adminPage.getByRole("button", {
        name: path.endsWith("resources")
          ? "Create Resource"
          : "Add Gallery Image",
        exact: true,
      });
      await button.click();
      await adminPage.getByRole("dialog").waitFor();
      assert(
        await adminPage.evaluate(
          () =>
            document.activeElement?.tagName === "INPUT" ||
            document.activeElement?.tagName === "SELECT",
        ),
      );
      await adminPage.keyboard.press("Escape");
      await adminPage.getByRole("dialog").waitFor({ state: "hidden" });
      if (path.endsWith("resources"))
        await adminPage.waitForFunction(
          () =>
            document.activeElement?.textContent?.trim() === "Create Resource",
        );
    }
    assert.deepEqual(errors, []);
    console.log(
      "Read-only public regression, final Gallery viewports, logged-out guards and admin keyboard dialogs passed.",
    );
  } finally {
    await deleteAdminSession(session.token);
    await browser.close();
    await closeDb();
  }
}
(process.argv.includes("--scan")
  ? scanPublicAssets()
  : process.argv.includes("--readonly")
    ? verifyReadOnlySurfaces()
    : process.argv.includes("--transfer-failure")
      ? verifyInterruptedTransfer()
      : main()
).catch((error) => {
  console.error(
    error instanceof Error ? error.message : "Verification failed.",
  );
  process.exitCode = 1;
});
