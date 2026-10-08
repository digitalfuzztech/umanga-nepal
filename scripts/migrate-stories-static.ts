// Manual migration/audit utility. Never invoke from application or deployment hooks.
import "dotenv/config";

import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createConnection } from "node:net";
import { dirname, extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { setTimeout as delay } from "node:timers/promises";
import { eq } from "drizzle-orm";
import ts from "typescript";
import { z } from "zod";

import { closeDb, db } from "../src/server/db";
import {
  galleryItems,
  ourWorkItems,
  storyItems,
  type StoryItem,
} from "../src/server/db/schema";
import {
  getPublishedStories,
  getPublishedStoryBySlug,
  storyMetadataSchema,
} from "../src/server/stories";
import {
  deleteMedia,
  MAX_IMAGE_SIZE_BYTES,
  mediaExists,
  uploadImage,
} from "../src/server/storage";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = resolve(root, "src/data/stories.ts");
let phase = "preflight";
const staticStorySchema = z
  .object({
    id: z.string().min(1),
    slug: z.string(),
    title: z.string(),
    excerpt: z.string(),
    body: z.array(z.string().min(1)).min(1),
    category: z.string(),
    image: z.string().min(1),
    date: z.string().optional(),
    attribution: z.string(),
    demoContent: z.boolean(),
  })
  .strict();

async function requireTunnel() {
  const configured = new URL(process.env["DATABASE_URL"] ?? "");
  if (configured.hostname !== "127.0.0.1" || configured.port !== "3307") return;
  await new Promise<void>((accept, reject) => {
    const socket = createConnection({ host: "127.0.0.1", port: 3307 });
    const fail = () => {
      socket.destroy();
      reject(new Error("DATABASE TUNNEL NOT AVAILABLE"));
    };
    socket.setTimeout(3000, fail);
    socket.once("error", fail);
    socket.once("connect", () => {
      socket.destroy();
      accept();
    });
  });
}

// Resolve Vite imports and evaluate only literal AST nodes, never application code.
export async function readStaticStories() {
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
    if (!name) continue;
    if (reference.startsWith("@/assets/"))
      images.set(name, resolve(root, "src", reference.slice(2)));
    else if (
      /^\.\.?\//.test(reference) &&
      /\.(jpe?g|png|webp)$/i.test(reference)
    )
      images.set(name, resolve(dirname(sourcePath), reference));
  }
  function literal(node: ts.Expression): unknown {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))
      return node.text;
    if (node.kind === ts.SyntaxKind.TrueKeyword) return true;
    if (node.kind === ts.SyntaxKind.FalseKeyword) return false;
    if (ts.isIdentifier(node) && images.has(node.text))
      return images.get(node.text);
    if (ts.isArrayLiteralExpression(node)) return node.elements.map(literal);
    if (ts.isObjectLiteralExpression(node)) {
      const value: Record<string, unknown> = {};
      for (const property of node.properties) {
        assert(
          ts.isPropertyAssignment(property),
          "Unsupported static Story property.",
        );
        assert(
          ts.isIdentifier(property.name) || ts.isStringLiteral(property.name),
          "Unsupported static Story property name.",
        );
        assert(
          !Object.hasOwn(value, property.name.text),
          "Duplicate static Story property.",
        );
        value[property.name.text] = literal(property.initializer);
      }
      return value;
    }
    throw new Error("Unsupported static Story expression.");
  }
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (
        ts.isIdentifier(declaration.name) &&
        declaration.name.text === "stories" &&
        declaration.initializer
      ) {
        return z
          .array(staticStorySchema)
          .length(5)
          .parse(literal(declaration.initializer));
      }
    }
  }
  throw new Error("Static Stories declaration not found.");
}

type StaticStory = Awaited<ReturnType<typeof readStaticStories>>[number];
export function mapStory(story: StaticStory, index: number) {
  const mapped = {
    slug: story.slug,
    title: story.title,
    excerpt: story.excerpt,
    content: story.body.join("\n\n"),
    category: story.category,
    attribution: story.attribution,
    storyDate: story.date ?? null,
    demoContent: story.demoContent,
    published: true,
    sortOrder: (index + 1) * 10,
  };
  const validated = storyMetadataSchema.parse(mapped);
  assert.deepEqual(
    validated,
    mapped,
    `Validation would alter static content: ${story.slug}`,
  );
  assert.deepEqual(
    validated.content.split("\n\n"),
    story.body,
    `Paragraph mapping mismatch: ${story.slug}`,
  );
  return validated;
}

const hash = (buffer: Buffer) =>
  createHash("sha256").update(buffer).digest("hex");
async function readImage(story: StaticStory) {
  const path = relative(resolve(root, "src/assets"), story.image);
  assert(
    path && !path.startsWith("..") && !resolve(story.image).includes("\0"),
    `Unresolved source image: ${story.slug}`,
  );
  const buffer = await readFile(story.image);
  assert(
    buffer.length > 0 && buffer.length <= MAX_IMAGE_SIZE_BYTES,
    `Invalid image size: ${story.slug}`,
  );
  const extension = extname(story.image).toLowerCase();
  const mimeType =
    extension === ".jpg" || extension === ".jpeg"
      ? "image/jpeg"
      : extension === ".png"
        ? "image/png"
        : extension === ".webp"
          ? "image/webp"
          : null;
  assert(mimeType, `Unsupported source image: ${story.slug}`);
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
  assert(valid, `Invalid source image signature: ${story.slug}`);
  return { buffer, mimeType, sha256: hash(buffer) };
}
type InventoryItem = {
  story: StaticStory;
  metadata: ReturnType<typeof mapStory>;
  image: Awaited<ReturnType<typeof readImage>>;
};

function verifyRow(row: StoryItem, item: InventoryItem) {
  for (const [field, expected] of Object.entries(item.metadata)) {
    assert.deepEqual(
      row[field as keyof StoryItem],
      expected,
      `Content mismatch: ${item.story.slug}/${field}`,
    );
  }
  assert.deepEqual(
    row.content.split("\n\n"),
    item.story.body,
    `Paragraph round-trip mismatch: ${row.slug}`,
  );
  assert.match(
    row.id,
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
  assert(
    row.imageStorageKey.startsWith("stories/"),
    `Wrong media category: ${row.slug}`,
  );
}

async function verifyMedia(key: string, url: string, item: InventoryItem) {
  assert(await remoteExists(key), `Remote media missing: ${item.story.slug}`);
  const expectedUrl = new URL(url);
  assert(
    expectedUrl.protocol === "https:" &&
      expectedUrl.pathname.includes("/media/stories/"),
    `Invalid public Story image URL: ${item.story.slug}`,
  );
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  assert(
    response.ok &&
      new URL(response.url).protocol === "https:" &&
      response.headers.get("content-type")?.startsWith("image/"),
    `HTTPS media failed: ${item.story.slug}`,
  );
  const remote = Buffer.from(await response.arrayBuffer());
  assert.equal(
    hash(remote),
    item.image.sha256,
    `Media hash mismatch: ${item.story.slug}`,
  );
  assert.deepEqual(
    remote,
    item.image.buffer,
    `Media byte mismatch: ${item.story.slug}`,
  );
  return response.status;
}

async function remoteExists(key: string): Promise<boolean> {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await mediaExists(key);
    } catch (error) {
      if (attempt === 3) throw error;
      console.warn("Retrying a read-only media existence check.");
      await delay(2000);
    }
  }
  throw new Error("Media existence check failed.");
}

async function verifyDataset(inventory: InventoryItem[]) {
  const rows = await db.select().from(storyItems);
  const expected = inventory.map((item) => item.story.slug);
  const actual = rows.map((row) => row.slug);
  const comparison = {
    missing: expected.filter((slug) => !actual.includes(slug)),
    extra: actual.filter((slug) => !expected.includes(slug)),
    duplicates: actual.filter((slug, index) => actual.indexOf(slug) !== index),
  };
  console.log(
    JSON.stringify({
      totalStaticStories: inventory.length,
      finalDbCount: rows.length,
      ...comparison,
    }),
  );
  assert.equal(rows.length, inventory.length, "Final Story count mismatch.");
  assert.deepEqual(comparison, { missing: [], extra: [], duplicates: [] });
  for (const item of inventory) {
    const row = rows.find((candidate) => candidate.slug === item.story.slug);
    assert(row, `Missing migrated Story: ${item.story.slug}`);
    verifyRow(row, item);
    const status = await verifyMedia(row.imageStorageKey, row.imageUrl, item);
    const published = await getPublishedStoryBySlug(row.slug);
    assert(published, `Published lookup missing: ${row.slug}`);
    for (const field of [
      "slug",
      "title",
      "excerpt",
      "content",
      "category",
      "attribution",
      "storyDate",
      "demoContent",
      "sortOrder",
      "imageUrl",
    ] as const) {
      assert.deepEqual(
        published[field],
        row[field],
        `Published lookup mismatch: ${row.slug}/${field}`,
      );
    }
    assert(
      !Object.hasOwn(published, "imageStorageKey"),
      "Public lookup exposes storage internals.",
    );
    console.log(
      JSON.stringify({
        slug: row.slug,
        content: "exact",
        paragraphs: item.story.body.length,
        storyDate: row.storyDate,
        demoContent: row.demoContent,
        published: row.published,
        sortOrder: row.sortOrder,
        remoteExists: true,
        httpsStatus: status,
        sourceHash: item.image.sha256,
        imageBytes: "exact",
        bySlug: true,
      }),
    );
  }
  const published = await getPublishedStories();
  assert.deepEqual(
    published.map((row) => row.slug),
    expected,
    "Published Story order mismatch.",
  );
  assert(
    published.every((row) => !Object.hasOwn(row, "imageStorageKey")),
    "Public list exposes storage internals.",
  );
  assert.equal(
    await getPublishedStoryBySlug("this-story-does-not-exist"),
    null,
  );
  console.log(JSON.stringify({ publishedOrder: expected, unknownSlug: null }));
}

async function main() {
  const args = process.argv.slice(2);
  assert(
    args.length <= 1 &&
      args.every((arg) => arg === "--dry-run" || arg === "--verify"),
    "Choose --dry-run, --verify, or no argument.",
  );
  const dryRun = args.includes("--dry-run");
  const verifyOnly = args.includes("--verify");
  await requireTunnel();
  const existing = await db
    .select({
      id: storyItems.id,
      slug: storyItems.slug,
      title: storyItems.title,
      published: storyItems.published,
      imageUrl: storyItems.imageUrl,
      imageStorageKey: storyItems.imageStorageKey,
    })
    .from(storyItems);
  console.log(JSON.stringify({ startingCount: existing.length, existing }));
  if (!verifyOnly)
    assert.equal(
      existing.length,
      0,
      "STOP: Existing Story content. No migration writes allowed.",
    );
  const galleryBefore = await db
    .select()
    .from(galleryItems)
    .orderBy(galleryItems.id);
  const workBefore = await db
    .select()
    .from(ourWorkItems)
    .orderBy(ourWorkItems.id);
  assert.equal(workBefore.length, 8, "Unexpected Our Work count.");
  const stories = await readStaticStories();
  assert.equal(
    new Set(stories.map((story) => story.slug)).size,
    stories.length,
    "Duplicate static Story slugs.",
  );
  const inventory: InventoryItem[] = [];
  for (const [index, story] of stories.entries()) {
    const item = {
      story,
      metadata: mapStory(story, index),
      image: await readImage(story),
    };
    inventory.push(item);
    console.log(
      JSON.stringify({
        index: index + 1,
        staticId: story.id,
        slug: story.slug,
        title: story.title,
        category: story.category,
        sourceImage: relative(root, story.image).replaceAll("\\", "/"),
        storyDate: item.metadata.storyDate,
        demoContent: item.metadata.demoContent,
        paragraphs: story.body.length,
        sortOrder: item.metadata.sortOrder,
        bytes: item.image.buffer.length,
        mimeType: item.image.mimeType,
        sha256: item.image.sha256,
      }),
    );
  }
  console.log(
    JSON.stringify({
      totalStoryCount: inventory.length,
      sourceImageCount: inventory.length,
      distinctSourceImages: new Set(stories.map((story) => story.image)).size,
      galleryStartingCount: galleryBefore.length,
      ourWorkStartingCount: workBefore.length,
    }),
  );
  if (dryRun) {
    console.log("DRY RUN PASSED: No database or media writes.");
    return;
  }
  const otherMediaBefore: { key: string; exists: boolean }[] = [];
  for (const row of [...galleryBefore, ...workBefore]) {
    otherMediaBefore.push({
      key: row.imageStorageKey,
      exists: await remoteExists(row.imageStorageKey),
    });
  }
  const created: { id: string | null; slug: string; key: string }[] = [];
  try {
    if (!verifyOnly) {
      // A second empty-table check catches content added during the local audit.
      assert.equal(
        (await db.select({ id: storyItems.id }).from(storyItems)).length,
        0,
        "STOP: Story content appeared during preflight.",
      );
      for (const [index, item] of inventory.entries()) {
        await requireTunnel();
        const metadata = mapStory(item.story, index);
        const image = await readImage(item.story);
        assert.equal(
          image.sha256,
          item.image.sha256,
          `Source image changed during preflight: ${item.story.slug}`,
        );
        const [conflict] = await db
          .select({ id: storyItems.id })
          .from(storyItems)
          .where(eq(storyItems.slug, metadata.slug))
          .limit(1);
        assert(!conflict, `Slug already exists: ${metadata.slug}`);
        const uploaded = await uploadImage({
          buffer: image.buffer,
          mimeType: image.mimeType,
          category: "stories",
        });
        const tracked = {
          id: null as string | null,
          slug: metadata.slug,
          key: uploaded.key,
        };
        created.push(tracked);
        assert(
          uploaded.publicUrl,
          `Missing public image URL: ${metadata.slug}`,
        );
        await verifyMedia(uploaded.key, uploaded.publicUrl, item);
        const id = randomUUID();
        tracked.id = id;
        await db.transaction(async (transaction) => {
          await transaction.insert(storyItems).values({
            id,
            ...metadata,
            imageStorageKey: uploaded.key,
            imageUrl: uploaded.publicUrl!,
          });
          const [row] = await transaction
            .select()
            .from(storyItems)
            .where(eq(storyItems.id, id))
            .limit(1);
          assert(row, `Inserted Story missing: ${metadata.slug}`);
          verifyRow(row, item);
        });
        console.log(
          JSON.stringify({ inserted: metadata.slug, id, uploadVerified: true }),
        );
      }
    }
    phase = "dataset verification";
    await verifyDataset(inventory);
    phase = "Gallery/Our Work database regression";
    assert.deepEqual(
      await db.select().from(galleryItems).orderBy(galleryItems.id),
      galleryBefore,
      "Gallery records changed.",
    );
    assert.deepEqual(
      await db.select().from(ourWorkItems).orderBy(ourWorkItems.id),
      workBefore,
      "Our Work records changed.",
    );
    phase = "Gallery/Our Work media regression";
    for (const image of otherMediaBefore)
      assert.equal(
        await remoteExists(image.key),
        image.exists,
        "Existing Gallery/Our Work media existence changed.",
      );
    console.log(
      JSON.stringify({
        result: "PASS",
        rowsInserted: created.length,
        imagesUploaded: created.length,
        galleryFinalCount: galleryBefore.length,
        ourWorkFinalCount: workBefore.length,
        otherContentUnchanged: true,
      }),
    );
  } catch (error) {
    // Delete only UUIDs/media owned by this invocation, including uninserted uploads.
    for (const item of [...created].reverse()) {
      let rowRemoved = item.id === null;
      let mediaRemoved = false;
      if (item.id) {
        try {
          await db.delete(storyItems).where(eq(storyItems.id, item.id));
          rowRemoved = !(
            await db
              .select({ id: storyItems.id })
              .from(storyItems)
              .where(eq(storyItems.id, item.id))
          )[0];
        } catch {
          /* Cleanup failures are reported without raw transport errors. */
        }
      }
      try {
        await deleteMedia(item.key);
        mediaRemoved = !(await mediaExists(item.key));
      } catch {
        /* Continue cleanup for every resource from this run. */
      }
      console.error(
        JSON.stringify({
          cleanup: item.slug,
          id: item.id,
          storageKey: item.key,
          rowRemoved,
          mediaRemoved,
        }),
      );
    }
    throw error;
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    await main();
  } catch (error) {
    // Never print raw DB/FTP errors, their causes, or environment values.
    console.error(
      error instanceof Error &&
        error.message === "DATABASE TUNNEL NOT AVAILABLE"
        ? error.message
        : error instanceof assert.AssertionError
          ? error.message
          : `Stories migration/audit failed during ${phase}. No secrets logged.`,
    );
    process.exitCode = 1;
  } finally {
    await closeDb();
  }
}
