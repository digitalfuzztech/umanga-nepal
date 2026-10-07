// Manual Phase 10D1.6 image sync. Never invoke from application/deployment hooks.
import "dotenv/config";

import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { extname } from "node:path";
import { eq, sql } from "drizzle-orm";

import { closeDb, db } from "../src/server/db/index";
import {
  galleryItems,
  ourWorkItems,
  type OurWorkItem,
} from "../src/server/db/schema";
import {
  deleteMedia,
  MAX_IMAGE_SIZE_BYTES,
  mediaExists,
  uploadImage,
} from "../src/server/storage/index";
import { readPrograms, requireTunnel } from "./migrate-our-work-static";

const args = process.argv.slice(2);
assert(
  args.every((arg) => arg === "--dry-run"),
  "Unknown argument.",
);
const dryRun = args.includes("--dry-run");
const expectedSlugs = [
  "mental-health-awareness-sessions",
  "stress-management-program",
  "its-okay-not-to-be-okay",
  "abyakta-katha",
  "lets-speak-about-mental-health",
  "art-therapy",
  "storytelling-and-mental-health",
  "world-mental-health-day",
];
const hash = (buffer: Buffer) =>
  createHash("sha256").update(buffer).digest("hex");

async function readSource(path: string, slug: string) {
  const buffer = await readFile(path);
  assert(
    buffer.length > 0 && buffer.length <= MAX_IMAGE_SIZE_BYTES,
    `Invalid source image size: ${slug}`,
  );
  const extension = extname(path).toLowerCase();
  const mimeType =
    extension === ".jpg" || extension === ".jpeg"
      ? "image/jpeg"
      : extension === ".png"
        ? "image/png"
        : extension === ".webp"
          ? "image/webp"
          : null;
  assert(mimeType, `Unsupported source image: ${slug}`);
  const signatureValid =
    mimeType === "image/jpeg"
      ? buffer.subarray(0, 3).equals(Buffer.from([0xff, 0xd8, 0xff]))
      : mimeType === "image/png"
        ? buffer
            .subarray(0, 8)
            .equals(
              Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
            )
        : buffer.length >= 12 &&
          buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
          buffer.subarray(8, 12).toString("ascii") === "WEBP";
  assert(signatureValid, `Invalid source signature: ${slug}`);
  return { buffer, mimeType, hash: hash(buffer) };
}

async function fetchImage(url: string, slug: string) {
  assert.equal(new URL(url).protocol, "https:", `Non-HTTPS media: ${slug}`);
  const response = await fetch(url, {
    signal: AbortSignal.timeout(30_000),
    headers: { "cache-control": "no-cache" },
  });
  assert(
    response.ok && new URL(response.url).protocol === "https:",
    `HTTPS failed: ${slug}`,
  );
  assert(
    response.headers.get("content-type")?.startsWith("image/"),
    `Invalid media content type: ${slug}`,
  );
  const buffer = Buffer.from(await response.arrayBuffer());
  assert(
    buffer.length > 0 && buffer.length <= MAX_IMAGE_SIZE_BYTES,
    `Invalid remote image size: ${slug}`,
  );
  return { buffer, hash: hash(buffer), status: response.status };
}

function nonImageFields(row: OurWorkItem) {
  const { imageUrl: _url, imageStorageKey: _key, ...metadata } = row;
  return metadata;
}

async function main() {
  await requireTunnel();
  const before = await db.select().from(ourWorkItems).orderBy(ourWorkItems.id);
  assert.equal(before.length, 8, "Expected exactly eight CMS programs.");
  assert.deepEqual(
    before.map((row) => row.slug).sort(),
    [...expectedSlugs].sort(),
    "CMS slug inventory mismatch.",
  );
  const programs = await readPrograms();
  assert.deepEqual(
    programs.map((program) => program.slug),
    expectedSlugs,
    "Static slug inventory mismatch.",
  );
  const galleryBefore = await db
    .select()
    .from(galleryItems)
    .orderBy(galleryItems.id);
  const galleryMediaBefore = await Promise.all(
    galleryBefore.map(async (row) => ({
      key: row.imageStorageKey,
      exists: await mediaExists(row.imageStorageKey),
      hash: (await fetchImage(row.imageUrl, "gallery-regression")).hash,
    })),
  );
  console.log(
    JSON.stringify({
      startingCount: before.length,
      records: before.map(({ slug, imageUrl, imageStorageKey }) => ({
        slug,
        imageUrl,
        imageStorageKey,
      })),
      galleryCount: galleryBefore.length,
    }),
  );
  // Validate and compare the entire inventory before uploading or changing rows.
  const inventory = [];
  for (const program of programs) {
    const row = before.find((candidate) => candidate.slug === program.slug)!;
    assert(
      row.imageStorageKey.startsWith("our-work/"),
      `Unexpected existing media category: ${row.slug}`,
    );
    assert(
      await mediaExists(row.imageStorageKey),
      `Existing media missing: ${row.slug}`,
    );
    const source = await readSource(program.heroImage, row.slug);
    const remote = await fetchImage(row.imageUrl, row.slug);
    const matches = source.hash === remote.hash;
    inventory.push({ program, row, source, matches });
    console.log(
      JSON.stringify({
        slug: row.slug,
        sourcePath: program.heroImage,
        sourceBytes: source.buffer.length,
        mimeType: source.mimeType,
        signatureValid: true,
        staticHash: source.hash,
        cmsHash: remote.hash,
        result: matches ? "MATCH" : "MISMATCH",
        wouldReplace: !matches,
      }),
    );
  }
  const mismatches = inventory.filter((item) => !item.matches);
  console.log(
    JSON.stringify({
      checked: inventory.length,
      mismatches: mismatches.length,
      alreadyCurrent: inventory.length - mismatches.length,
      mismatchSlugs: mismatches.map((item) => item.row.slug),
    }),
  );
  if (dryRun) {
    console.log("DRY RUN PASSED: no database or media writes.");
    return;
  }
  const replacements: {
    slug: string;
    oldKey: string;
    newKey: string;
    cleanupComplete: boolean;
  }[] = [];
  for (const item of mismatches) {
    await requireTunnel();
    const source = await readSource(item.program.heroImage, item.row.slug);
    assert.equal(
      source.hash,
      item.source.hash,
      `Source changed since preflight: ${item.row.slug}`,
    );
    assert(
      !before.some(
        (row) =>
          row.id !== item.row.id &&
          row.imageStorageKey === item.row.imageStorageKey,
      ),
      `Shared old media requires manual review: ${item.row.slug}`,
    );
    const uploaded = await uploadImage({
      buffer: source.buffer,
      mimeType: source.mimeType,
      category: "our-work",
    });
    let switched = false;
    try {
      assert(uploaded.publicUrl, `Missing new media URL: ${item.row.slug}`);
      assert(uploaded.key.startsWith("our-work/"));
      assert(
        await mediaExists(uploaded.key),
        `New media missing: ${item.row.slug}`,
      );
      const remote = await fetchImage(uploaded.publicUrl, item.row.slug);
      assert.equal(
        remote.hash,
        source.hash,
        `Uploaded hash mismatch: ${item.row.slug}`,
      );
      assert(
        remote.buffer.equals(source.buffer),
        `Uploaded bytes mismatch: ${item.row.slug}`,
      );
      await db.transaction(async (transaction) => {
        const [current] = await transaction
          .select()
          .from(ourWorkItems)
          .where(eq(ourWorkItems.id, item.row.id))
          .for("update");
        assert.deepEqual(
          current,
          item.row,
          `CMS record changed since preflight: ${item.row.slug}`,
        );
        await transaction
          .update(ourWorkItems)
          .set({
            imageUrl: uploaded.publicUrl!,
            imageStorageKey: uploaded.key,
            // Suppress MariaDB's automatic timestamp update: metadata stays exact.
            updatedAt: sql`${ourWorkItems.updatedAt}`,
          })
          .where(eq(ourWorkItems.id, item.row.id));
        const [updated] = await transaction
          .select()
          .from(ourWorkItems)
          .where(eq(ourWorkItems.id, item.row.id));
        assert(updated);
        assert.deepEqual(
          nonImageFields(updated),
          nonImageFields(item.row),
          `Metadata changed: ${item.row.slug}`,
        );
        assert.equal(updated.imageUrl, uploaded.publicUrl);
        assert.equal(updated.imageStorageKey, uploaded.key);
      });
      switched = true;
    } catch (error) {
      // A lost commit acknowledgement is ambiguous. Never remove a new image
      // unless a fresh database read confirms the old references still apply.
      let safeToRemove = false;
      try {
        const [current] = await db
          .select()
          .from(ourWorkItems)
          .where(eq(ourWorkItems.id, item.row.id));
        safeToRemove =
          current?.imageUrl === item.row.imageUrl &&
          current.imageStorageKey === item.row.imageStorageKey;
      } catch {
        /* Leave potentially referenced media intact and report it. */
      }
      let removed = false;
      if (!switched && safeToRemove) {
        try {
          await deleteMedia(uploaded.key);
          removed = !(await mediaExists(uploaded.key));
        } catch {
          /* Report cleanup honestly. */
        }
      }
      console.error(
        JSON.stringify({
          failedSlug: item.row.slug,
          newKey: uploaded.key,
          newMediaRemoved: removed,
          oldReferencesConfirmed: safeToRemove,
          completedReplacements: replacements,
        }),
      );
      throw error;
    }
    const replacement = {
      slug: item.row.slug,
      oldKey: item.row.imageStorageKey,
      newKey: uploaded.key,
      cleanupComplete: false,
    };
    replacements.push(replacement);
    try {
      await deleteMedia(replacement.oldKey);
      replacement.cleanupComplete = !(await mediaExists(replacement.oldKey));
    } catch {
      /* Keep the valid new image; report obsolete-media cleanup failure. */
    }
    console.log(
      JSON.stringify({
        replacement,
        cleanupWarning: !replacement.cleanupComplete,
      }),
    );
  }
  const after = await db.select().from(ourWorkItems).orderBy(ourWorkItems.id);
  assert.equal(after.length, before.length);
  for (const item of inventory) {
    const row = after.find((candidate) => candidate.id === item.row.id);
    assert(row);
    assert.deepEqual(
      nonImageFields(row),
      nonImageFields(item.row),
      `Non-image fields changed: ${row.slug}`,
    );
    if (item.matches)
      assert.deepEqual(
        row,
        item.row,
        `Already-matching image changed: ${row.slug}`,
      );
    const source = await readSource(item.program.heroImage, row.slug);
    const remote = await fetchImage(row.imageUrl, row.slug);
    assert(await mediaExists(row.imageStorageKey));
    assert.equal(remote.hash, source.hash, `Final hash mismatch: ${row.slug}`);
    assert(
      remote.buffer.equals(source.buffer),
      `Final byte mismatch: ${row.slug}`,
    );
    console.log(
      JSON.stringify({
        slug: row.slug,
        staticHash: source.hash,
        cmsHash: remote.hash,
        result: "MATCH",
        httpsStatus: remote.status,
        remoteExists: true,
        nonImageFieldsUnchanged: true,
      }),
    );
  }
  assert.deepEqual(
    await db.select().from(galleryItems).orderBy(galleryItems.id),
    galleryBefore,
    "Gallery rows changed.",
  );
  for (const media of galleryMediaBefore) {
    assert.equal(await mediaExists(media.key), media.exists);
    const row = galleryBefore.find((row) => row.imageStorageKey === media.key)!;
    assert.equal(
      (await fetchImage(row.imageUrl, "gallery-regression")).hash,
      media.hash,
    );
  }
  for (const replacement of replacements)
    replacement.cleanupComplete = !(await mediaExists(replacement.oldKey));
  const warnings = replacements.filter(
    (replacement) => !replacement.cleanupComplete,
  );
  console.log(
    JSON.stringify({
      result: warnings.length ? "SYNC PASSED WITH CLEANUP WARNINGS" : "PASS",
      checked: after.length,
      finalMatches: after.length,
      imageFieldsUpdated: replacements.length,
      alreadyMatchingUntouched: inventory.length - replacements.length,
      nonImageFieldsUnchanged: true,
      galleryUnchanged: true,
      cleanupWarnings: warnings,
    }),
  );
  if (warnings.length) process.exitCode = 1;
}

try {
  await main();
} catch (error) {
  console.error(
    error instanceof assert.AssertionError
      ? error.message
      : error instanceof Error &&
          error.message === "DATABASE TUNNEL NOT AVAILABLE"
        ? error.message
        : "Image sync failed; no secrets logged. Completed replacements remain valid.",
  );
  process.exitCode = 1;
} finally {
  await closeDb();
}
