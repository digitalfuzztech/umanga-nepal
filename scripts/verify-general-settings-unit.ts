import "dotenv/config";
import assert from "node:assert/strict";
import { requestHandler } from "@tanstack/react-start/server";
import { readFile } from "node:fs/promises";
import { settingsMetadataSchema } from "../src/lib/general-settings";
import {
  globalSeoFallback,
  resolveSeo,
  organizationJsonLd,
  websiteJsonLd,
  serializeJsonLd,
} from "../src/lib/global-seo";
import {
  getAdminSettings,
  replaceBrandAsset,
  SettingsApplicationError,
  updateSettings,
} from "../src/server/general-settings";
import {
  uploadImage,
  MediaImageValidationError,
  MAX_IMAGE_SIZE_BYTES,
} from "../src/server/storage";
import { sourceSettings } from "./migrate-general-settings-static";

const original = sourceSettings();
const publicOriginal = {
  ...original,
  headerLogoUrl: null,
  footerLogoUrl: null,
  faviconUrl: null,
};
assert.equal(settingsMetadataSchema.safeParse(original).success, true);
const fixture = {
  ...original,
  companyDescription: "नमस्ते 🌿\n\nदोस्रो अनुच्छेद।".repeat(1000),
  latitude: 27.7172,
  longitude: 85.324,
  facebookUrl: "https://www.facebook.com/example",
  seoKeywords: "editorial planning",
  seoContent: "Editorial content",
};
assert.deepEqual(settingsMetadataSchema.parse(fixture), fixture);
for (const patch of [
  { facebookUrl: "javascript:alert(1)" },
  { instagramUrl: "https://user:secret@example.com" },
  { websiteUrl: "http://example.com" },
  { email: "invalid" },
  { latitude: 91 },
  { longitude: -181 },
  { latitude: Number.NaN },
  { id: 2 },
  { createdAt: new Date() },
  { companyDescription: "a".repeat(100001) },
])
  assert.equal(
    settingsMetadataSchema.safeParse({ ...original, ...patch }).success,
    false,
  );
assert.equal(resolveSeo(publicOriginal).title, original.seoTitle);
assert.equal(
  resolveSeo(publicOriginal, {
    title: "Page override",
    description: "Page description",
  }).title,
  "Page override",
);
assert.equal(resolveSeo(null).title, globalSeoFallback.title);
assert.equal(
  resolveSeo({
    ...publicOriginal,
    seoTitle: null,
    websiteTitle: "Website identity",
  }).title,
  "Website identity",
);
assert.equal(
  resolveSeo({
    ...original,
    headerLogoUrl: null,
    footerLogoUrl: null,
    faviconUrl: null,
    seoTitle: null,
    seoDescription: null,
  }).description,
  globalSeoFallback.description,
);
const publicFixture = {
  ...fixture,
  headerLogoUrl: "https://example.com/logo.png",
  footerLogoUrl: null,
  faviconUrl: null,
  websiteUrl: "https://example.com/",
};
const organization = organizationJsonLd(publicFixture)!;
assert.equal(organization["@type"], "Organization");
assert.equal(organization["description"], fixture.companyDescription);
assert.deepEqual(organization["sameAs"], [fixture.facebookUrl]);
assert.equal("email" in organization, false);
assert.equal(websiteJsonLd(publicFixture)?.["@type"], "WebSite");
assert.equal(websiteJsonLd(null), null);
assert.deepEqual(JSON.parse(serializeJsonLd(organization)), organization);
assert.equal(
  serializeJsonLd({ value: "</script><script>alert(1)</script>" }).includes(
    "<",
  ),
  false,
);

async function anonymous(operation: () => Promise<unknown>) {
  let error: unknown;
  const handler = requestHandler(async () => {
    try {
      await operation();
    } catch (failure) {
      error = failure;
    }
    return new Response(null, { status: 204 });
  });
  await handler(new Request("http://localhost/"), {});
  assert.ok(
    error instanceof SettingsApplicationError && error.code === "UNAUTHORIZED",
  );
}
await anonymous(() => getAdminSettings());
await anonymous(() => updateSettings(original));
await anonymous(() =>
  replaceBrandAsset({
    slot: "favicon",
    buffer: Buffer.from("invalid"),
    mimeType: "image/x-icon",
  }),
);
for (const buffer of [
  Buffer.from("not an icon"),
  Buffer.alloc(MAX_IMAGE_SIZE_BYTES + 1),
]) {
  await assert.rejects(
    () =>
      uploadImage({ buffer, category: "branding", mimeType: "image/x-icon" }),
    MediaImageValidationError,
  );
}
await assert.rejects(
  async () =>
    uploadImage({
      buffer: await readFile("public/favicon.ico"),
      category: "gallery",
      mimeType: "image/x-icon",
    }),
  MediaImageValidationError,
);
console.log(
  "PASS: Unicode/paragraph/null validation; URL/email/coordinate/unknown-field rejection; SEO precedence; JSON-LD validity/escaping; anonymous read/update/replacement rejected; invalid/oversized ICO rejected; Gallery ICO remains rejected. No DB, media or session changes.",
);
