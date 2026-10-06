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
} from "../src/server/db/schema";
import {
  createGalleryItem,
  deleteGalleryItem,
  GalleryApplicationError,
  galleryMetadataSchema,
  getGalleryItemById,
  getGalleryItemsForAdmin,
  getPublishedGalleryItems,
  replaceGalleryItemImage,
  updateGalleryItemMetadata,
} from "../src/server/gallery/index";

const SESSION_COOKIE_NAME = "umanga_admin_session";
const MEDIA_ENVIRONMENT_NAMES = [
  "MEDIA_FTP_HOST",
  "MEDIA_FTP_PORT",
  "MEDIA_FTP_USERNAME",
  "MEDIA_FTP_PASSWORD",
  "MEDIA_FTP_SECURE",
  "MEDIA_FTP_ROOT",
  "MEDIA_PUBLIC_BASE_URL",
] as const;

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
    new Request("http://localhost/gallery-verification", { headers }),
    {},
  );

  if (state.error !== undefined) throw state.error;
  return state.result as T;
}

async function expectGalleryError(
  operation: () => Promise<unknown>,
  expectedCode: GalleryApplicationError["code"],
): Promise<boolean> {
  try {
    await operation();
    return false;
  } catch (error) {
    return (
      error instanceof GalleryApplicationError && error.code === expectedCode
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
      galleryCount: sql<number>`(select count(*) from ${galleryItems})`,
      sessionCount: sql<number>`(select count(*) from ${adminSessions})`,
    })
    .from(adminUsers)
    .where(eq(adminUsers.id, admin.id))
    .limit(1);

  const session = await createAdminSession(admin.id);
  const unknownId = crypto.randomUUID();
  const metadata = {
    title: "Storage configuration test",
    caption: "",
    published: false,
    sortOrder: "",
  };
  const image = { buffer: TEST_PNG, mimeType: "image/png" };

  try {
    const normalized = galleryMetadataSchema.parse({
      title: "  Example  ",
      caption: "   ",
      published: true,
      sortOrder: "",
    });
    const adminList = await runInRequest(session.token, () =>
      getGalleryItemsForAdmin(),
    );
    const publicList = await getPublishedGalleryItems();
    const unknownItem = await runInRequest(session.token, () =>
      getGalleryItemById(unknownId),
    );
    const unauthorized = await expectGalleryError(
      () =>
        runInRequest(undefined, () =>
          updateGalleryItemMetadata({ id: unknownId, metadata }),
        ),
      "UNAUTHORIZED",
    );

    const savedEnvironment = Object.fromEntries(
      MEDIA_ENVIRONMENT_NAMES.map((name) => [name, process.env[name]]),
    );
    for (const name of MEDIA_ENVIRONMENT_NAMES) delete process.env[name];
    const storageNotConfigured = await expectGalleryError(
      () =>
        runInRequest(session.token, () =>
          createGalleryItem({ metadata, image }),
        ),
      "STORAGE_NOT_CONFIGURED",
    );
    for (const name of MEDIA_ENVIRONMENT_NAMES) {
      const value = savedEnvironment[name];
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }

    const updateNotFound = await expectGalleryError(
      () =>
        runInRequest(session.token, () =>
          updateGalleryItemMetadata({ id: unknownId, metadata }),
        ),
      "NOT_FOUND",
    );
    const replaceNotFound = await expectGalleryError(
      () =>
        runInRequest(session.token, () =>
          replaceGalleryItemImage({ id: unknownId, image }),
        ),
      "NOT_FOUND",
    );
    const deleteNotFound = await expectGalleryError(
      () => runInRequest(session.token, () => deleteGalleryItem(unknownId)),
      "NOT_FOUND",
    );

    const [galleryCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(galleryItems);

    const result = {
      metadataNormalization:
        normalized.title === "Example" &&
        normalized.caption === null &&
        normalized.sortOrder === null,
      emptyAdminList: adminList.length === 0,
      emptyPublicList: publicList.length === 0,
      unknownItemIsNull: unknownItem === null,
      unauthorizedMutationRejected: unauthorized,
      storageNotConfigured,
      updateNotFound,
      replaceNotFoundBeforeUpload: replaceNotFound,
      deleteNotFound,
      galleryCount: Number(galleryCount?.count ?? -1),
      initialGalleryCount: Number(initialState?.galleryCount ?? -1),
      initialSessionCount: Number(initialState?.sessionCount ?? -1),
    };

    console.log(JSON.stringify(result));
    if (
      !Object.entries(result).every(([key, value]) =>
        key.endsWith("Count")
          ? value === 0 || key === "initialSessionCount"
          : value === true,
      )
    ) {
      process.exitCode = 1;
    }
  } finally {
    await deleteAdminSession(session.token);
    const [finalSessions] = await db
      .select({ count: sql<number>`count(*)` })
      .from(adminSessions);
    console.log(
      JSON.stringify({
        finalSessionCount: Number(finalSessions?.count ?? -1),
        testSessionRemoved:
          Number(finalSessions?.count ?? -1) ===
          Number(initialState?.sessionCount ?? -2),
      }),
    );
    await closeDb();
  }
}

main().catch(async (error: unknown) => {
  console.error(
    error instanceof Error ? error.message : "Gallery verification failed.",
  );
  await closeDb();
  process.exitCode = 1;
});
