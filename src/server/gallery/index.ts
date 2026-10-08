import "@tanstack/react-start/server-only";

import { randomUUID } from "node:crypto";

import { and, desc, eq, getTableColumns, sql } from "drizzle-orm";
import { imageSize } from "image-size";
import { z } from "zod";

import { getCurrentAdmin } from "@/server/auth";
import { db } from "@/server/db";
import {
  galleryAlbums,
  galleryItems,
  newsItems,
  ourWorkItems,
  storyItems,
  type GalleryItem,
} from "@/server/db/schema";
import { galleryQuerySchema } from "@/lib/gallery-query";
import {
  deleteMedia,
  MediaImageValidationError,
  MediaStorageConfigurationError,
  uploadImage,
  mediaExists,
  MAX_IMAGE_SIZE_BYTES,
} from "@/server/storage";

const MYSQL_INT_MIN = -2_147_483_648;
const MYSQL_INT_MAX = 2_147_483_647;

const nullableCaptionSchema = z.preprocess((value) => {
  if (value === undefined || value === null) return null;
  if (typeof value !== "string") return value;

  const caption = value.trim();
  return caption.length === 0 ? null : caption;
}, z.string().max(5_000).nullable());

const nullableSortOrderSchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "string") {
    const normalized = value.trim();
    if (normalized === "") return null;
    if (/^-?\d+$/.test(normalized)) return Number(normalized);
  }
  return value;
}, z.number().int().min(MYSQL_INT_MIN).max(MYSQL_INT_MAX).nullable());

export const galleryMetadataSchema = z
  .object({
    title: z.string().trim().min(1).max(255),
    caption: nullableCaptionSchema.optional().default(null),
    published: z.boolean(),
    sortOrder: nullableSortOrderSchema.optional().default(null),
    category: z
      .string()
      .trim()
      .min(1)
      .max(100)
      .nullable()
      .optional()
      .default(null),
    contextName: z.string().trim().max(255).nullable().optional().default(null),
    albumId: z.string().uuid().nullable().optional().default(null),
  })
  .strict();

const galleryIdSchema = z.string().uuid();

const galleryImageSchema = z
  .object({
    buffer: z.custom<Buffer>((value) => Buffer.isBuffer(value)),
    mimeType: z.string().trim().min(1).max(255),
  })
  .strict();

export type GalleryMetadataInput = z.input<typeof galleryMetadataSchema>;
export type GalleryImageInput = z.input<typeof galleryImageSchema>;
export type GalleryAdminItem = GalleryItem;
export type PublishedGalleryItem = Pick<
  GalleryItem,
  "id" | "title" | "caption" | "imageUrl" | "sortOrder" | "createdAt"
>;

export type GalleryErrorCode =
  | "UNAUTHORIZED"
  | "INVALID_DATA"
  | "NOT_FOUND"
  | "STORAGE_NOT_CONFIGURED"
  | "INVALID_IMAGE"
  | "IMAGE_UPLOAD_FAILED"
  | "UNABLE_TO_LOAD"
  | "UNABLE_TO_SAVE"
  | "UNABLE_TO_UPDATE"
  | "UNABLE_TO_DELETE";

export class GalleryApplicationError extends Error {
  readonly code: GalleryErrorCode;
  cleanupWarning = false;

  constructor(code: GalleryErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = "GalleryApplicationError";
    this.code = code;
    if (cause !== undefined) this.cause = cause;
  }
}

export type GalleryFailure = {
  success: false;
  code: GalleryErrorCode;
  error: string;
};

const adminColumns = {
  id: galleryItems.id,
  title: galleryItems.title,
  caption: galleryItems.caption,
  category: galleryItems.category,
  contextName: galleryItems.contextName,
  albumId: galleryItems.albumId,
  imageWidth: galleryItems.imageWidth,
  imageHeight: galleryItems.imageHeight,
  imageUrl: galleryItems.imageUrl,
  imageStorageKey: galleryItems.imageStorageKey,
  published: galleryItems.published,
  sortOrder: galleryItems.sortOrder,
  createdAt: galleryItems.createdAt,
  updatedAt: galleryItems.updatedAt,
};

const publicColumns = {
  id: galleryItems.id,
  title: galleryItems.title,
  caption: galleryItems.caption,
  imageUrl: galleryItems.imageUrl,
  sortOrder: galleryItems.sortOrder,
  createdAt: galleryItems.createdAt,
};

const galleryOrdering = [
  desc(galleryItems.createdAt),
  desc(galleryItems.id),
] as const;

async function requireAuthenticatedAdmin(): Promise<void> {
  const admin = await getCurrentAdmin();
  if (!admin) {
    throw new GalleryApplicationError("UNAUTHORIZED", "Unauthorized.");
  }
}

function parseGalleryId(id: unknown): string {
  const parsed = galleryIdSchema.safeParse(id);
  if (!parsed.success) {
    throw new GalleryApplicationError("INVALID_DATA", "Invalid gallery data.");
  }
  return parsed.data;
}

function parseMetadata(input: unknown) {
  const parsed = galleryMetadataSchema.safeParse(input);
  if (!parsed.success) {
    throw new GalleryApplicationError("INVALID_DATA", "Invalid gallery data.");
  }
  return parsed.data;
}

function parseImage(input: unknown) {
  const parsed = galleryImageSchema.safeParse(input);
  if (!parsed.success) {
    throw new GalleryApplicationError("INVALID_IMAGE", "Invalid image.");
  }
  return parsed.data;
}

async function findGalleryItem(id: string): Promise<GalleryAdminItem | null> {
  const [item] = await db
    .select(adminColumns)
    .from(galleryItems)
    .where(eq(galleryItems.id, id))
    .limit(1);
  return item ?? null;
}

function logCleanupWarning(operation: string, galleryItemId: string): void {
  console.warn(
    `[gallery] ${operation} cleanup could not be completed for item ${galleryItemId}.`,
  );
}

async function tryDeleteMediaForCleanup(
  key: string,
  operation: string,
  galleryItemId: string,
): Promise<boolean> {
  try {
    // A storage object may outlive one record if another record still owns it.
    for (const table of [galleryItems, newsItems, ourWorkItems, storyItems]) {
      const [reference] = await db
        .select({ id: table.id })
        .from(table)
        .where(eq(table.imageStorageKey, key))
        .limit(1);
      if (reference) return true;
    }
    await deleteMedia(key);
    return true;
  } catch {
    logCleanupWarning(operation, galleryItemId);
    return false;
  }
}

async function uploadGalleryImage(imageInput: unknown) {
  const image = parseImage(imageInput);
  const dimensions = validateGalleryImage(image);
  let allocatedKey: string | undefined;

  try {
    const uploaded = await uploadImage({
      ...image,
      category: "gallery",
      onAllocated: ({ key }) => {
        allocatedKey = key;
      },
    });
    if (!uploaded.publicUrl || !(await mediaExists(uploaded.key)))
      throw new Error("Media unavailable.");
    const response = await fetch(uploaded.publicUrl, {
      signal: AbortSignal.timeout(20000),
      cache: "no-store",
    });
    const bytes = Buffer.from(await response.arrayBuffer());
    if (
      response.status !== 200 ||
      !response.headers.get("content-type")?.startsWith("image/") ||
      !bytes.equals(image.buffer)
    )
      throw new Error("Image verification failed.");
    return {
      ...uploaded,
      imageWidth: dimensions.width,
      imageHeight: dimensions.height,
    };
  } catch (error) {
    const cleanupWarning = allocatedKey
      ? !(await tryDeleteMediaForCleanup(allocatedKey, "upload", "new"))
      : false;
    if (error instanceof MediaStorageConfigurationError) {
      throw new GalleryApplicationError(
        "STORAGE_NOT_CONFIGURED",
        "Media storage is not configured.",
        error,
      );
    }
    if (error instanceof MediaImageValidationError) {
      throw new GalleryApplicationError(
        "INVALID_IMAGE",
        "Invalid image.",
        error,
      );
    }
    const failure = new GalleryApplicationError(
      "IMAGE_UPLOAD_FAILED",
      cleanupWarning
        ? "Image upload failed; media cleanup needs attention."
        : "Image upload failed.",
      error,
    );
    failure.cleanupWarning = cleanupWarning;
    throw failure;
  }
}

export function toGalleryFailure(
  error: unknown,
  fallback: { code: GalleryErrorCode; message: string },
): GalleryFailure {
  if (error instanceof GalleryApplicationError) {
    return { success: false, code: error.code, error: error.message };
  }

  console.error(`[gallery] ${fallback.code.toLowerCase()} operation failed.`);
  return { success: false, code: fallback.code, error: fallback.message };
}

export async function getGalleryItemsForAdmin(): Promise<GalleryAdminItem[]> {
  await requireAuthenticatedAdmin();

  try {
    return await db
      .select(adminColumns)
      .from(galleryItems)
      .orderBy(...galleryOrdering);
  } catch (error) {
    throw new GalleryApplicationError(
      "UNABLE_TO_LOAD",
      "Unable to load gallery items.",
      error,
    );
  }
}

export async function getGalleryItemById(
  idInput: unknown,
): Promise<GalleryAdminItem | null> {
  await requireAuthenticatedAdmin();
  const id = parseGalleryId(idInput);

  try {
    return await findGalleryItem(id);
  } catch (error) {
    if (error instanceof GalleryApplicationError) throw error;
    throw new GalleryApplicationError(
      "UNABLE_TO_LOAD",
      "Unable to load the gallery item.",
      error,
    );
  }
}

export async function getPublishedGalleryItems(): Promise<
  PublishedGalleryItem[]
> {
  try {
    return await db
      .select(publicColumns)
      .from(galleryItems)
      .where(eq(galleryItems.published, true))
      .orderBy(...galleryOrdering);
  } catch (error) {
    throw new GalleryApplicationError(
      "UNABLE_TO_LOAD",
      "Unable to load gallery items.",
      error,
    );
  }
}

export async function createGalleryItem(input: {
  metadata: GalleryMetadataInput;
  image: GalleryImageInput;
}): Promise<GalleryAdminItem> {
  await requireAuthenticatedAdmin();
  const metadata = parseMetadata(input.metadata);
  const id = randomUUID();
  const uploaded = await uploadGalleryImage(input.image);

  if (!uploaded.publicUrl) {
    await tryDeleteMediaForCleanup(uploaded.key, "create", id);
    throw new GalleryApplicationError(
      "STORAGE_NOT_CONFIGURED",
      "Media storage is not configured.",
    );
  }

  try {
    return await db.transaction(async (transaction) => {
      await transaction.insert(galleryItems).values({
        id,
        ...metadata,
        ...(await inheritAlbumMetadata(transaction, metadata.albumId)),
        imageWidth: uploaded.imageWidth,
        imageHeight: uploaded.imageHeight,
        imageUrl: uploaded.publicUrl!,
        imageStorageKey: uploaded.key,
      });

      const [created] = await transaction
        .select(adminColumns)
        .from(galleryItems)
        .where(eq(galleryItems.id, id))
        .limit(1);

      if (!created) throw new Error("Gallery insert did not return a record.");
      return created;
    });
  } catch (error) {
    await tryDeleteMediaForCleanup(uploaded.key, "create", id);
    throw new GalleryApplicationError(
      "UNABLE_TO_SAVE",
      "Unable to save gallery item.",
      error,
    );
  }
}

export async function updateGalleryItemMetadata(input: {
  id: unknown;
  metadata: GalleryMetadataInput;
}): Promise<GalleryAdminItem> {
  await requireAuthenticatedAdmin();
  const id = parseGalleryId(input.id);
  const metadata = parseMetadata(input.metadata);

  try {
    const existing = await findGalleryItem(id);
    if (!existing) {
      throw new GalleryApplicationError("NOT_FOUND", "Gallery item not found.");
    }

    await db.transaction(async (transaction) => {
      const [locked] = await transaction
        .select()
        .from(galleryItems)
        .where(eq(galleryItems.id, id))
        .for("update");
      if (!locked)
        throw new GalleryApplicationError(
          "NOT_FOUND",
          "Gallery item not found.",
        );
      const shared = await inheritAlbumMetadata(
        transaction,
        metadata.albumId,
        metadata.albumId === locked.albumId,
      );
      await transaction
        .update(galleryItems)
        .set({ ...metadata, ...shared })
        .where(eq(galleryItems.id, id));
    });
    const updated = await findGalleryItem(id);
    if (!updated) {
      throw new GalleryApplicationError("NOT_FOUND", "Gallery item not found.");
    }
    return updated;
  } catch (error) {
    if (error instanceof GalleryApplicationError) throw error;
    throw new GalleryApplicationError(
      "UNABLE_TO_UPDATE",
      "Unable to update gallery item.",
      error,
    );
  }
}

export async function replaceGalleryItemImage(input: {
  id: unknown;
  image: GalleryImageInput;
}): Promise<{ item: GalleryAdminItem; cleanupWarning: boolean }> {
  await requireAuthenticatedAdmin();
  const id = parseGalleryId(input.id);

  let existing: GalleryAdminItem | null;
  try {
    existing = await findGalleryItem(id);
  } catch (error) {
    throw new GalleryApplicationError(
      "UNABLE_TO_UPDATE",
      "Unable to update gallery item.",
      error,
    );
  }

  if (!existing) {
    throw new GalleryApplicationError("NOT_FOUND", "Gallery item not found.");
  }

  const uploaded = await uploadGalleryImage(input.image);
  if (!uploaded.publicUrl) {
    await tryDeleteMediaForCleanup(uploaded.key, "replace-new", id);
    throw new GalleryApplicationError(
      "STORAGE_NOT_CONFIGURED",
      "Media storage is not configured.",
    );
  }

  let updated: GalleryAdminItem;
  try {
    updated = await db.transaction(async (transaction) => {
      await transaction
        .update(galleryItems)
        .set({
          imageUrl: uploaded.publicUrl!,
          imageStorageKey: uploaded.key,
          imageWidth: uploaded.imageWidth,
          imageHeight: uploaded.imageHeight,
        })
        .where(eq(galleryItems.id, id));

      const [item] = await transaction
        .select(adminColumns)
        .from(galleryItems)
        .where(eq(galleryItems.id, id))
        .limit(1);
      if (!item) throw new Error("Gallery replacement record was not found.");
      return item;
    });
  } catch (error) {
    await tryDeleteMediaForCleanup(uploaded.key, "replace-new", id);
    throw new GalleryApplicationError(
      "UNABLE_TO_UPDATE",
      "Unable to update gallery item.",
      error,
    );
  }

  const oldMediaDeleted = await tryDeleteMediaForCleanup(
    existing.imageStorageKey,
    "replace-old",
    id,
  );
  return { item: updated, cleanupWarning: !oldMediaDeleted };
}

export async function deleteGalleryItem(
  idInput: unknown,
): Promise<{ deleted: true; cleanupWarning: boolean }> {
  await requireAuthenticatedAdmin();
  const id = parseGalleryId(idInput);

  let deletedItem: GalleryAdminItem | null;
  try {
    // Remove the content record transactionally first so no Gallery view can
    // retain a reference to media the administrator has deleted.
    deletedItem = await db.transaction(async (transaction) => {
      const [existing] = await transaction
        .select(adminColumns)
        .from(galleryItems)
        .where(eq(galleryItems.id, id))
        .limit(1);
      if (!existing) return null;

      await transaction.delete(galleryItems).where(eq(galleryItems.id, id));
      return existing;
    });
  } catch (error) {
    throw new GalleryApplicationError(
      "UNABLE_TO_DELETE",
      "Unable to delete gallery item.",
      error,
    );
  }

  if (!deletedItem) {
    throw new GalleryApplicationError("NOT_FOUND", "Gallery item not found.");
  }

  const mediaDeleted = await tryDeleteMediaForCleanup(
    deletedItem.imageStorageKey,
    "delete",
    id,
  );
  return { deleted: true, cleanupWarning: !mediaDeleted };
}

type GalleryTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

function validateGalleryImage(image: GalleryImageInput) {
  try {
    if (!image.buffer.length || image.buffer.length > MAX_IMAGE_SIZE_BYTES)
      throw new Error();
    const dimensions = imageSize(image.buffer);
    const mime = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" }[
      dimensions.type ?? ""
    ];
    if (
      !mime ||
      mime !== image.mimeType ||
      !dimensions.width ||
      !dimensions.height
    )
      throw new Error();
    return dimensions;
  } catch {
    throw new GalleryApplicationError(
      "INVALID_IMAGE",
      "Use a valid JPEG, PNG or WebP image, no larger than 8 MB.",
    );
  }
}

async function inheritAlbumMetadata(
  transaction: GalleryTransaction,
  albumId: string | null,
  alreadyMember = false,
) {
  if (!albumId) return {};
  const [album] = await transaction
    .select()
    .from(galleryAlbums)
    .where(eq(galleryAlbums.id, albumId))
    .for("update");
  if (!album)
    throw new GalleryApplicationError("NOT_FOUND", "Album not found.");
  const [count] = await transaction
    .select({ count: sql<number>`count(*)` })
    .from(galleryItems)
    .where(eq(galleryItems.albumId, albumId));
  if (!count)
    throw new GalleryApplicationError(
      "UNABLE_TO_LOAD",
      "Album could not be loaded.",
    );
  if (!alreadyMember && Number(count.count) >= 25)
    throw new GalleryApplicationError(
      "INVALID_DATA",
      "An album can contain at most 25 photos.",
    );
  return {
    title: album.title,
    caption: album.caption,
    category: album.category,
    contextName: album.contextName,
  };
}

export async function getGalleryAlbumsForAdmin() {
  await requireAuthenticatedAdmin();
  try {
    return await db
      .select({
        ...getTableColumns(galleryAlbums),
        photoCount: sql<number>`count(${galleryItems.id})`.mapWith(Number),
      })
      .from(galleryAlbums)
      .leftJoin(galleryItems, eq(galleryItems.albumId, galleryAlbums.id))
      .groupBy(galleryAlbums.id)
      .orderBy(desc(galleryAlbums.createdAt), desc(galleryAlbums.id));
  } catch {
    throw new GalleryApplicationError(
      "UNABLE_TO_LOAD",
      "Unable to load albums.",
    );
  }
}

export const galleryAlbumMetadataSchema = galleryMetadataSchema
  .omit({ albumId: true })
  .extend({
    name: z.string().trim().min(1).max(255),
    category: z.string().trim().min(1).max(100),
  })
  .strict();

export async function createGalleryAlbum(input: {
  metadata: z.input<typeof galleryAlbumMetadataSchema>;
  images: GalleryImageInput[];
}) {
  await requireAuthenticatedAdmin();
  const parsed = galleryAlbumMetadataSchema.safeParse(input.metadata);
  if (
    !parsed.success ||
    !Array.isArray(input.images) ||
    input.images.length < 1 ||
    input.images.length > 25
  )
    throw new GalleryApplicationError(
      "INVALID_DATA",
      "An album requires valid details and 1–25 photos.",
    );
  const images = input.images.map(parseImage);
  images.forEach(validateGalleryImage);
  const albumId = randomUUID();
  const uploads: Awaited<ReturnType<typeof uploadGalleryImage>>[] = [];
  try {
    for (const image of images) uploads.push(await uploadGalleryImage(image));
    await db.transaction(async (transaction) => {
      const {
        name,
        title,
        caption,
        category,
        contextName,
        published,
        sortOrder,
      } = parsed.data;
      await transaction
        .insert(galleryAlbums)
        .values({ id: albumId, name, title, caption, category, contextName });
      const photos = uploads.map((image) => ({
        id: randomUUID(),
        albumId,
        title,
        caption,
        category,
        contextName,
        published,
        sortOrder,
        imageUrl: image.publicUrl!,
        imageStorageKey: image.key,
        imageWidth: image.imageWidth,
        imageHeight: image.imageHeight,
      }));
      await transaction.insert(galleryItems).values(photos);
    });
    return { id: albumId };
  } catch (error) {
    const cleanup: boolean[] = [];
    for (const image of uploads)
      cleanup.push(
        await tryDeleteMediaForCleanup(image.key, "album rollback", albumId),
      );
    const cleanupWarning =
      !cleanup.every(Boolean) ||
      (error instanceof GalleryApplicationError && error.cleanupWarning);
    const failure = new GalleryApplicationError(
      "UNABLE_TO_SAVE",
      cleanupWarning
        ? "Album could not be saved; media cleanup needs attention."
        : "Album could not be saved. Uploaded photos were removed.",
      error,
    );
    failure.cleanupWarning = cleanupWarning;
    throw failure;
  }
}

export async function deleteGalleryAlbum(idInput: unknown) {
  await requireAuthenticatedAdmin();
  const id = parseGalleryId(idInput);
  let photos;
  try {
    photos = await db.transaction(async (transaction) => {
      const [album] = await transaction
        .select()
        .from(galleryAlbums)
        .where(eq(galleryAlbums.id, id))
        .for("update");
      if (!album)
        throw new GalleryApplicationError("NOT_FOUND", "Album not found.");
      const items = await transaction
        .select()
        .from(galleryItems)
        .where(eq(galleryItems.albumId, id));
      await transaction
        .delete(galleryItems)
        .where(eq(galleryItems.albumId, id));
      await transaction.delete(galleryAlbums).where(eq(galleryAlbums.id, id));
      return items;
    });
  } catch (error) {
    if (error instanceof GalleryApplicationError) throw error;
    throw new GalleryApplicationError(
      "UNABLE_TO_DELETE",
      "Album could not be deleted.",
    );
  }
  const cleanup: boolean[] = [];
  for (const key of new Set(photos.map((photo) => photo.imageStorageKey)))
    cleanup.push(await tryDeleteMediaForCleanup(key, "album delete", id));
  return {
    deleted: true as const,
    cleanupWarning: cleanup.some((result) => !result),
  };
}

const effectiveColumns = {
  id: galleryItems.id,
  title: sql<string>`coalesce(${galleryAlbums.title}, ${galleryItems.title})`,
  caption: sql<
    string | null
  >`case when ${galleryAlbums.id} is not null then ${galleryAlbums.caption} else ${galleryItems.caption} end`,
  category: sql<
    string | null
  >`coalesce(${galleryAlbums.category}, ${galleryItems.category})`,
  contextName: sql<
    string | null
  >`case when ${galleryAlbums.id} is not null then ${galleryAlbums.contextName} else ${galleryItems.contextName} end`,
  albumId: galleryItems.albumId,
  albumName: galleryAlbums.name,
  imageUrl: galleryItems.imageUrl,
  imageWidth: galleryItems.imageWidth,
  imageHeight: galleryItems.imageHeight,
  createdAt: galleryItems.createdAt,
};
const legacyDimensions = new Map<string, { width: number; height: number }>();
async function getLegacyDimensions(imageUrl: string) {
  const cached = legacyDimensions.get(imageUrl);
  if (cached) return cached;
  try {
    const response = await fetch(imageUrl, {
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok) return null;
    const dimensions = imageSize(new Uint8Array(await response.arrayBuffer()));
    if (!dimensions.width || !dimensions.height) return null;
    if (legacyDimensions.size >= 50)
      legacyDimensions.delete(legacyDimensions.keys().next().value!);
    const result = { width: dimensions.width, height: dimensions.height };
    legacyDimensions.set(imageUrl, result);
    return result;
  } catch {
    return null;
  }
}

export async function getPublishedGalleryPage(input: unknown = {}) {
  const parsed = galleryQuerySchema.safeParse(input);
  if (!parsed.success)
    throw new GalleryApplicationError(
      "INVALID_DATA",
      "Invalid gallery filters.",
    );
  const query = parsed.data;
  const predicates = [eq(galleryItems.published, true)];
  if (query.category)
    predicates.push(eq(effectiveColumns.category, query.category));
  if (query.album) predicates.push(eq(galleryItems.albumId, query.album));
  if (query.q) {
    // Escape SQL LIKE wildcards, keeping the query parameterized.
    const pattern = `%${query.q.replace(/[=%_]/g, (character) => `=${character}`)}%`;
    predicates.push(
      sql`(${effectiveColumns.title} like ${pattern} escape '=' or ${effectiveColumns.caption} like ${pattern} escape '=' or ${galleryAlbums.name} like ${pattern} escape '=' or ${effectiveColumns.contextName} like ${pattern} escape '=')`,
    );
  }
  try {
    const result = await db.transaction(async (transaction) => {
      const [count] = await transaction
        .select({ count: sql<number>`count(*)`.mapWith(Number) })
        .from(galleryItems)
        .leftJoin(galleryAlbums, eq(galleryItems.albumId, galleryAlbums.id))
        .where(and(...predicates));
      if (!count) throw new Error("Gallery count unavailable.");
      const totalPages = Math.ceil(count.count / 25),
        page = Math.min(query.page, Math.max(totalPages, 1));
      const items = await transaction
        .select(effectiveColumns)
        .from(galleryItems)
        .leftJoin(galleryAlbums, eq(galleryItems.albumId, galleryAlbums.id))
        .where(and(...predicates))
        .orderBy(...galleryOrdering)
        .limit(25)
        .offset((page - 1) * 25);
      const albums = await transaction
        .select({ id: galleryAlbums.id, name: galleryAlbums.name })
        .from(galleryAlbums)
        .innerJoin(
          galleryItems,
          and(
            eq(galleryItems.albumId, galleryAlbums.id),
            eq(galleryItems.published, true),
          ),
        )
        .groupBy(galleryAlbums.id)
        .orderBy(galleryAlbums.name);
      const categories = await transaction
        .selectDistinct({ category: effectiveColumns.category })
        .from(galleryItems)
        .leftJoin(galleryAlbums, eq(galleryItems.albumId, galleryAlbums.id))
        .where(eq(galleryItems.published, true));
      return {
        items,
        totalCount: count.count,
        totalPages,
        page,
        pageSize: 25,
        albums,
        categories: [
          ...new Set([
            "Event",
            "Activity",
            "Session",
            "Other",
            ...categories.flatMap((row) =>
              row.category ? [row.category] : [],
            ),
          ]),
        ].sort(),
      };
    });
    result.items = await Promise.all(
      result.items.map(async (item) => {
        if (item.imageWidth && item.imageHeight) return item;
        const dimensions = await getLegacyDimensions(item.imageUrl);
        return {
          ...item,
          imageWidth: dimensions?.width ?? null,
          imageHeight: dimensions?.height ?? null,
        };
      }),
    );
    return result;
  } catch {
    throw new GalleryApplicationError(
      "UNABLE_TO_LOAD",
      "Gallery is temporarily unavailable. Please try again later.",
    );
  }
}
