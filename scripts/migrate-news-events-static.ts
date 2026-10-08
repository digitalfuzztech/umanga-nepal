// Manual migration only; never invoke from application or deployment hooks.
import "dotenv/config";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createConnection } from "node:net";
import { dirname, extname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { eq } from "drizzle-orm";
import ts from "typescript";
import { z } from "zod";
import { db, closeDb } from "../src/server/db";
import {
  newsItems,
  eventItems,
  galleryItems,
  ourWorkItems,
  storyItems,
  inboxThreads,
  inboxMessages,
} from "../src/server/db/schema";
import {
  newsMetadataSchema,
  getPublishedNews,
  getPublishedNewsBySlug,
} from "../src/server/news";
import { eventMetadataSchema, getPublishedEvents } from "../src/server/events";
import {
  uploadImage,
  deleteMedia,
  mediaExists,
  MAX_IMAGE_SIZE_BYTES,
} from "../src/server/storage";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourcePath = resolve(root, "src/data/news.ts");
export const hash = (bytes: Buffer) =>
  createHash("sha256").update(bytes).digest("hex");
const common = {
  id: z.string().min(1),
  slug: z.string(),
  title: z.string(),
  category: z.string(),
  date: z.string(),
  location: z.string(),
  demoContent: z.boolean(),
};
const staticNews = z
  .object({
    ...common,
    excerpt: z.string(),
    body: z.array(z.string().min(1)).min(1),
    image: z.string(),
  })
  .strict();
const staticEvent = z
  .object({
    ...common,
    summary: z.string(),
    status: z.enum(["upcoming", "past", "registration-open"]),
  })
  .strict();

// Resolve imported assets from literal TypeScript syntax without evaluating routes.
export async function readSource() {
  const bytes = await readFile(sourcePath);
  const source = ts.createSourceFile(
    sourcePath,
    bytes.toString("utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  const images = new Map<string, string>();
  const arrays = new Map<string, unknown>();
  for (const statement of source.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !ts.isStringLiteral(statement.moduleSpecifier)
    )
      continue;
    const name = statement.importClause?.name?.text;
    const reference = statement.moduleSpecifier.text;
    if (name && reference.startsWith("@/assets/"))
      images.set(name, resolve(root, "src", reference.slice(2)));
    else if (
      name &&
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
      const result: Record<string, unknown> = {};
      for (const property of node.properties) {
        assert(ts.isPropertyAssignment(property));
        assert(
          ts.isIdentifier(property.name) || ts.isStringLiteral(property.name),
        );
        assert(!Object.hasOwn(result, property.name.text));
        result[property.name.text] = literal(property.initializer);
      }
      return result;
    }
    throw new Error("Unsupported static source expression.");
  }
  for (const statement of source.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const declaration of statement.declarationList.declarations) {
      if (
        ts.isIdentifier(declaration.name) &&
        ["news", "events"].includes(declaration.name.text) &&
        declaration.initializer
      )
        arrays.set(declaration.name.text, literal(declaration.initializer));
    }
  }
  return {
    news: z.array(staticNews).length(3).parse(arrays.get("news")),
    events: z.array(staticEvent).length(3).parse(arrays.get("events")),
    sourceHash: hash(bytes),
  };
}
export async function inventory() {
  const source = await readSource();
  const news = await Promise.all(
    source.news.map(async (item, index) => {
      const metadata = {
        slug: item.slug,
        title: item.title,
        excerpt: item.excerpt,
        content: item.body.join("\n\n"),
        category: item.category,
        location: item.location,
        newsDate: item.date,
        demoContent: item.demoContent,
        published: true,
        sortOrder: (index + 1) * 10,
      };
      assert.deepEqual(
        newsMetadataSchema.parse(metadata),
        metadata,
        `Validation changes source: ${item.slug}`,
      );
      assert.deepEqual(metadata.content.split("\n\n"), item.body);
      const asset = relative(resolve(root, "src/assets"), item.image);
      assert(
        asset && !asset.startsWith(".."),
        `Invalid image path: ${item.slug}`,
      );
      const buffer = await readFile(item.image);
      assert(
        buffer.length > 0 && buffer.length <= MAX_IMAGE_SIZE_BYTES,
        `Invalid image size: ${item.slug}`,
      );
      const extension = extname(item.image).toLowerCase();
      const mimeType = [".jpg", ".jpeg"].includes(extension)
        ? "image/jpeg"
        : extension === ".png"
          ? "image/png"
          : extension === ".webp"
            ? "image/webp"
            : null;
      assert(mimeType, `Unsupported image: ${item.slug}`);
      const valid =
        mimeType === "image/jpeg"
          ? buffer.subarray(0, 3).equals(Buffer.from([255, 216, 255]))
          : mimeType === "image/png"
            ? buffer
                .subarray(0, 8)
                .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
            : buffer.length >= 12 &&
              buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
              buffer.subarray(8, 12).toString("ascii") === "WEBP";
      assert(valid, `Invalid image signature: ${item.slug}`);
      return {
        source: item,
        metadata,
        image: { buffer, mimeType, sha256: hash(buffer) },
      };
    }),
  );
  const events = source.events.map((item, index) => {
    const metadata = {
      slug: item.slug,
      title: item.title,
      summary: item.summary,
      category: item.category,
      eventStart: item.date,
      location: item.location,
      registrationOpen: item.status === "registration-open",
      demoContent: item.demoContent,
      published: true,
      sortOrder: (index + 1) * 10,
    };
    assert.deepEqual(
      eventMetadataSchema.parse(metadata),
      metadata,
      `Validation changes source: ${item.slug}`,
    );
    return { source: item, metadata };
  });
  for (const items of [news, events])
    assert.equal(
      new Set(items.map((item) => item.metadata.slug)).size,
      3,
      "Duplicate static slugs.",
    );
  return { news, events, sourceHash: source.sourceHash };
}
export async function snapshot() {
  return {
    gallery: await db.select().from(galleryItems).orderBy(galleryItems.id),
    ourWork: await db.select().from(ourWorkItems).orderBy(ourWorkItems.id),
    stories: await db.select().from(storyItems).orderBy(storyItems.id),
    threads: await db.select().from(inboxThreads).orderBy(inboxThreads.id),
    messages: await db.select().from(inboxMessages).orderBy(inboxMessages.id),
  };
}
async function requireTunnel() {
  const url = new URL(process.env["DATABASE_URL"] ?? "");
  if (url.hostname !== "127.0.0.1" || url.port !== "3307") return;
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
async function requireEmpty() {
  const news = await db
    .select({ id: newsItems.id, slug: newsItems.slug })
    .from(newsItems);
  const events = await db
    .select({ id: eventItems.id, slug: eventItems.slug })
    .from(eventItems);
  assert(
    news.length === 0 && events.length === 0,
    `STOP: Target tables populated (News=${news.length}, Events=${events.length}). No migration writes allowed.`,
  );
}
function compare(row: object, expected: object) {
  for (const [field, value] of Object.entries(expected))
    assert.deepEqual(
      Reflect.get(row, field),
      value,
      `Field mismatch: ${Reflect.get(row, "slug")}/${field}`,
    );
  assert.match(
    Reflect.get(row, "id"),
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
  );
}
async function verifyMedia(
  key: string,
  url: string,
  image: { buffer: Buffer; sha256: string },
) {
  assert.match(key, /^news\/\d{4}\/\d{2}\/[0-9a-f-]+\.(jpg|jpeg|png|webp)$/);
  assert(await mediaExists(key), "Remote News image missing.");
  const parsed = new URL(url);
  assert(
    parsed.protocol === "https:" && parsed.pathname.includes("/media/news/"),
  );
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
  assert.equal(response.status, 200);
  assert(new URL(response.url).protocol === "https:");
  assert.match(
    response.headers.get("content-type") ?? "",
    /^image\/(jpeg|png|webp)(;|$)/i,
  );
  const remote = Buffer.from(await response.arrayBuffer());
  assert(remote.length > 0);
  assert.equal(hash(remote), image.sha256);
  assert.deepEqual(remote, image.buffer);
}
export async function verifyDataset(
  planned: Awaited<ReturnType<typeof inventory>>,
) {
  const news = await db.select().from(newsItems).orderBy(newsItems.sortOrder);
  const events = await db
    .select()
    .from(eventItems)
    .orderBy(eventItems.sortOrder);
  assert.deepEqual(
    news.map((item) => item.slug),
    planned.news.map((item) => item.metadata.slug),
  );
  assert.deepEqual(
    events.map((item) => item.slug),
    planned.events.map((item) => item.metadata.slug),
  );
  for (const item of planned.news) {
    const row = news.find((row) => row.slug === item.metadata.slug)!;
    compare(row, item.metadata);
    assert.deepEqual(row.content.split("\n\n"), item.source.body);
    await verifyMedia(row.imageStorageKey, row.imageUrl, item.image);
    const publicItem = await getPublishedNewsBySlug(row.slug);
    assert(publicItem && !Object.hasOwn(publicItem, "imageStorageKey"));
    console.log(
      JSON.stringify({
        slug: row.slug,
        fields: "exact",
        paragraphs: item.source.body.length,
        imageUrl: row.imageUrl,
        storageKey: row.imageStorageKey,
        http: 200,
        bytes: item.image.buffer.length,
        sha256: item.image.sha256,
        remoteExists: true,
        byteMatch: true,
      }),
    );
  }
  for (const item of planned.events) {
    compare(
      events.find((row) => row.slug === item.metadata.slug)!,
      item.metadata,
    );
    console.log(JSON.stringify({ ...item.metadata, fields: "exact" }));
  }
  assert.deepEqual(
    (await getPublishedNews()).map((row) => row.slug),
    news.map((row) => row.slug),
  );
  assert.deepEqual(
    (await getPublishedEvents()).map((row) => row.slug),
    events.map((row) => row.slug),
  );
  assert.equal(await getPublishedNewsBySlug("this-news-does-not-exist"), null);
}
async function main() {
  const args = process.argv.slice(2);
  assert(
    args.length <= 1 &&
      args.every((arg) => ["--dry-run", "--verify"].includes(arg)),
    "Choose --dry-run, --verify, or no argument.",
  );
  const verifyOnly = args.includes("--verify");
  await requireTunnel();
  if (!verifyOnly) await requireEmpty();
  const before = await snapshot();
  const counts = {
    gallery: before.gallery.length,
    ourWork: before.ourWork.length,
    stories: before.stories.length,
    inboxThreads: before.threads.length,
    inboxMessages: before.messages.length,
  };
  console.log(JSON.stringify({ baseline: counts }));
  assert.deepEqual(
    counts,
    { gallery: 2, ourWork: 8, stories: 5, inboxThreads: 3, inboxMessages: 4 },
    "Unexpected baseline; stop for review.",
  );
  const planned = await inventory();
  for (const item of planned.news)
    console.log(
      JSON.stringify({
        ...item.metadata,
        sourceImage: relative(root, item.source.image),
        paragraphs: item.source.body.length,
        bytes: item.image.buffer.length,
        sha256: item.image.sha256,
      }),
    );
  for (const item of planned.events) console.log(JSON.stringify(item.metadata));
  if (args.includes("--dry-run")) {
    console.log("DRY RUN PASSED: 3 News, 3 Events; no writes/uploads/mail.");
    return;
  }
  const uploaded: { id: string; key: string; publicUrl: string }[] = [];
  const eventIds: string[] = [];
  let committed = false;
  try {
    if (!verifyOnly) {
      await requireEmpty();
      // Verify all uploads before committing the six rows in one transaction.
      for (const item of planned.news) {
        assert.equal(
          hash(await readFile(item.source.image)),
          item.image.sha256,
          "Source image changed.",
        );
        const media = await uploadImage({
          buffer: item.image.buffer,
          mimeType: item.image.mimeType,
          category: "news",
        });
        uploaded.push({
          id: randomUUID(),
          key: media.key,
          publicUrl: media.publicUrl ?? "",
        });
        assert(media.publicUrl, "Missing public media URL.");
        await verifyMedia(media.key, media.publicUrl, item.image);
      }
      assert.equal(
        hash(await readFile(sourcePath)),
        planned.sourceHash,
        "Static source changed.",
      );
      await db.transaction(async (transaction) => {
        assert.equal(
          (await transaction.select({ id: newsItems.id }).from(newsItems))
            .length,
          0,
          "News appeared during upload.",
        );
        assert.equal(
          (await transaction.select({ id: eventItems.id }).from(eventItems))
            .length,
          0,
          "Events appeared during upload.",
        );
        for (const [index, item] of planned.news.entries()) {
          const media = uploaded[index]!;
          await transaction.insert(newsItems).values({
            id: media.id,
            ...item.metadata,
            imageStorageKey: media.key,
            imageUrl: media.publicUrl,
          });
          const [row] = await transaction
            .select()
            .from(newsItems)
            .where(eq(newsItems.id, media.id));
          assert(row);
          compare(row, item.metadata);
        }
        for (const item of planned.events) {
          const id = randomUUID();
          eventIds.push(id);
          await transaction.insert(eventItems).values({ id, ...item.metadata });
          const [row] = await transaction
            .select()
            .from(eventItems)
            .where(eq(eventItems.id, id));
          assert(row);
          compare(row, item.metadata);
        }
      });
      committed = true;
    }
    await verifyDataset(planned);
    assert.deepEqual(
      await snapshot(),
      before,
      "Existing CMS/Inbox records changed.",
    );
    assert.equal(
      hash(await readFile(sourcePath)),
      planned.sourceHash,
      "Static source changed.",
    );
    for (const item of planned.news)
      assert.equal(hash(await readFile(item.source.image)), item.image.sha256);
    console.log(
      JSON.stringify({
        result: "PASS",
        news: 3,
        events: 3,
        uploaded: uploaded.length,
        sourceHash: planned.sourceHash,
        baseline: counts,
        existingRecords: "exactly unchanged",
        mailSent: 0,
      }),
    );
  } catch (error) {
    // Cleanup only this invocation's UUIDs and keys; never touch existing content.
    if (committed)
      await db.transaction(async (transaction) => {
        for (const item of uploaded)
          await transaction.delete(newsItems).where(eq(newsItems.id, item.id));
        for (const id of eventIds)
          await transaction.delete(eventItems).where(eq(eventItems.id, id));
      });
    for (const item of uploaded) {
      try {
        await deleteMedia(item.key);
        assert.equal(await mediaExists(item.key), false);
      } catch {
        console.error(`COMPENSATION REQUIRED: owned News media ${item.key}`);
      }
    }
    throw error;
  }
}
if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main()
    .catch((error) => {
      console.error(
        error instanceof assert.AssertionError ||
          (error instanceof Error &&
            error.message === "DATABASE TUNNEL NOT AVAILABLE")
          ? error.message
          : "Migration stopped safely. Check connectivity/configuration; no raw server errors are printed.",
      );
      process.exitCode = 1;
    })
    .finally(closeDb);
}
