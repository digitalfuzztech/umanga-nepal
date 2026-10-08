// Manual lifecycle verification. Never run during install, build, deployment or server boot.
import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createConnection } from "node:net";
import { requestHandler } from "@tanstack/react-start/server";
import { eq } from "drizzle-orm";
import {
  ADMIN_SESSION_COOKIE_NAME,
  createAdminSession,
  deleteAdminSession,
} from "../src/server/auth";
import { db, closeDb, getDb } from "../src/server/db";
import {
  adminSessions,
  adminUsers,
  galleryItems,
  ourWorkItems,
  storyItems,
} from "../src/server/db/schema";
import {
  createStory,
  deleteStory,
  getStoriesForAdmin,
  getStoryById,
  getPublishedStories,
  getPublishedStoryBySlug,
  replaceStoryImage,
  StoryApplicationError,
  storyMetadataSchema,
  storyMetadataUpdateSchema,
  storyImageFromFile,
  toStoryFailure,
  updateStoryMetadata,
} from "../src/server/stories";
import {
  deleteMedia,
  MAX_IMAGE_SIZE_BYTES,
  mediaExists,
} from "../src/server/storage";

async function requireTunnel() {
  const configured = process.env["DATABASE_URL"];
  assert(configured, "Database configuration is required.");
  const url = new URL(configured);
  if (url.hostname !== "127.0.0.1" || url.port !== "3307") return;
  await new Promise<void>((resolve, reject) => {
    const socket = createConnection({ host: "127.0.0.1", port: 3307 });
    socket.setTimeout(3000);
    socket.once("connect", () => {
      socket.destroy();
      resolve();
    });
    const failed = () => {
      socket.destroy();
      reject(new Error("DATABASE TUNNEL NOT AVAILABLE"));
    };
    socket.once("error", failed);
    socket.once("timeout", failed);
  });
}
async function inRequest<T>(
  token: string | undefined,
  operation: () => Promise<T>,
): Promise<T> {
  const state: { result?: T; error?: unknown } = {};
  const handler = requestHandler(async () => {
    try {
      state.result = await operation();
    } catch (error) {
      state.error = error;
    }
    return new Response(null, { status: 204 });
  });
  const headers = new Headers();
  if (token) headers.set("cookie", `${ADMIN_SESSION_COOKIE_NAME}=${token}`);
  await handler(
    new Request("http://localhost/stories-verification", { headers }),
    {},
  );
  if (state.error !== undefined) throw state.error;
  return state.result as T;
}
async function expectError(
  operation: () => Promise<unknown>,
  code: StoryApplicationError["code"],
) {
  await assert.rejects(
    operation,
    (error) => error instanceof StoryApplicationError && error.code === code,
  );
}

async function main() {
  await requireTunnel();
  assert.equal(
    (await db.select().from(storyItems)).length,
    0,
    "Verification requires an empty Stories table; no existing content will be changed.",
  );
  const galleryBefore = await db
    .select()
    .from(galleryItems)
    .orderBy(galleryItems.id);
  const workBefore = await db
    .select()
    .from(ourWorkItems)
    .orderBy(ourWorkItems.id);
  const sessionsBefore = await db
    .select({ id: adminSessions.id })
    .from(adminSessions);
  assert.equal(workBefore.length, 8);
  const [admin] = await db
    .select({ id: adminUsers.id })
    .from(adminUsers)
    .limit(1);
  assert(admin, "Verification requires an existing admin.");
  const session = await createAdminSession(admin.id);
  const createdIds = new Set<string>();
  const keys = new Set<string>();
  const fetchOriginal = globalThis.fetch;
  const databaseClient = getDb();
  const transactionOriginal = databaseClient.transaction;
  const mediaBase = new URL(process.env["MEDIA_PUBLIC_BASE_URL"]!);
  const mediaPrefix = mediaBase.pathname.endsWith("/")
    ? mediaBase.pathname
    : `${mediaBase.pathname}/`;
  // Track this process's verification uploads, including compensated failed saves.
  globalThis.fetch = async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    if (
      url.origin === mediaBase.origin &&
      url.pathname.startsWith(mediaPrefix)
    ) {
      const key = decodeURIComponent(url.pathname.slice(mediaPrefix.length));
      if (key.startsWith("stories/")) keys.add(key);
    }
    return fetchOriginal(input, init);
  };
  let cleanupFailed = false;
  const authenticated = <T>(operation: () => Promise<T>) =>
    inRequest(session.token, operation);
  try {
    const image = {
      buffer: await readFile("src/assets/program-art.jpg"),
      mimeType: "image/jpeg",
    };
    const secondImage = {
      buffer: await readFile("src/assets/program-awareness.jpg"),
      mimeType: "image/jpeg",
    };
    const metadata = storyMetadataSchema.parse({
      slug: "stories-backend-verification",
      title: "मेरो मानसिक स्वास्थ्य यात्रा 🌿",
      excerpt: "Temporary Story backend verification content.",
      content:
        "पहिलो अनुच्छेद परीक्षण सामग्री।\n\nदोस्रो अनुच्छेदले paragraph preservation जाँच गर्छ।",
      category: "Personal Story",
      attribution: "उमङ्ग नेपाल",
      storyDate: "2026-10-08",
      demoContent: true,
      published: true,
      sortOrder: 10,
    });
    for (const slug of [
      "Mental Health",
      "mental_health",
      "mental--health",
      "-mental-health",
      "mental-health-",
      "नेपाली",
      " ",
    ])
      assert(!storyMetadataSchema.safeParse({ ...metadata, slug }).success);
    for (const storyDate of [
      "2025-02-29",
      "1900-02-29",
      "2026-04-31",
      "0000-01-01",
      "2026-1-01",
    ])
      assert(
        !storyMetadataSchema.safeParse({ ...metadata, storyDate }).success,
      );
    for (const storyDate of ["2024-02-29", "2000-02-29", "2026-10-08"])
      assert(storyMetadataSchema.safeParse({ ...metadata, storyDate }).success);
    const normalized = storyMetadataSchema.parse({
      ...metadata,
      title: ` ${metadata.title} `,
      content: `\n ${metadata.content} \n`,
      storyDate: " ",
      sortOrder: " ",
    });
    assert.equal(normalized.title, metadata.title);
    assert.equal(normalized.content, metadata.content);
    assert.equal(normalized.storyDate, null);
    assert.equal(normalized.sortOrder, null);
    assert(
      !storyMetadataUpdateSchema.safeParse({
        imageUrl: "https://example.invalid/image.jpg",
      }).success,
    );
    assert.equal(
      storyMetadataSchema.parse({
        ...metadata,
        published: undefined,
        demoContent: undefined,
      }).published,
      true,
    );
    assert.equal(
      storyMetadataSchema.parse({ ...metadata, demoContent: undefined })
        .demoContent,
      false,
    );
    assert.deepEqual(await authenticated(getStoriesForAdmin), []);
    assert.deepEqual(await getPublishedStories(), []);
    const unknownId = randomUUID();
    assert.equal(await authenticated(() => getStoryById(unknownId)), null);
    assert.equal(await getPublishedStoryBySlug("unknown-story"), null);
    assert.equal(await getPublishedStoryBySlug("Invalid Slug"), null);
    for (const operation of [
      () => getStoriesForAdmin(),
      () => getStoryById(unknownId),
      () => createStory({ metadata, image }),
      () =>
        updateStoryMetadata({ id: unknownId, metadata: { title: "Changed" } }),
      () => replaceStoryImage({ id: unknownId, image }),
      () => deleteStory(unknownId),
    ])
      await expectError(
        () => inRequest<unknown>(undefined, operation),
        "UNAUTHORIZED",
      );
    for (const operation of [
      () =>
        updateStoryMetadata({ id: unknownId, metadata: { title: "Changed" } }),
      () => replaceStoryImage({ id: unknownId, image }),
      () => deleteStory(unknownId),
    ])
      await expectError(() => authenticated<unknown>(operation), "NOT_FOUND");
    console.log(
      "Validation, empty queries, unknown lookups and all six admin authorization checks: PASS",
    );

    const fileImage = await storyImageFromFile(
      new File([new Uint8Array(image.buffer)], "verification.jpg", {
        type: image.mimeType,
      }),
    );
    assert.deepEqual(fileImage, image);
    await expectError(
      () =>
        storyImageFromFile(new File([], "empty.png", { type: "image/png" })),
      "INVALID_IMAGE",
    );
    await expectError(
      () =>
        storyImageFromFile(
          new File([new Uint8Array(MAX_IMAGE_SIZE_BYTES + 1)], "large.png", {
            type: "image/png",
          }),
        ),
      "FILE_TOO_LARGE",
    );
    const created = await authenticated(() => createStory({ metadata, image }));
    createdIds.add(created.id);
    keys.add(created.imageStorageKey);
    assert.match(
      created.id,
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    for (const [field, value] of Object.entries(metadata))
      assert.deepEqual(created[field as keyof typeof created], value);
    const [fromDb] = await db
      .select()
      .from(storyItems)
      .where(eq(storyItems.id, created.id));
    assert.deepEqual(fromDb, created);
    assert(await mediaExists(created.imageStorageKey));
    assert.match(
      created.imageStorageKey,
      /^stories\/\d{4}\/\d{2}\/[0-9a-f-]+\.jpg$/,
    );
    const response = await fetch(created.imageUrl);
    assert(
      response.ok &&
        response.url.startsWith("https:") &&
        response.headers.get("content-type")?.startsWith("image/"),
    );
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), image.buffer);
    const publicItem = await getPublishedStoryBySlug(created.slug);
    assert(publicItem);
    assert.deepEqual(
      Object.keys(publicItem).sort(),
      [
        "id",
        "slug",
        "title",
        "excerpt",
        "content",
        "category",
        "attribution",
        "imageUrl",
        "storyDate",
        "demoContent",
        "sortOrder",
        "createdAt",
      ].sort(),
    );
    console.log(
      "Real create, UUID, exact fields, Nepali/emoji/paragraph round-trip, FTPS and HTTPS bytes: PASS",
    );

    const title = "मेरो मानसिक स्वास्थ्यको नयाँ यात्रा 🌿";
    const titleUpdated = await authenticated(() =>
      updateStoryMetadata({ id: created.id, metadata: { title } }),
    );
    assert.equal(titleUpdated.slug, metadata.slug);
    assert.equal(titleUpdated.title, title);
    assert.equal(titleUpdated.imageStorageKey, created.imageStorageKey);
    assert.equal(titleUpdated.createdAt.getTime(), created.createdAt.getTime());
    const slug = "stories-backend-verification-updated";
    const edited = await authenticated(() =>
      updateStoryMetadata({
        id: created.id,
        metadata: { slug, storyDate: "", demoContent: false, sortOrder: "" },
      }),
    );
    assert.equal(edited.id, created.id);
    assert.equal(edited.storyDate, null);
    assert.equal(edited.sortOrder, null);
    assert.equal(edited.demoContent, false);
    const keysBeforeDuplicate = keys.size;
    await expectError(
      () =>
        authenticated(() =>
          createStory({ metadata: { ...metadata, slug }, image }),
        ),
      "SLUG_ALREADY_EXISTS",
    );
    assert.equal(keys.size, keysBeforeDuplicate);
    assert.equal((await db.select().from(storyItems)).length, 1);
    await authenticated(() =>
      updateStoryMetadata({
        id: created.id,
        metadata: { published: false, demoContent: true },
      }),
    );
    assert.deepEqual(await getPublishedStories(), []);
    assert.equal(await getPublishedStoryBySlug(slug), null);
    const republished = await authenticated(() =>
      updateStoryMetadata({ id: created.id, metadata: { published: true } }),
    );
    assert(republished.demoContent);
    assert.equal((await getPublishedStories())[0]?.id, created.id);
    assert.equal((await getPublishedStoryBySlug(slug))?.id, created.id);
    console.log(
      "Title/slug independence, explicit slug edit, date/order NULL, demo flag, duplicate precheck and publication filtering: PASS",
    );

    // Force failures after verified upload without touching another process or table.
    databaseClient.transaction = async () => {
      throw new Error("Verification transaction failure");
    };
    const keysBeforeFailure = new Set(keys);
    try {
      await expectError(
        () =>
          authenticated(async () => {
            const unexpected = await createStory({
              metadata: { ...metadata, slug: "stories-backend-compensation" },
              image,
            });
            createdIds.add(unexpected.id);
            keys.add(unexpected.imageStorageKey);
            return unexpected;
          }),
        "SAVE_FAILED",
      );
      await expectError(
        () =>
          authenticated(() =>
            replaceStoryImage({ id: created.id, image: secondImage }),
          ),
        "UPDATE_FAILED",
      );
    } finally {
      databaseClient.transaction = transactionOriginal;
    }
    const compensatedKeys = [...keys].filter(
      (key) => !keysBeforeFailure.has(key),
    );
    assert.equal(compensatedKeys.length, 2);
    for (const key of compensatedKeys) assert(!(await mediaExists(key)));
    assert.equal(
      (await authenticated(() => getStoryById(created.id)))?.imageStorageKey,
      created.imageStorageKey,
    );
    console.log(
      "Post-upload create/update failure compensation: PASS; both new objects removed, old references intact",
    );

    const invalidImage = {
      buffer: Buffer.from("Harmless text renamed as PNG"),
      mimeType: "image/png",
    };
    await expectError(
      () =>
        authenticated(() =>
          replaceStoryImage({ id: created.id, image: invalidImage }),
        ),
      "INVALID_IMAGE",
    );
    await expectError(
      () =>
        authenticated(() =>
          createStory({
            metadata: { ...metadata, slug: "invalid-image-verification" },
            image: invalidImage,
          }),
        ),
      "INVALID_IMAGE",
    );
    assert.equal(
      (await authenticated(() => getStoryById(created.id)))?.imageStorageKey,
      created.imageStorageKey,
    );
    const replacement = await authenticated(() =>
      replaceStoryImage({ id: created.id, image: secondImage }),
    );
    keys.add(replacement.item.imageStorageKey);
    assert.equal(replacement.item.id, created.id);
    assert.notEqual(replacement.item.imageStorageKey, created.imageStorageKey);
    assert.notEqual(replacement.item.imageUrl, created.imageUrl);
    assert(!replacement.cleanupWarning);
    assert(await mediaExists(replacement.item.imageStorageKey));
    assert(!(await mediaExists(created.imageStorageKey)));
    const replacementResponse = await fetch(replacement.item.imageUrl);
    assert(
      replacementResponse.ok &&
        replacementResponse.headers.get("content-type")?.startsWith("image/"),
    );
    assert.deepEqual(
      Buffer.from(await replacementResponse.arrayBuffer()),
      secondImage.buffer,
    );
    const deletion = await authenticated(() => deleteStory(created.id));
    assert(deletion.deleted && !deletion.cleanupWarning);
    assert.equal(await authenticated(() => getStoryById(created.id)), null);
    assert(!(await mediaExists(replacement.item.imageStorageKey)));
    createdIds.delete(created.id);
    assert.deepEqual(await db.select().from(storyItems), []);
    assert.deepEqual(
      await db.select().from(galleryItems).orderBy(galleryItems.id),
      galleryBefore,
    );
    assert.deepEqual(
      await db.select().from(ourWorkItems).orderBy(ourWorkItems.id),
      workBefore,
    );
    assert.deepEqual(
      toStoryFailure(
        new StoryApplicationError("INVALID_STORY_DATA", "Invalid Story data."),
        { code: "SAVE_FAILED", message: "Unable to save Story." },
      ),
      {
        success: false,
        code: "INVALID_STORY_DATA",
        error: "Invalid Story data.",
      },
    );
    console.log(
      JSON.stringify({
        result: "PASS",
        invalidSignatureRejected: true,
        replacementAndOldMediaCleanup: true,
        deleteAndMediaCleanup: true,
        finalStoryCount: 0,
        galleryCount: galleryBefore.length,
        ourWorkCount: workBefore.length,
        otherContentUnchanged: true,
      }),
    );
  } finally {
    databaseClient.transaction = transactionOriginal;
    globalThis.fetch = fetchOriginal;
    for (const id of createdIds) {
      try {
        const item = await authenticated(() => getStoryById(id));
        if (item) keys.add(item.imageStorageKey);
        const result = await authenticated(() => deleteStory(id));
        if (result.cleanupWarning) cleanupFailed = true;
      } catch {
        try {
          await db.delete(storyItems).where(eq(storyItems.id, id));
        } catch {
          cleanupFailed = true;
        }
      }
    }
    for (const key of keys) {
      try {
        await deleteMedia(key);
        if (await mediaExists(key)) cleanupFailed = true;
      } catch {
        cleanupFailed = true;
      }
    }
    await deleteAdminSession(session.token);
    const sessionsAfter = await db
      .select({ id: adminSessions.id })
      .from(adminSessions);
    assert(
      sessionsBefore.every((row) =>
        sessionsAfter.some((candidate) => candidate.id === row.id),
      ),
      "Existing admin sessions were not preserved.",
    );
    const finalRows = await db.select().from(storyItems);
    console.log(
      JSON.stringify({
        finalStoryCount: finalRows.length,
        verificationMediaCleanup: cleanupFailed ? "WARNING" : "PASS",
        temporarySessionRemoved: sessionsAfter.length === sessionsBefore.length,
      }),
    );
    assert.equal(finalRows.length, 0);
    assert(!cleanupFailed, "Verification cleanup was incomplete.");
  }
}
main()
  .catch((error) => {
    console.error(
      error instanceof Error &&
        error.message === "DATABASE TUNNEL NOT AVAILABLE"
        ? error.message
        : "Stories backend verification failed; credentials and raw errors were not logged.",
    );
    process.exitCode = 1;
  })
  .finally(closeDb);
