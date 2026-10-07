import "dotenv/config";

import { requestHandler } from "@tanstack/react-start/server";
import { eq, sql } from "drizzle-orm";

import {
  createAdminSession,
  deleteAdminSession,
} from "../src/server/auth/index";
import { closeDb, db } from "../src/server/db/index";
import {
  adminSessions,
  adminUsers,
  galleryItems,
  ourWorkItems,
} from "../src/server/db/schema";
import {
  createOurWorkItem,
  deleteOurWorkItem,
  getOurWorkItemById,
  getOurWorkItemsForAdmin,
  getPublishedOurWorkItemBySlug,
  getPublishedOurWorkItems,
  OurWorkApplicationError,
  ourWorkMetadataSchema,
  replaceOurWorkItemImage,
  updateOurWorkItemMetadata,
} from "../src/server/our-work/index";
import { deleteMedia, mediaExists } from "../src/server/storage/index";

const SESSION_COOKIE_NAME = "umanga_admin_session";
const TEST_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

async function runInRequest<T>(
  sessionToken: string | undefined,
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
  if (sessionToken) {
    headers.set("cookie", `${SESSION_COOKIE_NAME}=${sessionToken}`);
  }
  await handler(
    new Request("http://localhost/our-work-verification", { headers }),
    {},
  );

  if (state.error !== undefined) throw state.error;
  return state.result as T;
}

async function expectOurWorkError(
  operation: () => Promise<unknown>,
  expectedCode: OurWorkApplicationError["code"],
): Promise<boolean> {
  try {
    await operation();
    return false;
  } catch (error) {
    return (
      error instanceof OurWorkApplicationError && error.code === expectedCode
    );
  }
}

async function main() {
  const [admin] = await db
    .select({ id: adminUsers.id })
    .from(adminUsers)
    .limit(1);
  if (!admin) throw new Error("Verification requires the existing admin user.");

  const [initialState] = await db
    .select({
      ourWorkCount: sql<number>`(select count(*) from ${ourWorkItems})`,
      galleryCount: sql<number>`(select count(*) from ${galleryItems})`,
      sessionCount: sql<number>`(select count(*) from ${adminSessions})`,
    })
    .from(adminUsers)
    .where(eq(adminUsers.id, admin.id))
    .limit(1);

  const initialOurWorkCount = Number(initialState?.ourWorkCount ?? -1);
  const initialGalleryCount = Number(initialState?.galleryCount ?? -1);
  const initialSessionCount = Number(initialState?.sessionCount ?? -1);
  const session = await createAdminSession(admin.id);
  const image = { buffer: TEST_PNG, mimeType: "image/png" };
  const uploadedKeys = new Set<string>();
  let createdId: string | null = null;

  try {
    const normalized = ourWorkMetadataSchema.parse({
      slug: "slug-verification-program",
      type: "  Program  ",
      title: "  Verification program  ",
      description: "  Initial description.  ",
      tags: [" Youth ", "", "Awareness", "Youth"],
      aboutProgram: "   ",
      whatWeCover: [" Mental health literacy ", "", "Early support"],
      awarenessSessionCount: "",
      participantCount: null,
      published: true,
      sortOrder: "",
    });

    const adminList = await runInRequest(session.token, () =>
      getOurWorkItemsForAdmin(),
    );
    const publicList = await getPublishedOurWorkItems();
    const unknownId = crypto.randomUUID();
    const unknownItem = await runInRequest(session.token, () =>
      getOurWorkItemById(unknownId),
    );
    const unauthorizedCreate = await expectOurWorkError(
      () =>
        runInRequest(undefined, () =>
          createOurWorkItem({ metadata: normalized, image }),
        ),
      "UNAUTHORIZED",
    );
    const unauthorizedUpdate = await expectOurWorkError(
      () =>
        runInRequest(undefined, () =>
          updateOurWorkItemMetadata({ id: unknownId, metadata: normalized }),
        ),
      "UNAUTHORIZED",
    );
    const unauthorizedDelete = await expectOurWorkError(
      () => runInRequest(undefined, () => deleteOurWorkItem(unknownId)),
      "UNAUTHORIZED",
    );
    const updateNotFound = await expectOurWorkError(
      () =>
        runInRequest(session.token, () =>
          updateOurWorkItemMetadata({ id: unknownId, metadata: normalized }),
        ),
      "NOT_FOUND",
    );
    const replaceNotFound = await expectOurWorkError(
      () =>
        runInRequest(session.token, () =>
          replaceOurWorkItemImage({ id: unknownId, image }),
        ),
      "NOT_FOUND",
    );
    const deleteNotFound = await expectOurWorkError(
      () => runInRequest(session.token, () => deleteOurWorkItem(unknownId)),
      "NOT_FOUND",
    );

    const created = await runInRequest(session.token, () =>
      createOurWorkItem({ metadata: normalized, image }),
    );
    createdId = created.id;
    uploadedKeys.add(created.imageStorageKey);
    const createdMediaExists = await mediaExists(created.imageStorageKey);
    const createdResponse = await fetch(created.imageUrl);
    const publicImageAvailable =
      createdResponse.ok &&
      (createdResponse.headers.get("content-type") ?? "").startsWith("image/");
    await createdResponse.body?.cancel();

    const createdFromDatabase = await runInRequest(session.token, () =>
      getOurWorkItemById(created.id),
    );
    const jsonArraysVerified =
      JSON.stringify(createdFromDatabase?.tags) ===
        JSON.stringify(["Youth", "Awareness"]) &&
      JSON.stringify(createdFromDatabase?.whatWeCover) ===
        JSON.stringify(["Mental health literacy", "Early support"]);
    const nullMetricsVerified =
      createdFromDatabase?.awarenessSessionCount === null &&
      createdFromDatabase.participantCount === null;

    const originalImageUrl = created.imageUrl;
    const originalImageStorageKey = created.imageStorageKey;
    const titleUpdated = await runInRequest(session.token, () =>
      updateOurWorkItemMetadata({
        id: created.id,
        metadata: {
          ...normalized,
          title: "Slug Verification Program Updated",
        },
      }),
    );
    const titleChangePreservedSlug =
      titleUpdated.slug === "slug-verification-program";

    const unpublished = await runInRequest(session.token, () =>
      updateOurWorkItemMetadata({
        id: created.id,
        metadata: {
          slug: "slug-verification-program-updated",
          type: "Campaign",
          title: "Verification program updated",
          description: "Updated description.",
          tags: ["Community", "Campaign"],
          aboutProgram: "Updated long-form program information.",
          whatWeCover: ["Community awareness", "Early support"],
          awarenessSessionCount: 12,
          participantCount: 1_600,
          published: false,
          sortOrder: 5,
        },
      }),
    );
    const metadataUpdated =
      unpublished.slug === "slug-verification-program-updated" &&
      unpublished.type === "Campaign" &&
      unpublished.title === "Verification program updated" &&
      unpublished.description === "Updated description." &&
      JSON.stringify(unpublished.tags) ===
        JSON.stringify(["Community", "Campaign"]) &&
      JSON.stringify(unpublished.whatWeCover) ===
        JSON.stringify(["Community awareness", "Early support"]) &&
      unpublished.awarenessSessionCount === 12 &&
      unpublished.participantCount === 1_600 &&
      unpublished.sortOrder === 5 &&
      unpublished.imageUrl === originalImageUrl &&
      unpublished.imageStorageKey === originalImageStorageKey;
    const excludedWhileUnpublished = !(await getPublishedOurWorkItems()).some(
      (item) => item.id === created.id,
    );
    const unpublishedBySlugExcluded =
      (await getPublishedOurWorkItemBySlug(unpublished.slug)) === null;

    const duplicateSlugRejected = await expectOurWorkError(
      () =>
        runInRequest(session.token, () =>
          createOurWorkItem({
            metadata: { ...normalized, slug: unpublished.slug },
            image,
          }),
        ),
      "SLUG_ALREADY_EXISTS",
    );
    const invalidSlugsRejected = [
      "Slug Verification",
      "slug_verification",
      "slug--verification",
    ].every(
      (slug) =>
        !ourWorkMetadataSchema.safeParse({ ...normalized, slug }).success,
    );

    const republished = await runInRequest(session.token, () =>
      updateOurWorkItemMetadata({
        id: created.id,
        metadata: {
          slug: unpublished.slug,
          type: unpublished.type,
          title: unpublished.title,
          description: unpublished.description,
          tags: unpublished.tags,
          aboutProgram: unpublished.aboutProgram,
          whatWeCover: unpublished.whatWeCover,
          awarenessSessionCount: unpublished.awarenessSessionCount,
          participantCount: unpublished.participantCount,
          published: true,
          sortOrder: unpublished.sortOrder,
        },
      }),
    );
    const includedAfterRepublish = (await getPublishedOurWorkItems()).some(
      (item) =>
        item.id === created.id &&
        item.slug === "slug-verification-program-updated",
    );
    const publishedBySlug = await getPublishedOurWorkItemBySlug(
      "slug-verification-program-updated",
    );

    const replacement = await runInRequest(session.token, () =>
      replaceOurWorkItemImage({ id: created.id, image }),
    );
    uploadedKeys.add(replacement.item.imageStorageKey);
    const replacementVerified =
      replacement.item.id === created.id &&
      replacement.item.imageUrl !== originalImageUrl &&
      replacement.item.imageStorageKey !== originalImageStorageKey &&
      replacement.item.title === republished.title &&
      !replacement.cleanupWarning &&
      (await mediaExists(replacement.item.imageStorageKey)) &&
      !(await mediaExists(originalImageStorageKey));

    const deletion = await runInRequest(session.token, () =>
      deleteOurWorkItem(created.id),
    );
    createdId = null;
    const replacementMediaDeleted = !(await mediaExists(
      replacement.item.imageStorageKey,
    ));
    const deletedFromDatabase =
      (
        await db
          .select({ id: ourWorkItems.id })
          .from(ourWorkItems)
          .where(eq(ourWorkItems.id, created.id))
          .limit(1)
      ).length === 0;

    const [finalCounts] = await db
      .select({
        ourWorkCount: sql<number>`count(*)`,
      })
      .from(ourWorkItems);
    const [finalGallery] = await db
      .select({ count: sql<number>`count(*)` })
      .from(galleryItems);

    const result = {
      metadataNormalization:
        normalized.slug === "slug-verification-program" &&
        normalized.type === "Program" &&
        normalized.title === "Verification program" &&
        normalized.description === "Initial description." &&
        normalized.aboutProgram === null &&
        normalized.sortOrder === null,
      emptyAdminList: adminList.length === 0,
      emptyPublicList: publicList.length === 0,
      unknownItemIsNull: unknownItem === null,
      updateNotFound,
      replaceNotFoundBeforeUpload: replaceNotFound,
      deleteNotFound,
      unauthorizedCreateRejected: unauthorizedCreate,
      unauthorizedUpdateRejected: unauthorizedUpdate,
      unauthorizedDeleteRejected: unauthorizedDelete,
      realCreateSucceeded: Boolean(created.id),
      relativeStorageKey:
        created.imageStorageKey.startsWith("our-work/") &&
        !created.imageStorageKey.startsWith("/") &&
        !created.imageStorageKey.includes("public_html"),
      createdMediaExists,
      publicImageAvailable,
      jsonArraysVerified,
      nullMetricsVerified,
      metadataUpdated,
      titleChangePreservedSlug,
      explicitSlugUpdatePersisted:
        unpublished.slug === "slug-verification-program-updated",
      duplicateSlugRejected,
      invalidSlugsRejected,
      imageFieldsUnchangedDuringMetadataUpdate:
        unpublished.imageUrl === originalImageUrl &&
        unpublished.imageStorageKey === originalImageStorageKey,
      excludedWhileUnpublished,
      unpublishedBySlugExcluded,
      includedAfterRepublish,
      publishedListIncludesSlug: includedAfterRepublish,
      publishedBySlugLookup:
        publishedBySlug?.id === created.id &&
        publishedBySlug.slug === "slug-verification-program-updated",
      replacementVerified,
      deleteSucceeded: deletion.deleted && !deletion.cleanupWarning,
      deletedFromDatabase,
      replacementMediaDeleted,
      finalOurWorkCount: Number(finalCounts?.ourWorkCount ?? -1),
      initialOurWorkCount,
      galleryCountUnchanged:
        Number(finalGallery?.count ?? -1) === initialGalleryCount,
    };

    console.log(JSON.stringify(result));
    if (
      !Object.entries(result).every(([key, value]) =>
        key.endsWith("Count") ? value === 0 : value === true,
      )
    ) {
      process.exitCode = 1;
    }
  } finally {
    if (createdId) {
      try {
        await runInRequest(session.token, () => deleteOurWorkItem(createdId));
      } catch {
        await db.delete(ourWorkItems).where(eq(ourWorkItems.id, createdId));
      }
    }

    for (const key of uploadedKeys) {
      try {
        if (await mediaExists(key)) await deleteMedia(key);
      } catch {
        console.warn(
          "[our-work] Verification media cleanup could not complete.",
        );
      }
    }

    await deleteAdminSession(session.token);
    const [finalState] = await db
      .select({
        ourWorkCount: sql<number>`count(*)`,
      })
      .from(ourWorkItems);
    const [finalSessions] = await db
      .select({ count: sql<number>`count(*)` })
      .from(adminSessions);
    console.log(
      JSON.stringify({
        finalOurWorkCount: Number(finalState?.ourWorkCount ?? -1),
        testSessionRemoved:
          Number(finalSessions?.count ?? -1) === initialSessionCount,
        leftoverMedia: await Promise.all(
          [...uploadedKeys].map((key) => mediaExists(key)),
        ).then((values) => values.filter(Boolean).length),
      }),
    );
    await closeDb();
  }
}

main().catch(async (error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Our Work verification failed.",
  );
  await closeDb();
  process.exitCode = 1;
});
