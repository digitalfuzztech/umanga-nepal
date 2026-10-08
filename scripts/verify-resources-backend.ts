// Manual verification only: creates temporary Resources and one temporary session.
import "dotenv/config";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { createConnection } from "node:net";
import { setTimeout } from "node:timers/promises";
import { requestHandler } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import {
  ADMIN_SESSION_COOKIE_NAME,
  createAdminSession,
  deleteAdminSession,
} from "../src/server/auth";
import { closeDb, db, getDb } from "../src/server/db";
import {
  adminSessions,
  adminUsers,
  eventItems,
  galleryItems,
  inboxMessages,
  inboxThreads,
  newsItems,
  ourWorkItems,
  resourceItems,
  storyItems,
} from "../src/server/db/schema";
import {
  createResource,
  deleteResource,
  getPublishedResourceBySlug,
  getPublishedResources,
  getResourceById,
  getResourcesForAdmin,
  ResourceApplicationError,
  resourceMetadataSchema,
  toResourceFailure,
  updateResourceMetadata,
  type ResourceErrorCode,
  type ResourceMetadataInput,
} from "../src/server/resources";

async function inRequest<T>(
  token: string | undefined,
  operation: () => Promise<T>,
): Promise<T> {
  let result: T | undefined;
  let failure: unknown;
  const handler = requestHandler(async () => {
    try {
      result = await operation();
    } catch (error) {
      failure = error;
    }
    return new Response(null, { status: 204 });
  });
  const headers = new Headers();
  if (token) headers.set("cookie", `${ADMIN_SESSION_COOKIE_NAME}=${token}`);
  await handler(
    new Request("http://localhost/resource-verification", { headers }),
    {},
  );
  if (failure !== undefined) throw failure;
  return result as T;
}
async function expectError(
  operation: () => Promise<unknown>,
  code: ResourceErrorCode,
) {
  await assert.rejects(
    operation,
    (error) => error instanceof ResourceApplicationError && error.code === code,
  );
}
async function snapshots() {
  const results: Record<string, { count: number; hash: string }> = {};
  for (const [name, table] of Object.entries({
    newsItems,
    eventItems,
    galleryItems,
    ourWorkItems,
    storyItems,
    inboxThreads,
    inboxMessages,
    adminUsers,
    adminSessions,
  })) {
    const rows = await db.select().from(table).orderBy(table.id);
    results[name] = {
      count: rows.length,
      hash: createHash("sha256").update(JSON.stringify(rows)).digest("hex"),
    };
  }
  return results;
}
async function main() {
  const url = new URL(process.env["DATABASE_URL"]!);
  if (url.hostname === "127.0.0.1" && url.port === "3307") {
    await new Promise<void>((resolve, reject) => {
      const socket = createConnection(3307, "127.0.0.1");
      socket.setTimeout(3000);
      socket.once("connect", () => {
        socket.destroy();
        resolve();
      });
      const fail = () => {
        socket.destroy();
        reject(new Error("DATABASE TUNNEL NOT AVAILABLE"));
      };
      socket.once("error", fail);
      socket.once("timeout", fail);
    });
  }
  assert.equal(
    (await db.select().from(resourceItems)).length,
    0,
    "Requires empty Resources; existing content will not be modified.",
  );
  const before = await snapshots();
  console.log(
    "Starting counts:",
    Object.fromEntries(
      Object.entries(before).map(([name, value]) => [name, value.count]),
    ),
  );
  const metadata: ResourceMetadataInput = {
    slug: `phase-14c-verification-${randomUUID()}`,
    title: "Phase 14C \u0928\u092e\u0938\u094d\u0924\u0947 \ud83c\udf3f",
    excerpt: "Temporary Resource backend verification.",
    content:
      "\u092a\u0939\u093f\u0932\u094b \u0905\u0928\u0941\u091a\u094d\u091b\u0947\u0926\u0964\n\n\u0926\u094b\u0938\u094d\u0930\u094b \u0905\u0928\u0941\u091a\u094d\u091b\u0947\u0926\u0964 \ud83c\udf3f",
    category:
      "\u092e\u093e\u0928\u0938\u093f\u0915 \u0938\u094d\u0935\u093e\u0938\u094d\u0925\u094d\u092f",
    type: "article",
    readingTime: 5,
    sortOrder: 20,
    publishedAt: "2025-02-10",
    reviewedAt: "2026-10-08",
    published: true,
  };
  const id = randomUUID();
  for (const operation of [
    () => createResource(metadata),
    () => updateResourceMetadata({ id, metadata: { title: "x" } }),
    () => deleteResource(id),
    () => getResourcesForAdmin(),
    () => getResourceById(id),
  ]) {
    await expectError(
      () => inRequest<unknown>(undefined, operation),
      "UNAUTHORIZED",
    );
  }
  assert.deepEqual(await getPublishedResources(), []);
  assert.equal(await getPublishedResourceBySlug("missing-resource"), null);
  assert.equal(await getPublishedResourceBySlug("Invalid Slug"), null);
  const [admin] = await db
    .select({ id: adminUsers.id })
    .from(adminUsers)
    .limit(1);
  assert(admin, "An existing admin is required.");
  const session = await createAdminSession(admin.id);
  const ids = new Set<string>();
  const auth = <T>(operation: () => Promise<T>) =>
    inRequest(session.token, operation);
  const create = async (values: unknown) => {
    const item = await auth(() => createResource(values));
    ids.add(item.id);
    return item;
  };
  try {
    assert.deepEqual(await auth(getResourcesForAdmin), []);
    for (const invalid of [
      { title: " " },
      { slug: "UPPER Case" },
      { slug: "x".repeat(192) },
      { excerpt: "" },
      { content: "\n\t " },
      { content: "x".repeat(100001) },
      { category: "" },
      { type: "download" },
      { readingTime: 0 },
      { readingTime: 1.5 },
      { readingTime: "5" },
      { sortOrder: 1.5 },
      { sortOrder: 2147483648 },
      { publishedAt: "2025-02-29" },
      { reviewedAt: "2026-10-08T12:00:00Z" },
      { published: "true" },
      { id: randomUUID() },
      { createdAt: new Date() },
      { updatedAt: new Date() },
      { imageUrl: "https://example.com/file" },
    ])
      await expectError(
        () => create({ ...metadata, ...invalid }),
        "INVALID_RESOURCE_DATA",
      );
    const item = await create({
      ...metadata,
      content: `  ${metadata.content}\n `,
    });
    assert.match(item.id, /^[a-f0-9-]{36}$/);
    assert.equal(item.content, metadata.content);
    assert.equal(item.title, metadata.title);
    assert.equal(item.category, metadata.category);
    assert.equal(item.publishedAt, metadata.publishedAt);
    assert.equal(item.reviewedAt, metadata.reviewedAt);
    assert(item.createdAt instanceof Date && item.updatedAt instanceof Date);
    assert.deepEqual(await auth(() => getResourceById(item.id)), item);
    const publicItem = await getPublishedResourceBySlug(item.slug);
    assert(publicItem);
    assert.equal(publicItem.content, item.content);
    assert(!("updatedAt" in publicItem));
    assert(!("published" in publicItem));
    await setTimeout(1100);
    const edited = await auth(() =>
      updateResourceMetadata({
        id: item.id,
        metadata: { title: "Changed title", content: metadata.content },
      }),
    );
    assert.equal(edited.id, item.id);
    assert.equal(edited.slug, item.slug);
    assert.equal(edited.createdAt.getTime(), item.createdAt.getTime());
    assert(edited.updatedAt.getTime() > item.updatedAt.getTime());
    const changed = await auth(() =>
      updateResourceMetadata({
        id: item.id,
        metadata: { slug: `${item.slug}-updated` },
      }),
    );
    assert.equal(changed.id, item.id);
    assert.equal(await getPublishedResourceBySlug(item.slug), null);
    const earlier = await create({
      ...metadata,
      slug: `${metadata.slug}-earlier`,
      type: "guide",
      sortOrder: "10",
      publishedAt: "2030-01-01",
    });
    const tied = await create({
      ...metadata,
      slug: `${metadata.slug}-tie`,
      sortOrder: 10,
      publishedAt: "2000-01-01",
    });
    const unordered = await create({
      ...metadata,
      slug: `${metadata.slug}-unordered`,
      sortOrder: null,
      readingTime: null,
      publishedAt: null,
      reviewedAt: null,
    });
    const expectedTie = [earlier, tied]
      .sort(
        (a, b) =>
          b.createdAt.getTime() - a.createdAt.getTime() ||
          a.id.localeCompare(b.id),
      )
      .map((r) => r.id);
    assert.deepEqual(
      (await getPublishedResources()).map((r) => r.id),
      [...expectedTie, item.id, unordered.id],
    );
    assert.deepEqual(
      await getPublishedResources(),
      await getPublishedResources(),
    );
    await expectError(
      () => create({ ...metadata, slug: changed.slug }),
      "SLUG_ALREADY_EXISTS",
    );
    await expectError(
      () =>
        auth(() =>
          updateResourceMetadata({
            id: earlier.id,
            metadata: { slug: changed.slug },
          }),
        ),
      "SLUG_ALREADY_EXISTS",
    );
    assert.deepEqual(await auth(() => getResourceById(earlier.id)), earlier);
    for (const patch of [
      {},
      { id: randomUUID() },
      { createdAt: new Date() },
      { updatedAt: new Date() },
      { title: null },
      { published: null },
    ]) {
      await expectError(
        () =>
          auth(() => updateResourceMetadata({ id: item.id, metadata: patch })),
        "INVALID_RESOURCE_DATA",
      );
    }
    await expectError(
      () =>
        auth(() =>
          updateResourceMetadata({
            id: item.id,
            metadata: { title: "x" },
            extra: true,
          }),
        ),
      "INVALID_RESOURCE_DATA",
    );
    await auth(() =>
      updateResourceMetadata({ id: item.id, metadata: { published: false } }),
    );
    assert.equal(await getPublishedResourceBySlug(changed.slug), null);
    assert(!(await getPublishedResources()).some((r) => r.id === item.id));
    assert(
      (await auth(getResourcesForAdmin)).some(
        (r) => r.id === item.id && !r.published,
      ),
    );
    await auth(() =>
      updateResourceMetadata({
        id: item.id,
        metadata: {
          published: true,
          readingTime: null,
          reviewedAt: null,
          publishedAt: null,
          sortOrder: null,
        },
      }),
    );
    assert(await getPublishedResourceBySlug(changed.slug));
    const longContent =
      "Long paragraph. ".repeat(5000) + "\n\nSecond paragraph.";
    const long = await auth(() =>
      updateResourceMetadata({
        id: item.id,
        metadata: { content: longContent },
      }),
    );
    assert.equal(long.content, longContent);
    await expectError(
      () =>
        auth(() => updateResourceMetadata({ id, metadata: { title: "x" } })),
      "NOT_FOUND",
    );
    await expectError(() => auth(() => deleteResource(id)), "NOT_FOUND");
    assert.equal(await auth(() => getResourceById(id)), null);
    const client = getDb();
    const original = client.transaction;
    client.transaction = async () => {
      throw new Error("private simulated SQL failure");
    };
    try {
      await expectError(() => create(metadata), "SAVE_FAILED");
      await expectError(
        () =>
          auth(() =>
            updateResourceMetadata({ id: item.id, metadata: { title: "x" } }),
          ),
        "UPDATE_FAILED",
      );
      await expectError(
        () => auth(() => deleteResource(item.id)),
        "DELETE_FAILED",
      );
    } finally {
      client.transaction = original;
    }
    const fallback = toResourceFailure(new Error("private SQL details"), {
      code: "SAVE_FAILED",
      message: "Unable to save Resource.",
    });
    assert.equal(fallback.error, "Unable to save Resource.");
    for (const resourceId of [...ids]) {
      await auth(() => deleteResource(resourceId));
      ids.delete(resourceId);
      assert.equal(await auth(() => getResourceById(resourceId)), null);
    }
    assert.deepEqual(await getPublishedResources(), []);
    console.log(
      "PASS: auth, validation, CRUD, stable/edited slugs, publication, ordering/ties/nulls, Unicode/paragraphs/long content, timestamps, safe DB failures",
    );
  } finally {
    for (const resourceId of ids)
      await db.delete(resourceItems).where(eq(resourceItems.id, resourceId));
    await deleteAdminSession(session.token);
  }
  assert.equal((await db.select().from(resourceItems)).length, 0);
  const after = await snapshots();
  assert.deepEqual(after, before);
  assert.equal(resourceMetadataSchema.parse(metadata).published, true);
  console.log(
    "PASS: Resources=0; all original content/Inbox/auth snapshots unchanged; temporary session removed",
  );
}
main()
  .finally(closeDb)
  .catch(() => {
    console.error(
      "Resource verification failed; inspect assertions in the harness. Cleanup was attempted.",
    );
    process.exitCode = 1;
  });
