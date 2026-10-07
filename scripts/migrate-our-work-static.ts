// Manual Phase 10D1 utility. Never invoke from application or deployment hooks.
import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createConnection } from "node:net";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { eq, sql } from "drizzle-orm";
import ts from "typescript";

import type { Program } from "../src/data/types";
import { closeDb, db } from "../src/server/db/index";
import {
  galleryItems,
  ourWorkItems,
  type OurWorkItem,
} from "../src/server/db/schema";
import {
  getPublishedOurWorkItemBySlug,
  getPublishedOurWorkItems,
  ourWorkMetadataSchema,
} from "../src/server/our-work/index";
import {
  deleteMedia,
  MAX_IMAGE_SIZE_BYTES,
  mediaExists,
  uploadImage,
} from "../src/server/storage/index";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = resolve(root, "src/data/programs.ts");
const args = process.argv.slice(2);
assert(
  args.every((arg) => arg === "--dry-run" || arg === "--verify"),
  "Unknown argument.",
);
assert(
  !(args.includes("--dry-run") && args.includes("--verify")),
  "Choose one mode.",
);
const dryRun = args.includes("--dry-run");
// --verify audits an already migrated dataset without any writes.
const verifyOnly = args.includes("--verify");

async function requireTunnel() {
  await new Promise<void>((accept, reject) => {
    const socket = createConnection({ host: "127.0.0.1", port: 3307 });
    const fail = () => {
      socket.destroy();
      reject(new Error("DATABASE TUNNEL NOT AVAILABLE"));
    };
    socket.setTimeout(3_000, fail);
    socket.once("error", fail);
    socket.once("connect", () => {
      socket.destroy();
      accept();
    });
  });
  const configured = new URL(process.env["DATABASE_URL"] ?? "");
  assert(
    configured.hostname === "127.0.0.1" && configured.port === "3307",
    "Expected the configured local database tunnel.",
  );
}

// Parse literal data using TypeScript's AST, resolving Vite image imports without
// evaluating application code or maintaining a second copy of the program copy.
async function readPrograms(): Promise<Program[]> {
  const source = ts.createSourceFile(
    sourcePath,
    await readFile(sourcePath, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  const images = new Map<string, string>();
  for (const statement of source.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier)
    )
      continue;
    const name = statement.importClause?.name?.text;
    const reference = statement.moduleSpecifier.text;
    if (name && reference.startsWith("@/assets/")) {
      images.set(name, resolve(root, "src", reference.slice(2)));
    }
  }
  function literal(node: ts.Expression): unknown {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
      return node.text;
    if (ts.isNumericLiteral(node)) return Number(node.text);
    if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
    if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
    if (node.kind === ts.SyntaxKind.NullKeyword) return null;
    if (ts.isIdentifier(node) && images.has(node.text))
      return images.get(node.text);
    if (ts.isArrayLiteralExpression(node))
      return node.elements.map((element) => literal(element));
    if (ts.isObjectLiteralExpression(node)) {
      const result: Record<string, unknown> = {};
      for (const property of node.properties) {
        assert(
          ts.isPropertyAssignment(property),
          "Unsupported static property.",
        );
        assert(
          ts.isIdentifier(property.name) || ts.isStringLiteral(property.name),
          "Unsupported property name.",
        );
        assert(
          !Object.hasOwn(result, property.name.text),
          "Duplicate static property.",
        );
        result[property.name.text] = literal(property.initializer);
      }
      return result;
    }
    throw new Error("Unsupported expression in static program data.");
  }
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (
        ts.isIdentifier(declaration.name) &&
        declaration.name.text === "programs" &&
        declaration.initializer
      ) {
        const value = literal(declaration.initializer);
        assert(
          Array.isArray(value) && value.length > 0,
          "No static programs found.",
        );
        return value as Program[];
      }
    }
  }
  throw new Error("Static programs declaration not found.");
}

function mapProgram(program: Program, index: number) {
  const metrics = program.metrics ?? [];
  assert(
    metrics.every((metric) => /session|participant/i.test(metric.label)),
    `Unmapped metric: ${program.slug}`,
  );
  const sessions = metrics.filter((metric) => /session/i.test(metric.label));
  const participants = metrics.filter((metric) =>
    /participant/i.test(metric.label),
  );
  assert(
    sessions.length <= 1 && participants.length <= 1,
    `Ambiguous metrics: ${program.slug}`,
  );
  const mapped = {
    slug: program.slug,
    type: program.category,
    title: program.title,
    description: program.shortDescription,
    tags: program.tags,
    // The schema has no note field; retain the complete advisory copy verbatim.
    aboutProgram:
      [program.description, program.note]
        .filter((value) => value !== undefined && value !== "")
        .join("\n\n") || null,
    whatWeCover: program.topics ?? [],
    awarenessSessionCount: sessions[0]?.value ?? null,
    participantCount: participants[0]?.value ?? null,
    published: true,
    sortOrder: (index + 1) * 10,
  };
  const validated = ourWorkMetadataSchema.parse(mapped);
  assert.deepEqual(
    validated,
    mapped,
    `Validation would alter static content: ${program.slug}`,
  );
  return validated;
}

async function readImage(program: Program) {
  assert(
    program.heroImage.startsWith(resolve(root, "src/assets") + "/") ||
      program.heroImage.startsWith(resolve(root, "src/assets") + "\\"),
    `Unresolved image: ${program.slug}`,
  );
  const buffer = await readFile(program.heroImage);
  assert(
    buffer.length > 0 && buffer.length <= MAX_IMAGE_SIZE_BYTES,
    `Invalid image size: ${program.slug}`,
  );
  const extension = extname(program.heroImage).toLowerCase();
  const mimeType =
    extension === ".jpg" || extension === ".jpeg"
      ? "image/jpeg"
      : extension === ".png"
        ? "image/png"
        : extension === ".webp"
          ? "image/webp"
          : null;
  assert(mimeType, `Unsupported image: ${program.slug}`);
  const valid =
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
  assert(valid, `Invalid image signature: ${program.slug}`);
  return { buffer, mimeType };
}

type InventoryItem = {
  program: Program;
  metadata: ReturnType<typeof mapProgram>;
};

function verifyRow(row: OurWorkItem, item: InventoryItem) {
  for (const [field, expected] of Object.entries(item.metadata)) {
    assert.deepEqual(
      row[field as keyof OurWorkItem],
      expected,
      `Content mismatch: ${item.program.slug}/${field}`,
    );
  }
  assert(
    Array.isArray(row.tags) && Array.isArray(row.whatWeCover),
    `JSON arrays invalid: ${row.slug}`,
  );
  assert(
    row.imageStorageKey.startsWith("our-work/"),
    `Wrong media category: ${row.slug}`,
  );
  const url = new URL(row.imageUrl);
  assert(
    url.protocol === "https:" && url.pathname.includes("/media/our-work/"),
    `Invalid public media URL: ${row.slug}`,
  );
}

async function verifyDataset(inventory: InventoryItem[]) {
  const rows = await db.select().from(ourWorkItems);
  const expectedSlugs = inventory.map((item) => item.program.slug);
  const actualSlugs = rows.map((row) => row.slug);
  const missing = expectedSlugs.filter((slug) => !actualSlugs.includes(slug));
  const extra = actualSlugs.filter((slug) => !expectedSlugs.includes(slug));
  const duplicates = actualSlugs.filter(
    (slug, index) => actualSlugs.indexOf(slug) !== index,
  );
  console.log(
    JSON.stringify({
      totalStaticPrograms: inventory.length,
      finalDbCount: rows.length,
      missing,
      extra,
      duplicates,
    }),
  );
  assert.equal(rows.length, inventory.length, "Final count mismatch.");
  assert.deepEqual(
    { missing, extra, duplicates },
    { missing: [], extra: [], duplicates: [] },
  );
  for (const item of inventory) {
    const row = rows.find((candidate) => candidate.slug === item.program.slug);
    assert(row, `Missing row: ${item.program.slug}`);
    verifyRow(row, item);
    assert(
      await mediaExists(row.imageStorageKey),
      `Remote image missing: ${row.slug}`,
    );
    const response = await fetch(row.imageUrl, {
      signal: AbortSignal.timeout(30_000),
    });
    assert(
      response.ok &&
        new URL(response.url).protocol === "https:" &&
        response.headers.get("content-type")?.startsWith("image/"),
      `HTTPS media failed: ${row.slug}`,
    );
    const local = await readImage(item.program);
    assert(
      Buffer.from(await response.arrayBuffer()).equals(local.buffer),
      `Remote image bytes mismatch: ${row.slug}`,
    );
    const lookup = await getPublishedOurWorkItemBySlug(row.slug);
    assert(
      lookup && lookup.slug === row.slug && lookup.title === row.title,
      `By-slug lookup failed: ${row.slug}`,
    );
    console.log(
      JSON.stringify({
        slug: row.slug,
        content: "exact",
        jsonArrays: true,
        remoteExists: true,
        httpsStatus: response.status,
        imageBytes: "exact",
        bySlug: true,
      }),
    );
  }
  const published = await getPublishedOurWorkItems();
  assert.deepEqual(
    published.map((row) => row.slug),
    expectedSlugs,
    "Published order mismatch.",
  );
  assert.equal(
    await getPublishedOurWorkItemBySlug("this-program-does-not-exist"),
    null,
  );
  console.log(
    JSON.stringify({ publishedOrder: expectedSlugs, unknownSlug: null }),
  );
}

async function main() {
  await requireTunnel();
  const existing = await db
    .select({
      id: ourWorkItems.id,
      slug: ourWorkItems.slug,
      title: ourWorkItems.title,
      published: ourWorkItems.published,
    })
    .from(ourWorkItems);
  console.log(JSON.stringify({ startingCount: existing.length, existing }));
  if (!verifyOnly)
    assert.equal(
      existing.length,
      0,
      "STOP: Existing CMS content. No migration writes allowed.",
    );
  const [columns] = await db.execute(
    sql`SHOW COLUMNS FROM our_work_items LIKE 'slug'`,
  );
  const slugColumn = (
    columns as unknown as { Type: string; Null: string }[]
  )[0];
  assert(
    slugColumn?.Type === "varchar(191)" && slugColumn.Null === "NO",
    "Phase 10D0 database column missing.",
  );
  const [indexes] = await db.execute(sql`SHOW INDEX FROM our_work_items`);
  const unique = (
    indexes as unknown as {
      Key_name: string;
      Column_name: string;
      Non_unique: number;
      Seq_in_index: number;
    }[]
  ).filter((index) => index.Key_name === "our_work_items_slug_unique");
  assert(
    unique.length === 1 &&
      unique[0]?.Column_name === "slug" &&
      Number(unique[0].Non_unique) === 0,
    "Phase 10D0 unique slug constraint missing.",
  );
  const galleryBefore = await db.select().from(galleryItems);
  const galleryMediaBefore = await Promise.all(
    galleryBefore.map(async (row) => ({
      key: row.imageStorageKey,
      exists: await mediaExists(row.imageStorageKey),
    })),
  );
  const programs = await readPrograms();
  const inventory = programs.map((program, index) => ({
    program,
    metadata: mapProgram(program, index),
  }));
  assert.equal(
    new Set(programs.map((program) => program.slug)).size,
    programs.length,
    "Duplicate static slugs.",
  );
  for (const [index, item] of inventory.entries()) {
    const image = await readImage(item.program);
    console.log(
      JSON.stringify({
        index: index + 1,
        slug: item.program.slug,
        title: item.program.title,
        type: item.metadata.type,
        sourceImage: item.program.heroImage,
        bytes: image.buffer.length,
        mimeType: image.mimeType,
        sortOrder: item.metadata.sortOrder,
        awarenessSessionCount: item.metadata.awarenessSessionCount,
        participantCount: item.metadata.participantCount,
      }),
    );
  }
  console.log(
    JSON.stringify({
      totalProgramCount: inventory.length,
      imageReferences: programs.length,
      distinctSourceImages: new Set(
        programs.map((program) => program.heroImage),
      ).size,
      galleryStartingCount: galleryBefore.length,
    }),
  );
  if (dryRun) {
    console.log("DRY RUN PASSED: No database or media writes.");
    return;
  }
  const created: { id: string | null; slug: string; key: string }[] = [];
  try {
    if (!verifyOnly) {
      for (const item of inventory) {
        await requireTunnel();
        const metadata = mapProgram(item.program, inventory.indexOf(item));
        const image = await readImage(item.program);
        const [conflict] = await db
          .select({ id: ourWorkItems.id })
          .from(ourWorkItems)
          .where(eq(ourWorkItems.slug, metadata.slug))
          .limit(1);
        assert(!conflict, `Slug already exists: ${metadata.slug}`);
        const uploaded = await uploadImage({ ...image, category: "our-work" });
        const tracked = {
          id: null as string | null,
          slug: metadata.slug,
          key: uploaded.key,
        };
        created.push(tracked);
        assert(
          uploaded.publicUrl,
          `Missing public media URL: ${metadata.slug}`,
        );
        const id = randomUUID();
        tracked.id = id;
        await db.insert(ourWorkItems).values({
          id,
          ...metadata,
          imageStorageKey: uploaded.key,
          imageUrl: uploaded.publicUrl,
        });
        const [row] = await db
          .select()
          .from(ourWorkItems)
          .where(eq(ourWorkItems.id, id))
          .limit(1);
        assert(row, `Inserted row not found: ${metadata.slug}`);
        verifyRow(row, item);
        console.log(JSON.stringify({ inserted: metadata.slug, id }));
      }
    }
    await verifyDataset(inventory);
    assert.deepEqual(
      await db.select().from(galleryItems),
      galleryBefore,
      "Gallery records changed.",
    );
    for (const image of galleryMediaBefore)
      assert.equal(
        await mediaExists(image.key),
        image.exists,
        "Gallery media existence changed.",
      );
    console.log(
      JSON.stringify({
        result: "PASS",
        rowsInserted: created.length,
        imagesUploaded: created.length,
        galleryFinalCount: galleryBefore.length,
        galleryUnchanged: true,
      }),
    );
  } catch {
    // Only UUIDs and storage keys owned by this invocation may be removed.
    for (const item of [...created].reverse()) {
      let rowRemoved = item.id === null;
      let mediaRemoved = false;
      if (item.id) {
        try {
          await db.delete(ourWorkItems).where(eq(ourWorkItems.id, item.id));
          const [remaining] = await db
            .select({ id: ourWorkItems.id })
            .from(ourWorkItems)
            .where(eq(ourWorkItems.id, item.id));
          rowRemoved = !remaining;
        } catch {
          /* Report cleanup failure without leaking connection details. */
        }
      }
      try {
        await deleteMedia(item.key);
        mediaRemoved = !(await mediaExists(item.key));
      } catch {
        /* Report cleanup failure without leaking storage details. */
      }
      console.error(
        JSON.stringify({
          cleanup: item.slug,
          rowRemoved,
          mediaRemoved,
          id: item.id,
          storageKey: item.key,
        }),
      );
    }
    throw new Error(
      "Migration/audit failed. Cleanup results reported for this run only.",
    );
  }
}

try {
  await main();
} catch (error) {
  // Do not print raw database/transport errors, their causes, or environment values.
  console.error(
    error instanceof assert.AssertionError
      ? error.message
      : error instanceof Error &&
          error.message === "DATABASE TUNNEL NOT AVAILABLE"
        ? error.message
        : "Our Work migration failed. No secrets logged.",
  );
  process.exitCode = 1;
} finally {
  await closeDb();
}
