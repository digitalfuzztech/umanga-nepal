// Manual migration only; never called by application/deployment hooks.
import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID, createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resources } from "../src/data/resources";
import { db, closeDb } from "../src/server/db";
import {
  resourceItems,
  newsItems,
  eventItems,
  galleryItems,
  galleryAlbums,
  ourWorkItems,
  storyItems,
  inboxThreads,
  inboxMessages,
  adminSessions,
} from "../src/server/db/schema";
import { resourceMetadataSchema } from "../src/server/resources";

export function sourceRecords() {
  assert.equal(resources.length, 10);
  assert.equal(new Set(resources.map((item) => item.slug)).size, 10);
  return resources.map((item, index) => {
    assert(!item.references?.length, "Unmapped references in source.");
    const metadata = {
      slug: item.slug,
      title: item.title,
      excerpt: item.excerpt,
      content: item.body.join("\n\n"),
      category: item.category,
      type: item.type,
      readingTime: item.readingTime ?? null,
      sortOrder: (index + 1) * 10,
      publishedAt: item.publishedAt ?? null,
      reviewedAt: item.reviewedAt ?? null,
      published: true,
    };
    const validated = resourceMetadataSchema.parse(metadata);
    assert.deepEqual(validated, metadata, `Validation changes ${item.slug}`);
    assert.deepEqual(validated.content.split("\n\n"), item.body);
    return validated;
  });
}

export async function verifyResources() {
  const expected = sourceRecords();
  const rows = await db.select().from(resourceItems);
  assert.equal(rows.length, 10, "Expected exactly 10 CMS Resources.");
  for (const item of expected) {
    const row = rows.find((record) => record.slug === item.slug);
    assert(row, `Missing ${item.slug}`);
    assert.match(row.id, /^[a-f0-9-]{36}$/);
    for (const field of Object.keys(item) as (keyof typeof item)[])
      assert.deepEqual(row[field], item[field], `${item.slug}: ${field}`);
  }
  return rows;
}

async function main() {
  const preserved = [
    newsItems,
    eventItems,
    galleryItems,
    galleryAlbums,
    ourWorkItems,
    storyItems,
    inboxThreads,
    inboxMessages,
    adminSessions,
  ];
  const before = [];
  for (const table of preserved) before.push(await db.select().from(table));
  assert.deepEqual(
    before.slice(0, 8).map((rows) => rows.length),
    [3, 4, 26, 1, 8, 5, 3, 4],
  );
  const planned = sourceRecords();
  const sourceHash = createHash("sha256")
    .update(
      await readFile(new URL("../src/data/resources.ts", import.meta.url)),
    )
    .digest("hex");
  if (process.argv.includes("--verify")) {
    await verifyResources();
    console.log(
      `10/10 exact field matches. Static source SHA-256: ${sourceHash}`,
    );
    return;
  }
  const existing = await db.select().from(resourceItems);
  if (existing.length) {
    await verifyResources();
    console.log("Already migrated: 10/10 exact matches; no writes performed.");
    return;
  }
  console.log(
    JSON.stringify(
      { source: "src/data/resources.ts", sourceHash, planned },
      null,
      2,
    ),
  );
  if (process.argv.includes("--dry-run")) {
    console.log("Dry run passed: no database writes, uploads or emails.");
    return;
  }
  await db.transaction(async (transaction) => {
    const current = await transaction
      .select({ id: resourceItems.id })
      .from(resourceItems);
    assert.equal(
      current.length,
      0,
      "Resources changed since preflight; refusing migration.",
    );
    await transaction
      .insert(resourceItems)
      .values(planned.map((item) => ({ id: randomUUID(), ...item })));
  });
  await verifyResources();
  for (let index = 0; index < preserved.length; index++)
    assert.deepEqual(
      await db.select().from(preserved[index]!),
      before[index],
      "Unrelated table changed during migration.",
    );
  console.log("Migrated 10 Resources atomically; 10/10 exact field matches.");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main()
    .catch((error) => {
      console.error(
        error instanceof assert.AssertionError
          ? error.message
          : "Resource migration failed safely.",
      );
      process.exitCode = 1;
    })
    .finally(closeDb);
}
