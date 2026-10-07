// Manual content-only backfill. No storage uploads, deletions, or automatic hooks.
import "dotenv/config";

import assert from "node:assert/strict";
import { eq, sql } from "drizzle-orm";

import { closeDb, db } from "../src/server/db/index";
import {
  galleryItems,
  ourWorkItems,
  type OurWorkItem,
} from "../src/server/db/schema";
import {
  getPublishedOurWorkItemBySlug,
  getPublishedOurWorkItems,
} from "../src/server/our-work/index";
import {
  mapProgram,
  readPrograms,
  requireTunnel,
} from "./migrate-our-work-static";

const fields = [
  "featured",
  "awarenessSessionLabel",
  "awarenessSessionNote",
  "participantLabel",
  "participantNote",
  "advisoryNote",
] as const;
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
const args = process.argv.slice(2);
assert(
  args.every((arg) => arg === "--dry-run"),
  "Unknown argument.",
);
const dryRun = args.includes("--dry-run");

async function main() {
  await requireTunnel();
  const programs = await readPrograms();
  assert.deepEqual(
    programs.map((program) => program.slug),
    expectedSlugs,
    "Static inventory changed.",
  );
  const galleryBefore = await db.select().from(galleryItems);
  const before = await db.select().from(ourWorkItems).orderBy(ourWorkItems.id);
  console.log(
    JSON.stringify({
      startingCount: before.length,
      records: before.map(({ slug, title }) => ({ slug, title })),
      galleryCount: galleryBefore.length,
    }),
  );
  assert.equal(before.length, 8, "Expected exactly eight existing records.");
  assert.deepEqual(
    before.map((row) => row.slug).sort(),
    [...expectedSlugs].sort(),
    "CMS slug set mismatch.",
  );
  const plans = programs.map((program, index) => {
    const row = before.find((candidate) => candidate.slug === program.slug);
    assert(row, `Missing program: ${program.slug}`);
    const mapped = mapProgram(program, index);
    const legacyAbout = program.note
      ? `${program.description}\n\n${program.note}`
      : program.description;
    assert(
      row.aboutProgram === mapped.aboutProgram ||
        row.aboutProgram === legacyAbout,
      `Unrecognized about content: ${program.slug}`,
    );
    for (const [field, value] of Object.entries(mapped)) {
      if (
        field === "aboutProgram" ||
        fields.some((candidate) => candidate === field)
      )
        continue;
      assert.deepEqual(
        row[field as keyof OurWorkItem],
        value,
        `Existing static content mismatch: ${program.slug}/${field}`,
      );
    }
    const values = {
      featured: mapped.featured,
      awarenessSessionLabel: mapped.awarenessSessionLabel,
      awarenessSessionNote: mapped.awarenessSessionNote,
      participantLabel: mapped.participantLabel,
      participantNote: mapped.participantNote,
      advisoryNote: mapped.advisoryNote,
    };
    const correctAbout = row.aboutProgram !== mapped.aboutProgram;
    const update = correctAbout
      ? { ...values, aboutProgram: mapped.aboutProgram }
      : values;
    console.log(
      JSON.stringify({
        slug: row.slug,
        current: Object.fromEntries(fields.map((field) => [field, row[field]])),
        intended: values,
        aboutProgramRequiresCorrection: correctAbout,
      }),
    );
    return { row, mapped, update, correctAbout };
  });
  if (dryRun) {
    console.log(
      "DRY RUN PASSED: exact one-to-one inventory; no writes or media operations.",
    );
    return;
  }
  await db.transaction(async (transaction) => {
    const locked = await transaction
      .select()
      .from(ourWorkItems)
      .orderBy(ourWorkItems.id)
      .for("update");
    assert.deepEqual(
      locked,
      before,
      "Content changed since preflight; backfill aborted.",
    );
    for (const plan of plans) {
      await transaction
        .update(ourWorkItems)
        .set(plan.update)
        .where(eq(ourWorkItems.id, plan.row.id));
      const [updated] = await transaction
        .select()
        .from(ourWorkItems)
        .where(eq(ourWorkItems.id, plan.row.id));
      assert(updated);
      const { updatedAt: _beforeTimestamp, ...original } = plan.row;
      const { updatedAt: _afterTimestamp, ...actual } = updated;
      assert.deepEqual(
        actual,
        { ...original, ...plan.update },
        `Unexpected update: ${plan.row.slug}`,
      );
    }
  });
  const published = await getPublishedOurWorkItems();
  assert.deepEqual(
    published.map((row) => row.slug),
    expectedSlugs,
  );
  for (const plan of plans) {
    const item = await getPublishedOurWorkItemBySlug(plan.row.slug);
    assert(item);
    assert(!("imageStorageKey" in item), "Internal storage key exposed.");
    const listed = published.find((row) => row.slug === plan.row.slug);
    assert(listed && !("imageStorageKey" in listed));
    for (const [field, value] of Object.entries(plan.mapped)) {
      if (field === "published") continue;
      assert.deepEqual(
        item[field as keyof typeof item],
        value,
        `Public lookup mismatch: ${plan.row.slug}/${field}`,
      );
      assert.deepEqual(
        listed[field as keyof typeof listed],
        value,
        `Public list mismatch: ${plan.row.slug}/${field}`,
      );
    }
    console.log(
      JSON.stringify({
        slug: plan.row.slug,
        allPublicContent: "exact",
        featured: item.featured,
        sessions: {
          count: item.awarenessSessionCount,
          label: item.awarenessSessionLabel,
          note: item.awarenessSessionNote,
        },
        participants: {
          count: item.participantCount,
          label: item.participantLabel,
          note: item.participantNote,
        },
        advisory: item.advisoryNote,
        aboutProgram: "exact original",
        publicQueries: "PASS",
      }),
    );
  }
  assert.equal(
    await getPublishedOurWorkItemBySlug("this-program-does-not-exist"),
    null,
  );
  assert.deepEqual(
    await db.select().from(galleryItems),
    galleryBefore,
    "Gallery changed.",
  );
  const after = await db.select().from(ourWorkItems);
  assert.equal(after.length, 8);
  const [ddl] = await db.execute(sql`SHOW CREATE TABLE our_work_items`);
  console.log(JSON.stringify({ tableDefinition: ddl }));
  console.log(
    JSON.stringify({
      result: "PASS",
      rowsBefore: before.length,
      rowsAfter: after.length,
      aboutCorrections: plans
        .filter((plan) => plan.correctAbout)
        .map((plan) => plan.row.slug),
      galleryUnchanged: true,
      mediaOperations: 0,
    }),
  );
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
        : "Fidelity backfill failed; no secrets logged.",
  );
  process.exitCode = 1;
} finally {
  await closeDb();
}
