import "@tanstack/react-start/server-only";

import { randomUUID } from "node:crypto";

import { asc, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

import { getCurrentAdmin } from "@/server/auth";
import { db } from "@/server/db";
import { galleryItems, type GalleryItem } from "@/server/db/schema";
import {
  deleteMedia,
  MediaImageValidationError,
  MediaStorageConfigurationError,
  uploadImage,
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
  asc(sql`${galleryItems.sortOrder} IS NULL`),
  asc(galleryItems.sortOrder),
  desc(galleryItems.createdAt),
  asc(galleryItems.id),
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
    await deleteMedia(key);
    return true;
  } catch {
    logCleanupWarning(operation, galleryItemId);
    return false;
  }
}

async function uploadGalleryImage(imageInput: unknown) {
  const image = parseImage(imageInput);

  try {
    return await uploadImage({ ...image, category: "gallery" });
  } catch (error) {
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
    throw new GalleryApplicationError(
      "IMAGE_UPLOAD_FAILED",
      "Image upload failed.",
      error,
    );
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

    await db.update(galleryItems).set(metadata).where(eq(galleryItems.id, id));
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
