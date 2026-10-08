import "dotenv/config";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { eq } from "drizzle-orm";
import { db, closeDb } from "../src/server/db";
import { generalSettings } from "../src/server/db/schema";
import { siteConfig } from "../src/data/site-config";
import { globalSeoFallback } from "../src/lib/global-seo";
import {
  settingsMetadataSchema,
  type BrandingSlot,
} from "../src/lib/general-settings";
import {
  cleanupBrandAsset,
  uploadBrandAsset,
} from "../src/server/general-settings";
import { pool, hash } from "./phase14f-baseline";

export const assets = [
  {
    slot: "headerLogo" as const,
    path: "src/assets/logo/umanga-2.png",
    mimeType: "image/png",
  },
  {
    slot: "footerLogo" as const,
    path: "src/assets/logo/umanga-png.png",
    mimeType: "image/png",
  },
  {
    slot: "favicon" as const,
    path: "public/favicon.ico",
    mimeType: "image/x-icon",
  },
];
export function sourceSettings(websiteUrl: string | null = null) {
  const social = (platform: string) =>
    siteConfig.social.find((item) => item.platform === platform)?.url || null;
  return settingsMetadataSchema.parse({
    companyName: siteConfig.name,
    companyDescription: siteConfig.shortDescription,
    address: siteConfig.contact.address || null,
    phone: siteConfig.contact.phone || null,
    email: siteConfig.contact.email || null,
    latitude: null,
    longitude: null,
    facebookUrl: social("facebook"),
    instagramUrl: social("instagram"),
    twitterUrl: null,
    youtubeUrl: social("youtube"),
    tiktokUrl: null,
    linkedinUrl: social("linkedin"),
    websiteUrl,
    websiteTitle: siteConfig.name,
    seoTitle: globalSeoFallback.title,
    seoDescription: globalSeoFallback.description,
    seoContent: null,
    seoKeywords: null,
    openGraphTitle: globalSeoFallback.openGraphTitle,
    openGraphDescription: globalSeoFallback.openGraphDescription,
  });
}
export async function verifySettings(websiteUrl: string | null = null) {
  const [row] = await db
    .select()
    .from(generalSettings)
    .where(eq(generalSettings.id, 1));
  assert.ok(row, "Settings row is missing.");
  for (const [key, value] of Object.entries(sourceSettings(websiteUrl)))
    assert.deepEqual(row[key as keyof typeof row], value, key);
  const evidence = [];
  for (const asset of assets) {
    const bytes = await readFile(asset.path);
    const url: string | null = row[`${asset.slot}Url`];
    const key: string | null = row[`${asset.slot}StorageKey`];
    assert.ok(url?.startsWith("https://") && key?.startsWith("branding/"));
    const response: Response = await fetch(url!);
    assert.equal(response.status, 200);
    assert.ok(response.headers.get("content-type")?.startsWith("image/"));
    const remote = Buffer.from(await response.arrayBuffer());
    assert.ok(remote.equals(bytes), `${asset.slot} bytes differ.`);
    evidence.push({
      source: asset.path,
      key,
      url,
      bytes: bytes.length,
      sourceHash: hash(bytes),
      remoteHash: hash(remote),
      status: response.status,
    });
  }
  console.log(JSON.stringify(evidence, null, 2));
  return row;
}
async function main() {
  pool();
  const websiteUrl =
    process.argv
      .find((arg) => arg.startsWith("--website-url="))
      ?.slice("--website-url=".length) || null;
  const metadata = sourceSettings(websiteUrl);
  if (process.argv.includes("--verify")) {
    await verifySettings(websiteUrl);
    return;
  }
  const buffers = await Promise.all(
    assets.map((asset) => readFile(asset.path)),
  );
  if (process.argv.includes("--dry-run")) {
    console.log(
      JSON.stringify(
        {
          metadata,
          assets: assets.map((asset, index) => ({
            ...asset,
            hash: hash(buffers[index]!),
          })),
        },
        null,
        2,
      ),
    );
    return;
  }
  const existing = await db.select().from(generalSettings);
  if (existing.length) {
    assert.equal(existing.length, 1);
    assert.equal(existing[0]!.id, 1);
    console.log(
      "Settings already initialized. Administrator edits retained; no writes/uploads.",
    );
    return;
  }
  const uploaded: { slot: BrandingSlot; key: string; publicUrl: string }[] = [];
  try {
    for (let index = 0; index < assets.length; index++) {
      const asset = assets[index]!;
      uploaded.push({
        slot: asset.slot,
        ...(await uploadBrandAsset(
          asset.slot,
          buffers[index]!,
          asset.mimeType,
        )),
      });
    }
    await db.transaction(async (tx) => {
      await tx.insert(generalSettings).values({
        id: 1,
        ...metadata,
        ...Object.fromEntries(
          uploaded.flatMap((asset) => [
            [`${asset.slot}Url`, asset.publicUrl],
            [`${asset.slot}StorageKey`, asset.key],
          ]),
        ),
      });
    });
  } catch (error) {
    let cleanupFailed = false;
    for (const asset of uploaded)
      if (!(await cleanupBrandAsset(asset.key))) cleanupFailed = true;
    if (cleanupFailed)
      console.error(
        "Migration failed; media cleanup needs administrator attention.",
      );
    throw error;
  }
  await verifySettings(websiteUrl);
}
if (
  process.argv[1]
    ?.replace(/\\/g, "/")
    .endsWith("/migrate-general-settings-static.ts")
) {
  main()
    .catch(() => {
      console.error(
        "General Settings migration failed. No credentials or infrastructure details logged.",
      );
      process.exitCode = 1;
    })
    .finally(closeDb);
}
