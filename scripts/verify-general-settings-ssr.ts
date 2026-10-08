import "dotenv/config";
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { eq } from "drizzle-orm";
import { chromium } from "playwright";
import { db, closeDb } from "../src/server/db";
import { generalSettings } from "../src/server/db/schema";
import { pool } from "./phase14f-baseline";

async function main() {
  pool();
  const [original] = await db.select().from(generalSettings);
  assert(original);
  const base = "http://127.0.0.1:5177";
  const browser = await chromium.launch({
    executablePath:
      "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    headless: true,
  });
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  try {
    const description =
      'SSR नमस्ते 🌿\n\nSecond paragraph & "quotes" <script>safe</script>';
    await db
      .update(generalSettings)
      .set({
        seoTitle: "Global SSR default",
        seoDescription: "Global SSR description",
        companyDescription: description,
        seoContent: "DO_NOT_EXPOSE_EDITORIAL_CONTENT",
        seoKeywords: "DO_NOT_EXPOSE_EDITORIAL_KEYWORDS",
        facebookUrl: "https://www.facebook.com/example",
        websiteUrl: null,
      })
      .where(eq(generalSettings.id, 1));
    const missing = await page.goto(base + "/phase14f1-no-route");
    assert.equal(missing!.status(), 404);
    assert.equal(await page.title(), "Global SSR default");
    assert.equal(
      await page.locator('meta[name="description"]').getAttribute("content"),
      "Global SSR description",
    );
    await db
      .update(generalSettings)
      .set({ seoTitle: null, websiteTitle: "Website identity fallback" })
      .where(eq(generalSettings.id, 1));
    await page.reload();
    assert.equal(await page.title(), "Website identity fallback");
    const home = await page.goto(base + "/");
    assert.equal(home!.status(), 200);
    const html = await home!.text(),
      head = html.split("</head>")[0]!;
    assert.equal(
      await page.title(),
      "Umanga Nepal | Every Mind Deserves to Be Heard",
    );
    assert(head.includes('type="application/ld+json"'));
    const blocks = await page
      .locator('head script[type="application/ld+json"]')
      .allTextContents();
    assert.equal(blocks.length, 2);
    const objects = blocks.map((block) => JSON.parse(block));
    assert.equal(
      objects.find((object) => object["@type"] === "Organization").description,
      description,
    );
    assert.equal(
      objects.find((object) => object["@type"] === "WebSite").name,
      "Website identity fallback",
    );
    assert.equal(
      objects.find((object) => object["@type"] === "WebSite").url,
      base + "/",
    );
    assert(
      !html.includes("DO_NOT_EXPOSE_EDITORIAL_CONTENT") &&
        !html.includes("DO_NOT_EXPOSE_EDITORIAL_KEYWORDS"),
    );
    assert.equal(await page.locator('meta[name="keywords"]').count(), 0);
    assert.equal(
      await page.locator('link[rel="icon"]').getAttribute("href"),
      original.faviconUrl,
    );
    assert.equal(
      await page.getByRole("contentinfo").locator("a[aria-label]").count(),
      1,
    );
    const output = join(tmpdir(), "umanga-phase14f1");
    await mkdir(output, { recursive: true });
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      await page
        .getByRole("contentinfo")
        .screenshot({ path: join(output, `footer-ssr-${width}.png`) });
      assert(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
    }
    // Explicitly configured URL has precedence over the actual request origin.
    await db
      .update(generalSettings)
      .set({ websiteUrl: "https://example.com/" })
      .where(eq(generalSettings.id, 1));
    await page.reload();
    const configured = (
      await page
        .locator('head script[type="application/ld+json"]')
        .allTextContents()
    ).map((block) => JSON.parse(block));
    assert.equal(
      configured.find((object) => object["@type"] === "WebSite").url,
      "https://example.com/",
    );
    console.log(
      "PASS with JavaScript disabled: initial SSR title/description, Website Title fallback, homepage-specific SEO precedence, favicon, exactly two JSON-LD objects, safe Unicode/script text, request-origin/explicit URL behavior, private planning-field exclusion, conditional socials, responsive footer.",
    );
  } finally {
    await db
      .update(generalSettings)
      .set(original)
      .where(eq(generalSettings.id, 1));
    await browser.close();
  }
}
main()
  .catch((error) => {
    console.error(
      error instanceof Error ? error.message : "SSR verification failed.",
    );
    process.exitCode = 1;
  })
  .finally(closeDb);
