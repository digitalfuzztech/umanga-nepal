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
  newsItems,
  eventItems,
  storyItems,
  inboxThreads,
  inboxMessages,
} from "../src/server/db/schema";
import {
  createNews,
  deleteNews,
  getNewsForAdmin,
  getNewsById,
  getPublishedNews,
  getPublishedNewsBySlug,
  replaceNewsImage,
  NewsApplicationError,
  newsMetadataSchema,
  newsMetadataUpdateSchema,
  newsImageFromFile,
  toNewsFailure,
  updateNewsMetadata,
} from "../src/server/news";
import {
  createEvent,
  updateEvent,
  deleteEvent,
  getEventById,
  getEventsForAdmin,
  getPublishedEvents,
  getNearestEligibleEvent,
  eventMetadataSchema,
  EventApplicationError,
} from "../src/server/events";
import { getKathmanduDate } from "../src/server/news-events/validation";
import { createHash } from "node:crypto";
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
    new Request("http://localhost/news-verification", { headers }),
    {},
  );
  if (state.error !== undefined) throw state.error;
  return state.result as T;
}
async function expectError(
  operation: () => Promise<unknown>,
  code: NewsApplicationError["code"],
) {
  await assert.rejects(
    operation,
    (error) => error instanceof NewsApplicationError && error.code === code,
  );
}

async function main() {
  await requireTunnel();
  assert.equal(
    (await db.select().from(newsItems)).length,
    0,
    "Verification requires an empty News table; no existing content will be changed.",
  );
  const galleryBefore = await db
    .select()
    .from(galleryItems)
    .orderBy(galleryItems.id);
  const workBefore = await db
    .select()
    .from(ourWorkItems)
    .orderBy(ourWorkItems.id);
  const storiesBefore = await db
    .select()
    .from(storyItems)
    .orderBy(storyItems.id);
  const threadsBefore = await db
    .select()
    .from(inboxThreads)
    .orderBy(inboxThreads.id);
  const messagesBefore = await db
    .select()
    .from(inboxMessages)
    .orderBy(inboxMessages.id);
  assert.equal(
    (await db.select().from(eventItems)).length,
    0,
    "Events must be empty before verification.",
  );
  const eventIds = new Set<string>();
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
      if (key.startsWith("news/")) keys.add(key);
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
    const metadata = newsMetadataSchema.parse({
      slug: "news-backend-verification",
      title: "मेरो मानसिक स्वास्थ्य यात्रा 🌿",
      excerpt: "Temporary News backend verification content.",
      content:
        "पहिलो अनुच्छेद परीक्षण सामग्री।\n\nदोस्रो अनुच्छेदले paragraph preservation जाँच गर्छ।",
      category: "Personal News",
      location: "काठमाडौं",
      newsDate: "2026-10-08",
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
      assert(!newsMetadataSchema.safeParse({ ...metadata, slug }).success);
    for (const newsDate of [
      "2025-02-29",
      "1900-02-29",
      "2026-04-31",
      "0000-01-01",
      "2026-1-01",
    ])
      assert(!newsMetadataSchema.safeParse({ ...metadata, newsDate }).success);
    for (const newsDate of ["2024-02-29", "2000-02-29", "2026-10-08"])
      assert(newsMetadataSchema.safeParse({ ...metadata, newsDate }).success);
    const normalized = newsMetadataSchema.parse({
      ...metadata,
      title: ` ${metadata.title} `,
      content: `\n ${metadata.content} \n`,
      newsDate: "2026-10-08",
      sortOrder: " ",
    });
    assert.equal(normalized.title, metadata.title);
    assert.equal(normalized.content, metadata.content);
    assert.equal(normalized.newsDate, "2026-10-08");
    assert.equal(normalized.sortOrder, null);
    assert(
      !newsMetadataUpdateSchema.safeParse({
        imageUrl: "https://example.invalid/image.jpg",
      }).success,
    );
    assert.equal(
      newsMetadataSchema.parse({
        ...metadata,
        published: undefined,
        demoContent: undefined,
      }).published,
      true,
    );
    assert.equal(
      newsMetadataSchema.parse({ ...metadata, demoContent: undefined })
        .demoContent,
      false,
    );
    assert.deepEqual(await authenticated(getNewsForAdmin), []);
    assert.deepEqual(await getPublishedNews(), []);
    const unknownId = randomUUID();
    assert.equal(await authenticated(() => getNewsById(unknownId)), null);
    assert.equal(await getPublishedNewsBySlug("unknown-news"), null);
    assert.equal(await getPublishedNewsBySlug("Invalid Slug"), null);
    for (const operation of [
      () => getNewsForAdmin(),
      () => getNewsById(unknownId),
      () => createNews({ metadata, image }),
      () =>
        updateNewsMetadata({ id: unknownId, metadata: { title: "Changed" } }),
      () => replaceNewsImage({ id: unknownId, image }),
      () => deleteNews(unknownId),
    ])
      await expectError(
        () => inRequest<unknown>(undefined, operation),
        "UNAUTHORIZED",
      );
    for (const operation of [
      () =>
        updateNewsMetadata({ id: unknownId, metadata: { title: "Changed" } }),
      () => replaceNewsImage({ id: unknownId, image }),
      () => deleteNews(unknownId),
    ])
      await expectError(() => authenticated<unknown>(operation), "NOT_FOUND");
    console.log(
      "Validation, empty queries, unknown lookups and all six admin authorization checks: PASS",
    );

    const fileImage = await newsImageFromFile(
      new File([new Uint8Array(image.buffer)], "verification.jpg", {
        type: image.mimeType,
      }),
    );
    assert.deepEqual(fileImage, image);
    await expectError(
      () => newsImageFromFile(new File([], "empty.png", { type: "image/png" })),
      "INVALID_IMAGE",
    );
    await expectError(
      () =>
        newsImageFromFile(
          new File([new Uint8Array(MAX_IMAGE_SIZE_BYTES + 1)], "large.png", {
            type: "image/png",
          }),
        ),
      "FILE_TOO_LARGE",
    );
    const created = await authenticated(() => createNews({ metadata, image }));
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
      .from(newsItems)
      .where(eq(newsItems.id, created.id));
    assert.deepEqual(fromDb, created);
    assert(await mediaExists(created.imageStorageKey));
    assert.match(
      created.imageStorageKey,
      /^news\/\d{4}\/\d{2}\/[0-9a-f-]+\.jpg$/,
    );
    const response = await fetch(created.imageUrl);
    assert(
      response.ok &&
        response.url.startsWith("https:") &&
        response.headers.get("content-type")?.startsWith("image/"),
    );
    const uploadedBytes = Buffer.from(await response.arrayBuffer());
    assert.deepEqual(uploadedBytes, image.buffer);
    console.log(
      "News source/upload SHA-256:",
      createHash("sha256").update(uploadedBytes).digest("hex"),
    );
    const publicItem = await getPublishedNewsBySlug(created.slug);
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
        "location",
        "imageUrl",
        "newsDate",
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
      updateNewsMetadata({ id: created.id, metadata: { title } }),
    );
    assert.equal(titleUpdated.slug, metadata.slug);
    assert.equal(titleUpdated.title, title);
    assert.equal(titleUpdated.imageStorageKey, created.imageStorageKey);
    assert.equal(titleUpdated.createdAt.getTime(), created.createdAt.getTime());
    const slug = "news-backend-verification-updated";
    const edited = await authenticated(() =>
      updateNewsMetadata({
        id: created.id,
        metadata: {
          slug,
          newsDate: "2026-11-01",
          demoContent: false,
          sortOrder: "",
        },
      }),
    );
    assert.equal(edited.id, created.id);
    assert.equal(edited.newsDate, "2026-11-01");
    assert.equal(edited.sortOrder, null);
    assert.equal(edited.demoContent, false);
    const keysBeforeDuplicate = keys.size;
    await expectError(
      () =>
        authenticated(() =>
          createNews({ metadata: { ...metadata, slug }, image }),
        ),
      "SLUG_ALREADY_EXISTS",
    );
    assert.equal(keys.size, keysBeforeDuplicate);
    assert.equal((await db.select().from(newsItems)).length, 1);
    await authenticated(() =>
      updateNewsMetadata({
        id: created.id,
        metadata: { published: false, demoContent: true },
      }),
    );
    assert.deepEqual(await getPublishedNews(), []);
    assert.equal(await getPublishedNewsBySlug(slug), null);
    const republished = await authenticated(() =>
      updateNewsMetadata({ id: created.id, metadata: { published: true } }),
    );
    assert(republished.demoContent);
    assert.equal((await getPublishedNews())[0]?.id, created.id);
    assert.equal((await getPublishedNewsBySlug(slug))?.id, created.id);
    console.log(
      "Title/slug independence, explicit slug edit, date round-trip/order NULL, demo flag, duplicate precheck and publication filtering: PASS",
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
            const unexpected = await createNews({
              metadata: { ...metadata, slug: "news-backend-compensation" },
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
            replaceNewsImage({ id: created.id, image: secondImage }),
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
      (await authenticated(() => getNewsById(created.id)))?.imageStorageKey,
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
          replaceNewsImage({ id: created.id, image: invalidImage }),
        ),
      "INVALID_IMAGE",
    );
    await expectError(
      () =>
        authenticated(() =>
          createNews({
            metadata: { ...metadata, slug: "invalid-image-verification" },
            image: invalidImage,
          }),
        ),
      "INVALID_IMAGE",
    );
    assert.equal(
      (await authenticated(() => getNewsById(created.id)))?.imageStorageKey,
      created.imageStorageKey,
    );
    const replacement = await authenticated(() =>
      replaceNewsImage({ id: created.id, image: secondImage }),
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
    const deletion = await authenticated(() => deleteNews(created.id));
    assert(deletion.deleted && !deletion.cleanupWarning);
    assert.equal(await authenticated(() => getNewsById(created.id)), null);
    assert(!(await mediaExists(replacement.item.imageStorageKey)));
    createdIds.delete(created.id);
    assert.deepEqual(await db.select().from(newsItems), []);
    assert.deepEqual(
      await db.select().from(galleryItems).orderBy(galleryItems.id),
      galleryBefore,
    );
    assert.deepEqual(
      await db.select().from(ourWorkItems).orderBy(ourWorkItems.id),
      workBefore,
    );

    const eventMetadata = eventMetadataSchema.parse({
      slug: "event-backend-verification",
      title: "मानसिक स्वास्थ्य कार्यक्रम 🌿",
      summary: "Temporary Event backend verification.",
      category: "Workshop",
      eventStart: "2027-01-15",
      location: "काठमाडौं",
      registrationOpen: true,
      published: true,
      demoContent: true,
      sortOrder: 10,
    });
    const eventError = async (
      operation: () => Promise<unknown>,
      code: EventApplicationError["code"],
    ) => {
      await assert.rejects(
        operation,
        (error) =>
          error instanceof EventApplicationError && error.code === code,
      );
    };
    assert.deepEqual(await authenticated(getEventsForAdmin), []);
    assert.deepEqual(await getPublishedEvents(), []);
    assert.equal(await getNearestEligibleEvent(), null);
    for (const operation of [
      () => getEventsForAdmin(),
      () => getEventById(unknownId),
      () => createEvent(eventMetadata),
      () => updateEvent({ id: unknownId, metadata: { title: "Changed" } }),
      () => deleteEvent(unknownId),
    ])
      await eventError(
        () => inRequest<unknown>(undefined, operation),
        "UNAUTHORIZED",
      );
    for (const invalid of [
      "2026-02-29",
      "2026-04-31",
      "2026-1-01",
      "0000-01-01",
      "2026-10-10T12:00:00",
      "",
    ]) {
      assert(
        !eventMetadataSchema.safeParse({
          ...eventMetadata,
          eventStart: invalid,
        }).success,
      );
    }
    assert(
      !eventMetadataSchema.safeParse({ ...eventMetadata, status: "upcoming" })
        .success,
    );
    assert(
      !eventMetadataSchema.safeParse({
        ...eventMetadata,
        imageUrl: "https://example.invalid",
      }).success,
    );
    assert(
      !eventMetadataSchema.safeParse({
        ...eventMetadata,
        slug: "invalid--slug",
      }).success,
    );
    const event = await authenticated(() => createEvent(eventMetadata));
    eventIds.add(event.id);
    assert.match(
      event.id,
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    for (const [field, value] of Object.entries(eventMetadata))
      assert.deepEqual(event[field as keyof typeof event], value);
    assert.deepEqual(
      (
        await db.select().from(eventItems).where(eq(eventItems.id, event.id))
      )[0],
      event,
    );
    const changedTitle = await authenticated(() =>
      updateEvent({ id: event.id, metadata: { title: "नयाँ कार्यक्रम 🌿" } }),
    );
    assert.equal(changedTitle.slug, event.slug);
    assert.equal(changedTitle.createdAt.getTime(), event.createdAt.getTime());
    const changedSlug = await authenticated(() =>
      updateEvent({
        id: event.id,
        metadata: { slug: "event-backend-verification-updated" },
      }),
    );
    assert.equal(changedSlug.id, event.id);
    await eventError(
      () =>
        authenticated(() =>
          createEvent({ ...eventMetadata, slug: changedSlug.slug }),
        ),
      "SLUG_ALREADY_EXISTS",
    );
    assert.equal((await db.select().from(eventItems)).length, 1);
    await authenticated(() =>
      updateEvent({ id: event.id, metadata: { published: false } }),
    );
    assert.deepEqual(await getPublishedEvents(), []);
    assert.equal(await getNearestEligibleEvent(), null);
    await authenticated(() =>
      updateEvent({ id: event.id, metadata: { published: true } }),
    );
    assert.equal((await getPublishedEvents())[0]?.id, event.id);
    for (const registrationOpen of [false, true]) {
      const toggled = await authenticated(() =>
        updateEvent({ id: event.id, metadata: { registrationOpen } }),
      );
      assert.equal(toggled.registrationOpen, registrationOpen);
      assert.equal(toggled.eventStart, eventMetadata.eventStart);
    }
    const newDate = await authenticated(() =>
      updateEvent({ id: event.id, metadata: { eventStart: "2027-02-01" } }),
    );
    assert.equal(newDate.eventStart, "2027-02-01");
    assert.equal(
      (await db.select().from(eventItems).where(eq(eventItems.id, event.id)))[0]
        ?.eventStart,
      "2027-02-01",
    );
    assert.deepEqual(await authenticated(() => deleteEvent(event.id)), {
      deleted: true,
    });
    eventIds.delete(event.id);
    assert.equal(await authenticated(() => getEventById(event.id)), null);
    console.log(
      "Event empty/auth/create/Unicode/date/title-slug/duplicate/publication/registration/update/delete: PASS",
    );

    const today = getKathmanduDate();
    assert.equal(
      getKathmanduDate(new Date("2026-10-08T18:14:59Z")),
      "2026-10-08",
    );
    assert.equal(
      getKathmanduDate(new Date("2026-10-08T18:15:00Z")),
      "2026-10-09",
    );
    const offsetDate = (offset: number) =>
      new Date(Date.parse(today + "T00:00:00Z") + offset * 86_400_000)
        .toISOString()
        .slice(0, 10);
    const fixtures = [
      {
        slug: "event-verification-past",
        eventStart: offsetDate(-1),
        published: true,
      },
      { slug: "event-verification-today", eventStart: today, published: true },
      {
        slug: "event-verification-near",
        eventStart: offsetDate(2),
        published: true,
      },
      {
        slug: "event-verification-later",
        eventStart: offsetDate(5),
        published: true,
      },
      {
        slug: "event-verification-unpublished-near",
        eventStart: offsetDate(1),
        published: false,
      },
    ];
    const fixtureRecords: Awaited<ReturnType<typeof createEvent>>[] = [];
    for (const fixture of fixtures) {
      const record = await authenticated(() =>
        createEvent({ ...eventMetadata, ...fixture, registrationOpen: false }),
      );
      eventIds.add(record.id);
      fixtureRecords.push(record);
    }
    assert.equal(
      (await getNearestEligibleEvent())?.slug,
      "event-verification-today",
    );
    await authenticated(() =>
      updateEvent({
        id: fixtureRecords[1]!.id,
        metadata: { published: false },
      }),
    );
    assert.equal(
      (await getNearestEligibleEvent())?.slug,
      "event-verification-near",
    );
    await authenticated(() =>
      updateEvent({
        id: fixtureRecords[2]!.id,
        metadata: { registrationOpen: true },
      }),
    );
    assert.equal(
      (await getNearestEligibleEvent())?.slug,
      "event-verification-near",
    );
    const list = await getPublishedEvents();
    assert.equal(list.length, 3);
    assert(
      !list.some((row) => row.slug === "event-verification-unpublished-near"),
    );
    assert(!("status" in list[0]!));
    for (const fixture of fixtureRecords) {
      await authenticated(() => deleteEvent(fixture.id));
      eventIds.delete(fixture.id);
    }
    assert.deepEqual(await getPublishedEvents(), []);
    assert.equal(await getNearestEligibleEvent(), null);
    assert.deepEqual(
      await db.select().from(storyItems).orderBy(storyItems.id),
      storiesBefore,
    );
    assert.deepEqual(
      await db.select().from(inboxThreads).orderBy(inboxThreads.id),
      threadsBefore,
    );
    assert.deepEqual(
      await db.select().from(inboxMessages).orderBy(inboxMessages.id),
      messagesBefore,
    );
    console.log(
      "Nearest event: past excluded, today eligible, nearest future, unpublished excluded, registration independent, Kathmandu rollover: PASS",
    );
    assert.deepEqual(
      toNewsFailure(
        new NewsApplicationError("INVALID_NEWS_DATA", "Invalid News data."),
        { code: "SAVE_FAILED", message: "Unable to save News." },
      ),
      {
        success: false,
        code: "INVALID_NEWS_DATA",
        error: "Invalid News data.",
      },
    );
    console.log(
      JSON.stringify({
        result: "PASS",
        invalidSignatureRejected: true,
        replacementAndOldMediaCleanup: true,
        deleteAndMediaCleanup: true,
        finalNewsCount: 0,
        galleryCount: galleryBefore.length,
        ourWorkCount: workBefore.length,
        otherContentUnchanged: true,
      }),
    );
  } finally {
    databaseClient.transaction = transactionOriginal;
    globalThis.fetch = fetchOriginal;
    for (const id of eventIds) {
      try {
        await db.delete(eventItems).where(eq(eventItems.id, id));
      } catch {
        cleanupFailed = true;
      }
    }
    for (const id of createdIds) {
      try {
        const item = await authenticated(() => getNewsById(id));
        if (item) keys.add(item.imageStorageKey);
        const result = await authenticated(() => deleteNews(id));
        if (result.cleanupWarning) cleanupFailed = true;
      } catch {
        try {
          await db.delete(newsItems).where(eq(newsItems.id, id));
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
    const finalRows = await db.select().from(newsItems);
    assert.equal((await db.select().from(eventItems)).length, 0);
    assert.deepEqual(
      await db.select().from(storyItems).orderBy(storyItems.id),
      storiesBefore,
    );
    assert.deepEqual(
      await db.select().from(inboxThreads).orderBy(inboxThreads.id),
      threadsBefore,
    );
    assert.deepEqual(
      await db.select().from(inboxMessages).orderBy(inboxMessages.id),
      messagesBefore,
    );
    console.log(
      JSON.stringify({
        finalNewsCount: finalRows.length,
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
        : "News backend verification failed; credentials and raw errors were not logged.",
    );
    process.exitCode = 1;
  })
  .finally(closeDb);
