import "dotenv/config";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { posix } from "node:path";
import mysql from "mysql2/promise";
import { Client } from "basic-ftp";
import { eq } from "drizzle-orm";
import { requestHandler } from "@tanstack/react-start/server";
import { db, getDb, closeDb } from "../src/server/db";
import { adminUsers, galleryItems } from "../src/server/db/schema";
import {
  ADMIN_SESSION_COOKIE_NAME,
  createAdminSession,
  deleteAdminSession,
} from "../src/server/auth";
import {
  createGalleryItem,
  updateGalleryItemMetadata,
  deleteGalleryItem,
  createGalleryAlbum,
  deleteGalleryAlbum,
  GalleryApplicationError,
  toGalleryFailure,
} from "../src/server/gallery";
import { uploadImage, mediaExists, deleteMedia } from "../src/server/storage";

async function inRequest<T>(
  token: string | undefined,
  operation: () => Promise<T>,
) {
  let result: T | undefined;
  let error: unknown;
  const handler = requestHandler(async () => {
    try {
      result = await operation();
    } catch (failure) {
      error = failure;
    }
    return new Response(null, { status: 204 });
  });
  await handler(
    new Request("http://localhost", {
      headers: token ? { cookie: `${ADMIN_SESSION_COOKIE_NAME}=${token}` } : {},
    }),
    {},
  );
  if (error) throw error;
  return result as T;
}

async function inventory() {
  const client = new Client(20000);
  const keys: string[] = [];
  try {
    await client.access({
      host: process.env["MEDIA_FTP_HOST"]!,
      port: Number(process.env["MEDIA_FTP_PORT"]),
      user: process.env["MEDIA_FTP_USERNAME"]!,
      password: process.env["MEDIA_FTP_PASSWORD"]!,
      secure: true,
    });
    async function walk(directory: string) {
      for (const file of await client.list(
        posix.join(process.env["MEDIA_FTP_ROOT"]!, directory),
      )) {
        const key = posix.join(directory, file.name);
        if (file.isDirectory) await walk(key);
        else keys.push(key);
      }
    }
    await walk("gallery");
    return keys.sort();
  } finally {
    client.close();
  }
}

async function main() {
  const connection = await mysql.createConnection(process.env["DATABASE_URL"]!);
  const tables = [
    "news_items",
    "event_items",
    "gallery_items",
    "gallery_albums",
    "our_work_items",
    "story_items",
    "resource_items",
    "inbox_threads",
    "inbox_messages",
    "admin_sessions",
  ];
  async function snapshot() {
    const result: Record<string, mysql.RowDataPacket[]> = {};
    for (const table of tables) {
      const [rows] = await connection.query<mysql.RowDataPacket[]>(
        `SELECT * FROM ${table} ORDER BY id`,
      );
      result[table] = rows;
    }
    return result;
  }
  const before = await snapshot();
  const mediaBefore = await inventory();
  const hash = (buffer: Buffer) =>
    createHash("sha256").update(buffer).digest("hex");
  const hashes = new Map<string, string>();
  let image: { buffer: Buffer; mimeType: string } | undefined;
  for (const row of before["gallery_items"]!) {
    const response = await fetch(String(row["image_url"]));
    assert.equal(response.status, 200);
    const buffer = Buffer.from(await response.arrayBuffer());
    hashes.set(String(row["id"]), hash(buffer));
    image ??= {
      buffer,
      mimeType: response.headers.get("content-type")!.split(";")[0]!,
    };
  }
  assert(image);
  const [admin] = await db.select().from(adminUsers).limit(1);
  assert(admin);
  const session = await createAdminSession(admin.id);
  const run = <T>(operation: () => Promise<T>) =>
    inRequest(session.token, operation);
  const title = `Temporary FTPS finalization ${randomUUID()}`;
  const metadata = {
    title,
    caption: "Temporary verification",
    category: "Event",
    contextName: title,
    published: true,
  };
  const albumMetadata = { ...metadata, name: title };
  const ownedKeys = new Set<string>();
  const ownedIds = new Set<string>();
  const ownedAlbums = new Set<string>();
  const originalUpload = Client.prototype.uploadFrom;
  const originalRemove = Client.prototype.remove;
  const originalTransaction = getDb().transaction;
  const allocated: string[] = [];
  let mode = "success",
    calls = 0,
    active = 0,
    maximumActive = 0;
  const injected = new Error("Controlled transfer interruption");
  Client.prototype.uploadFrom = async function (
    ...args: Parameters<typeof originalUpload>
  ) {
    const key = posix.relative(
      process.env["MEDIA_FTP_ROOT"]!,
      posix.join(await this.pwd(), args[1]),
    );
    assert(/^gallery\/\d{4}\/\d{2}\/[a-f0-9-]+\.(jpg|png|webp)$/.test(key));
    allocated.push(key);
    ownedKeys.add(key);
    calls++;
    active++;
    maximumActive = Math.max(maximumActive, active);
    try {
      if (mode === "before") throw injected;
      const result = await originalUpload.apply(this, args);
      if (mode === "after" || (mode === "bulk" && calls === 2)) throw injected;
      return result;
    } finally {
      active--;
    }
  };
  async function rejected(
    operation: () => Promise<unknown>,
    expectedCause?: unknown,
  ) {
    let failure: unknown;
    try {
      await operation();
    } catch (error) {
      failure = error;
    }
    assert(failure instanceof GalleryApplicationError);
    if (expectedCause) {
      let cause: unknown = failure;
      while (cause instanceof Error && cause.cause !== undefined)
        cause = cause.cause;
      assert.equal(cause, expectedCause);
    }
    const response = toGalleryFailure(failure, {
      code: "UNABLE_TO_SAVE",
      message: "Upload failed.",
    });
    assert(!JSON.stringify(response).includes(injected.message));
    return failure;
  }
  async function noObjects(keys: string[]) {
    for (const key of keys) assert.equal(await mediaExists(key), false);
  }
  try {
    for (const operation of [
      () => createGalleryItem({ metadata, image }),
      () => createGalleryAlbum({ metadata: albumMetadata, images: [image] }),
      () => updateGalleryItemMetadata({ id: randomUUID(), metadata }),
      () => deleteGalleryItem(randomUUID()),
      () => deleteGalleryAlbum(randomUUID()),
    ])
      assert.equal(
        (await rejected(() => inRequest<unknown>(undefined, operation))).code,
        "UNAUTHORIZED",
      );
    assert.equal(allocated.length, 0);
    for (const failureMode of ["before", "after", "bulk"]) {
      mode = failureMode;
      calls = 0;
      const start = allocated.length;
      await rejected(
        () =>
          run<unknown>(() =>
            failureMode === "bulk"
              ? createGalleryAlbum({
                  metadata: albumMetadata,
                  images: [image, image],
                })
              : createGalleryItem({ metadata, image }),
          ),
        injected,
      );
      await noObjects(allocated.slice(start));
      assert.deepEqual(
        (await snapshot())["gallery_items"],
        before["gallery_items"],
      );
      assert.deepEqual(
        (await snapshot())["gallery_albums"],
        before["gallery_albums"],
      );
      console.log(
        `${failureMode}: original transfer error preserved; exact objects absent before harness cleanup.`,
      );
    }
    mode = "after";
    Client.prototype.remove = async function () {
      throw new Error("Controlled cleanup interruption");
    };
    const failure = await rejected(
      () =>
        run(() =>
          createGalleryAlbum({ metadata: albumMetadata, images: [image] }),
        ),
      injected,
    );
    assert.equal(failure.cleanupWarning, true);
    assert.match(failure.message, /cleanup needs attention/);
    Client.prototype.remove = originalRemove;
    await deleteMedia(allocated.at(-1)!);
    console.log(
      "Cleanup failure: safe warning visible; original transfer cause retained; test object removed explicitly.",
    );
    mode = "success";
    let preallocated: string | undefined;
    const direct = await uploadImage({
      ...image,
      category: "gallery",
      onAllocated: ({ key }) => {
        assert(!allocated.includes(key));
        preallocated = key;
        ownedKeys.add(key);
      },
    });
    assert.equal(direct.key, preallocated);
    assert.equal(allocated.at(-1), preallocated);
    assert.equal(
      hash(Buffer.from(await (await fetch(direct.publicUrl!)).arrayBuffer())),
      hash(image.buffer),
    );
    await deleteMedia(direct.key);
    const created = await run(() => createGalleryItem({ metadata, image }));
    ownedIds.add(created.id);
    const updated = await run(() =>
      updateGalleryItemMetadata({
        id: created.id,
        metadata: { ...metadata, title: `${title} edited` },
      }),
    );
    assert.equal(updated.id, created.id);
    const sharedId = randomUUID();
    ownedIds.add(sharedId);
    await db.insert(galleryItems).values({ ...created, id: sharedId });
    await run(() => deleteGalleryItem(created.id));
    ownedIds.delete(created.id);
    assert.equal(await mediaExists(created.imageStorageKey), true);
    await run(() => deleteGalleryItem(sharedId));
    ownedIds.delete(sharedId);
    assert.equal(await mediaExists(created.imageStorageKey), false);
    const dbFailure = new Error("Controlled database failure");
    getDb().transaction = async () => {
      throw dbFailure;
    };
    const start = allocated.length;
    await rejected(
      () => run(() => createGalleryItem({ metadata, image })),
      dbFailure,
    );
    getDb().transaction = originalTransaction;
    await noObjects(allocated.slice(start));
    const countBefore = allocated.length;
    assert.equal(
      (
        await rejected(() =>
          run(() =>
            createGalleryAlbum({
              metadata: albumMetadata,
              images: Array.from({ length: 26 }, () => image),
            }),
          ),
        )
      ).code,
      "INVALID_DATA",
    );
    assert.equal(allocated.length, countBefore);
    const album = await run(() =>
      createGalleryAlbum({
        metadata: albumMetadata,
        images: Array.from({ length: 25 }, () => image),
      }),
    );
    ownedAlbums.add(album.id);
    const photos = await db
      .select()
      .from(galleryItems)
      .where(eq(galleryItems.albumId, album.id));
    assert.equal(photos.length, 25);
    await rejected(() =>
      run(() =>
        createGalleryItem({
          metadata: { ...metadata, albumId: album.id },
          image,
        }),
      ),
    );
    await noObjects([allocated.at(-1)!]);
    await run(() => deleteGalleryAlbum(album.id));
    ownedAlbums.delete(album.id);
    for (const photo of photos)
      assert.equal(await mediaExists(photo.imageStorageKey), false);
    assert.equal(maximumActive, 1);
    console.log(
      "Success, single CRUD, shared-object protection, DB compensation, 25 accepted / 26 rejected, album-total limit and sequential transfer passed.",
    );
  } finally {
    Client.prototype.uploadFrom = originalUpload;
    Client.prototype.remove = originalRemove;
    getDb().transaction = originalTransaction;
    for (const id of ownedAlbums) await run(() => deleteGalleryAlbum(id));
    for (const id of ownedIds) await run(() => deleteGalleryItem(id));
    for (const key of ownedKeys) await deleteMedia(key);
    await deleteAdminSession(session.token);
    assert.deepEqual(await snapshot(), before);
    assert.deepEqual(await inventory(), mediaBefore);
    for (const row of before["gallery_items"]!) {
      const response = await fetch(String(row["image_url"]));
      assert.equal(response.status, 200);
      assert.equal(
        hash(Buffer.from(await response.arrayBuffer())),
        hashes.get(String(row["id"])),
      );
    }
    console.log(
      `Final exact database/media snapshots match: ${before["gallery_items"]!.length} Gallery rows, ${mediaBefore.length} Gallery files; all existing hashes unchanged. No temporary sessions remain.`,
    );
    await connection.end();
    await closeDb();
  }
}
main().catch(() => {
  console.error(
    "Focused Gallery finalization verification failed; inspect assertions without exposing infrastructure.",
  );
  process.exitCode = 1;
});
