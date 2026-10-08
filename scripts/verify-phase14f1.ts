import "dotenv/config";
import assert from "node:assert/strict";
import { mkdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "playwright";
import { eq } from "drizzle-orm";
import { requestHandler } from "@tanstack/react-start/server";
import { db, closeDb } from "../src/server/db";
import { adminUsers, generalSettings } from "../src/server/db/schema";
import {
  ADMIN_SESSION_COOKIE_NAME,
  createAdminSession,
  deleteAdminSession,
} from "../src/server/auth";
import {
  getAdminSettings,
  getPublicSettings,
  updateSettings,
  replaceBrandAsset,
  cleanupBrandAsset,
  SettingsApplicationError,
} from "../src/server/general-settings";
import { settingsMetadataSchema } from "../src/lib/general-settings";
import { assets, verifySettings } from "./migrate-general-settings-static";
import { pool, inventory } from "./phase14f-baseline";

const base = "http://127.0.0.1:5177";
async function inRequest<T>(
  operation: () => Promise<T>,
  token?: string,
): Promise<T> {
  let value: T | undefined, error: unknown;
  const handler = requestHandler(async () => {
    try {
      value = await operation();
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
  return value!;
}
async function main() {
  pool();
  const original = await verifySettings();
  const metadata = settingsMetadataSchema.parse(
    Object.fromEntries(
      Object.keys(settingsMetadataSchema.shape).map((key) => [
        key,
        original[key as keyof typeof original],
      ]),
    ),
  );
  const mediaBefore = await inventory("branding");
  assert.equal(mediaBefore.length, 3);
  const [definition] = await pool().query("SHOW CREATE TABLE general_settings");
  const ddl = JSON.stringify(definition);
  assert(
    ddl.includes("utf8mb4_unicode_ci") &&
      ddl.includes("general_settings_singleton"),
  );
  console.log("Schema verified: UTF8MB4 and singleton CHECK.");
  await pool().query("START TRANSACTION");
  try {
    await assert.rejects(() =>
      pool().query("INSERT INTO general_settings (id) VALUES (2)"),
    );
    await assert.rejects(() =>
      pool().query("INSERT INTO general_settings (id) VALUES (1)"),
    );
    await assert.rejects(() =>
      pool().query("INSERT INTO general_settings (id) VALUES (NULL)"),
    );
  } finally {
    await pool().query("ROLLBACK");
  }
  for (const operation of [
    () => getAdminSettings(),
    () => updateSettings(metadata),
    () =>
      replaceBrandAsset({
        slot: "favicon",
        buffer: Buffer.from("invalid"),
        mimeType: "image/x-icon",
      }),
  ]) {
    await assert.rejects(
      () => inRequest<unknown>(operation),
      (error) =>
        error instanceof SettingsApplicationError &&
        error.code === "UNAUTHORIZED",
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
  const anonymous = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const authenticated = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
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
  const page = await anonymous.newPage(),
    editor = await authenticated.newPage();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  editor.on("pageerror", (error) => errors.push(error.message));
  const artifacts = join(tmpdir(), "umanga-phase14f1");
  await mkdir(artifacts, { recursive: true });
  const temporaryKeys = new Set<string>();
  async function visit(path: string) {
    const response = await page.goto(base + path);
    await page.waitForLoadState("networkidle");
    assert.equal(response!.status(), 200, path);
    const html = await response!.text();
    assert(!html.includes("admin@umanganepal.org"));
    assert(!/<meta[^>]+name="keywords"/.test(html));
    assert(
      !html.includes("headerLogoStorageKey") && !html.includes("seoKeywords"),
    );
    for (const [key, secret] of Object.entries(process.env))
      if (
        /PASSWORD|SECRET|DATABASE_URL/.test(key) &&
        secret &&
        secret.length > 8
      )
        assert(!html.includes(secret));
    return html;
  }
  try {
    assert.deepEqual(await inRequest(() => getAdminSettings(), session.token), {
      ...metadata,
      headerLogoUrl: original.headerLogoUrl,
      footerLogoUrl: original.footerLogoUrl,
      faviconUrl: original.faviconUrl,
    });
    await page.goto(base + "/admin/cms/general-settings");
    await page.waitForLoadState("networkidle");
    assert.equal(new URL(page.url()).pathname, "/admin");
    await editor.goto(base + "/admin/cms");
    await editor.waitForLoadState("networkidle");
    assert.equal(await editor.locator("main h4").count(), 20);
    await editor
      .getByRole("link", { name: "Manage General Settings", exact: true })
      .click();
    await editor.waitForLoadState("networkidle");
    await editor.screenshot({
      path: join(artifacts, "editor-desktop.png"),
      fullPage: true,
    });
    const fixture = {
      ...metadata,
      companyDescription:
        'नमस्ते 🌿\n\nCompany verification — "quoted" & <script>safe</script>',
      address: "काठमाडौं",
      phone: "+977 1 555 0100",
      email: "phase14f1@example.com",
      latitude: 27.7172,
      longitude: 85.324,
      seoContent: "Private editorial content\n\nNot public",
      seoKeywords: "private keyword reference",
      seoTitle: "Global verification title",
      seoDescription: "Global verification description",
      facebookUrl: "https://www.facebook.com/example",
      instagramUrl: "https://www.instagram.com/example",
      twitterUrl: "https://x.com/example",
      youtubeUrl: "https://www.youtube.com/@example",
      tiktokUrl: "https://www.tiktok.com/@example",
      linkedinUrl: "https://www.linkedin.com/company/example",
    };
    for (const [key, value] of Object.entries(fixture))
      await editor.locator(`#${key}`).fill(value === null ? "" : String(value));
    await editor
      .getByRole("button", { name: "Save Settings", exact: true })
      .click();
    await editor
      .getByText("General Settings saved.", { exact: true })
      .waitFor();
    await editor.reload();
    await editor.waitForLoadState("networkidle");
    assert.equal(
      await editor.locator("#companyDescription").inputValue(),
      fixture.companyDescription,
    );
    const saved = await inRequest(() => getAdminSettings(), session.token);
    for (const [key, value] of Object.entries(fixture))
      assert.deepEqual(saved![key as keyof typeof saved], value, key);
    const [updated] = await db.select().from(generalSettings);
    assert.equal(updated!.createdAt.getTime(), original.createdAt.getTime());
    assert(updated!.updatedAt.getTime() >= original.updatedAt.getTime());
    await visit("/");
    assert.equal(
      await page.title(),
      "Umanga Nepal | Every Mind Deserves to Be Heard",
    );
    assert.equal(
      await page.locator('meta[property="og:title"]').getAttribute("content"),
      "Umanga Nepal | Every Mind Deserves to Be Heard",
    );
    const json = await page
      .locator('script[type="application/ld+json"]')
      .allTextContents();
    assert.equal(json.length, 2);
    const organization = json
      .map((value) => JSON.parse(value))
      .find((value) => value["@type"] === "Organization");
    assert.equal(organization.description, fixture.companyDescription);
    assert.equal(organization.sameAs.length, 6);
    const website = json
      .map((value) => JSON.parse(value))
      .find((value) => value["@type"] === "WebSite");
    assert.equal(website.name, metadata.websiteTitle);
    assert.equal(website.url, base + "/");
    assert.equal(await page.locator("footer a[aria-label]").count(), 6);
    assert.equal(
      await page.locator("footer a[href^='mailto:']").innerText(),
      fixture.email,
    );
    assert(
      (await page.getByRole("contentinfo").innerText()).includes(
        fixture.address,
      ),
    );
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await visit("/");
      await page.getByRole("contentinfo").scrollIntoViewIfNeeded();
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await page.screenshot({ path: join(artifacts, `footer-${width}.png`) });
      await editor.setViewportSize({ width, height: 900 });
      assert(
        await editor.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      await editor.screenshot({
        path: join(artifacts, `editor-${width}.png`),
        fullPage: true,
      });
    }
    for (const patch of [
      { email: "invalid" },
      { latitude: 91 },
      { longitude: -181 },
      { facebookUrl: "javascript:alert(1)" },
      { email: "admin@umanganepal.org" },
    ]) {
      await assert.rejects(
        () =>
          inRequest(
            () => updateSettings({ ...fixture, ...patch }),
            session.token,
          ),
        (error) =>
          error instanceof SettingsApplicationError &&
          error.code === "INVALID_SETTINGS",
      );
    }
    const projection = await getPublicSettings();
    assert(
      projection &&
        !("seoContent" in projection) &&
        !("seoKeywords" in projection) &&
        !("id" in projection),
    );
    console.log(
      "Authenticated UI save/refresh, Unicode/paragraphs, contacts, six socials, null/private projection, route-specific SEO, SSR JSON-LD and responsive checks passed.",
    );
    // Retain original migration assets during replacement testing. Only this
    // settings row is temporarily changed; no other content is touched.
    await db
      .update(generalSettings)
      .set({
        headerLogoStorageKey: null,
        footerLogoStorageKey: null,
        faviconStorageKey: null,
      })
      .where(eq(generalSettings.id, 1));
    for (const asset of assets) {
      await editor.locator(`#${asset.slot}`).setInputFiles(asset.path);
      await editor
        .getByText("Branding image saved.", { exact: true })
        .waitFor();
      const [row] = await db.select().from(generalSettings);
      const key = row![`${asset.slot}StorageKey`]!;
      temporaryKeys.add(key);
      const html = await visit("/");
      assert(html.includes(row![`${asset.slot}Url`]!));
      assert.deepEqual(
        Buffer.from(
          await (await fetch(row![`${asset.slot}Url`]!)).arrayBuffer(),
        ),
        await readFile(asset.path),
      );
      await editor.reload();
      await editor.waitForLoadState("networkidle");
    }
    const previousHeader = (await db.select().from(generalSettings))[0]!
      .headerLogoStorageKey!;
    await editor.locator("#headerLogo").setInputFiles(assets[0]!.path);
    await editor.getByText("Branding image saved.", { exact: true }).waitFor();
    temporaryKeys.add(
      (await db.select().from(generalSettings))[0]!.headerLogoStorageKey!,
    );
    assert(!(await inventory("branding")).includes(previousHeader));
    console.log(
      "Real UI header/footer/ICO replacements and old temporary asset cleanup passed.",
    );
  } finally {
    await db
      .update(generalSettings)
      .set(original)
      .where(eq(generalSettings.id, 1));
    for (const key of temporaryKeys) assert(await cleanupBrandAsset(key));
    await deleteAdminSession(session.token);
    await browser.close();
  }
  await verifySettings();
  assert.deepEqual(await inventory("branding"), mediaBefore);
  const regression = await chromium.launch({
    executablePath:
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true,
  });
  try {
    const publicPage = await regression.newPage();
    publicPage.on("pageerror", (error) => errors.push(error.message));
    for (const path of [
      "/",
      "/about",
      "/our-work",
      "/stories",
      "/resources",
      "/news",
      "/events",
      "/gallery",
      "/get-involved",
      "/volunteer",
      "/partner-with-us",
      "/support-us",
      "/invite-umanga",
      "/share-your-story",
      "/contact",
      "/get-support",
      "/impact",
      "/privacy",
      "/terms",
    ]) {
      const response = await publicPage.goto(base + path);
      await publicPage.waitForLoadState("networkidle");
      assert.equal(response!.status(), 200, path);
      assert.equal(
        await publicPage.locator('link[rel="icon"]').getAttribute("href"),
        original.faviconUrl,
      );
    }
    await publicPage.goto(base + "/");
    await publicPage.waitForLoadState("networkidle");
    assert.equal(await publicPage.locator("footer a[aria-label]").count(), 0);
    await publicPage.screenshot({
      path: join(artifacts, "home-restored.png"),
      fullPage: true,
    });
  } finally {
    await regression.close();
  }
  assert.deepEqual(errors, []);
  console.log(
    `PASS: All 19 public routes, restored empty socials, original settings exact, branding inventory exactly 3; test media/session removed. Screenshots: ${artifacts}`,
  );
}
main()
  .catch((error) => {
    console.error(
      error instanceof Error ? error.message : "Verification failed.",
    );
    process.exitCode = 1;
  })
  .finally(closeDb);
