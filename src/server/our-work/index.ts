import "@tanstack/react-start/server-only";

import { randomUUID } from "node:crypto";

import { and, asc, desc, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";

import { getCurrentAdmin } from "@/server/auth";
import { db } from "@/server/db";
import { ourWorkItems, type OurWorkItem } from "@/server/db/schema";
import {
  deleteMedia,
  MediaImageValidationError,
  MediaStorageConfigurationError,
  uploadImage,
} from "@/server/storage";

const MYSQL_INT_MIN = -2_147_483_648;
const MYSQL_INT_MAX = 2_147_483_647;
const OUR_WORK_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function nullableTrimmedString(maxLength: number) {
  return z.preprocess((value) => {
    if (value === undefined || value === null) return null;
    if (typeof value !== "string") return value;

    const normalized = value.trim();
    return normalized.length === 0 ? null : normalized;
  }, z.string().max(maxLength).nullable());
}

function normalizedStringArray(itemMaxLength: number, arrayMaxLength: number) {
  return z.preprocess(
    (value) => {
      if (!Array.isArray(value)) return value;

      const normalized = value
        .map((item) => (typeof item === "string" ? item.trim() : item))
        .filter((item) => item !== "");

      return Array.from(new Set(normalized));
    },
    z.array(z.string().max(itemMaxLength)).max(arrayMaxLength),
  );
}

const nullableNonNegativeIntegerSchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "string") {
    const normalized = value.trim();
    if (normalized === "") return null;
    if (/^\d+$/.test(normalized)) return Number(normalized);
  }
  return value;
}, z.number().int().min(0).max(MYSQL_INT_MAX).nullable());

const nullableSortOrderSchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "string") {
    const normalized = value.trim();
    if (normalized === "") return null;
    if (/^-?\d+$/.test(normalized)) return Number(normalized);
  }
  return value;
}, z.number().int().min(MYSQL_INT_MIN).max(MYSQL_INT_MAX).nullable());

export const ourWorkMetadataSchema = z
  .object({
    slug: z.string().trim().min(1).max(191).regex(OUR_WORK_SLUG_PATTERN),
    type: z.string().trim().min(1).max(100),
    title: z.string().trim().min(1).max(255),
    description: z.string().trim().min(1).max(5_000),
    tags: normalizedStringArray(100, 50),
    aboutProgram: nullableTrimmedString(20_000).optional().default(null),
    advisoryNote: nullableTrimmedString(5_000).optional().default(null),
    featured: z.boolean().optional().default(false),
    awarenessSessionLabel: nullableTrimmedString(120).optional().default(null),
    awarenessSessionNote: nullableTrimmedString(1_000).optional().default(null),
    participantLabel: nullableTrimmedString(120).optional().default(null),
    participantNote: nullableTrimmedString(1_000).optional().default(null),
    whatWeCover: normalizedStringArray(500, 100),
    awarenessSessionCount: nullableNonNegativeIntegerSchema
      .optional()
      .default(null),
    participantCount: nullableNonNegativeIntegerSchema.optional().default(null),
    published: z.boolean(),
    sortOrder: nullableSortOrderSchema.optional().default(null),
  })
  .strict();

const ourWorkIdSchema = z.string().uuid();

const ourWorkImageSchema = z
  .object({
    buffer: z.custom<Buffer>((value) => Buffer.isBuffer(value)),
    mimeType: z.string().trim().min(1).max(255),
  })
  .strict();

export type OurWorkMetadataInput = z.input<typeof ourWorkMetadataSchema>;
export type OurWorkImageInput = z.input<typeof ourWorkImageSchema>;
export type OurWorkAdminItem = OurWorkItem;
export type PublishedOurWorkItem = Pick<
  OurWorkItem,
  | "id"
  | "slug"
  | "type"
  | "title"
  | "description"
  | "tags"
  | "imageUrl"
  | "aboutProgram"
  | "advisoryNote"
  | "featured"
  | "awarenessSessionLabel"
  | "awarenessSessionNote"
  | "participantLabel"
  | "participantNote"
  | "whatWeCover"
  | "awarenessSessionCount"
  | "participantCount"
  | "sortOrder"
  | "createdAt"
>;

export type OurWorkErrorCode =
  | "UNAUTHORIZED"
  | "INVALID_OUR_WORK_DATA"
  | "SLUG_ALREADY_EXISTS"
  | "NOT_FOUND"
  | "STORAGE_NOT_CONFIGURED"
  | "INVALID_IMAGE"
  | "FILE_TOO_LARGE"
  | "IMAGE_UPLOAD_FAILED"
  | "UNABLE_TO_LOAD"
  | "SAVE_FAILED"
  | "UPDATE_FAILED"
  | "DELETE_FAILED";

export class OurWorkApplicationError extends Error {
  readonly code: OurWorkErrorCode;

  constructor(code: OurWorkErrorCode, message: string, cause?: unknown) {
    super(message);
    this.name = "OurWorkApplicationError";
    this.code = code;
    if (cause !== undefined) this.cause = cause;
  }
}

export type OurWorkFailure = {
  success: false;
  code: OurWorkErrorCode;
  error: string;
};

const adminColumns = {
  id: ourWorkItems.id,
  slug: ourWorkItems.slug,
  type: ourWorkItems.type,
  title: ourWorkItems.title,
  description: ourWorkItems.description,
  tags: ourWorkItems.tags,
  imageUrl: ourWorkItems.imageUrl,
  imageStorageKey: ourWorkItems.imageStorageKey,
  aboutProgram: ourWorkItems.aboutProgram,
  advisoryNote: ourWorkItems.advisoryNote,
  featured: ourWorkItems.featured,
  awarenessSessionLabel: ourWorkItems.awarenessSessionLabel,
  awarenessSessionNote: ourWorkItems.awarenessSessionNote,
  participantLabel: ourWorkItems.participantLabel,
  participantNote: ourWorkItems.participantNote,
  whatWeCover: ourWorkItems.whatWeCover,
  awarenessSessionCount: ourWorkItems.awarenessSessionCount,
  participantCount: ourWorkItems.participantCount,
  published: ourWorkItems.published,
  sortOrder: ourWorkItems.sortOrder,
  createdAt: ourWorkItems.createdAt,
  updatedAt: ourWorkItems.updatedAt,
};

const publicColumns = {
  id: ourWorkItems.id,
  slug: ourWorkItems.slug,
  type: ourWorkItems.type,
  title: ourWorkItems.title,
  description: ourWorkItems.description,
  tags: ourWorkItems.tags,
  imageUrl: ourWorkItems.imageUrl,
  aboutProgram: ourWorkItems.aboutProgram,
  advisoryNote: ourWorkItems.advisoryNote,
  featured: ourWorkItems.featured,
  awarenessSessionLabel: ourWorkItems.awarenessSessionLabel,
  awarenessSessionNote: ourWorkItems.awarenessSessionNote,
  participantLabel: ourWorkItems.participantLabel,
  participantNote: ourWorkItems.participantNote,
  whatWeCover: ourWorkItems.whatWeCover,
  awarenessSessionCount: ourWorkItems.awarenessSessionCount,
  participantCount: ourWorkItems.participantCount,
  sortOrder: ourWorkItems.sortOrder,
  createdAt: ourWorkItems.createdAt,
};

const ourWorkOrdering = [
  asc(sql`${ourWorkItems.sortOrder} IS NULL`),
  asc(ourWorkItems.sortOrder),
  desc(ourWorkItems.createdAt),
  asc(ourWorkItems.id),
] as const;

async function requireAuthenticatedAdmin(): Promise<void> {
  if (!(await getCurrentAdmin())) {
    throw new OurWorkApplicationError("UNAUTHORIZED", "Unauthorized.");
  }
}

function parseOurWorkId(id: unknown): string {
  const parsed = ourWorkIdSchema.safeParse(id);
  if (!parsed.success) {
    throw new OurWorkApplicationError(
      "INVALID_OUR_WORK_DATA",
      "Invalid Our Work data.",
    );
  }
  return parsed.data;
}

function parseMetadata(input: unknown) {
  const parsed = ourWorkMetadataSchema.safeParse(input);
  if (!parsed.success) {
    throw new OurWorkApplicationError(
      "INVALID_OUR_WORK_DATA",
      "Invalid Our Work data.",
    );
  }
  return parsed.data;
}

function parseImage(input: unknown) {
  const parsed = ourWorkImageSchema.safeParse(input);
  if (!parsed.success) {
    throw new OurWorkApplicationError("INVALID_IMAGE", "Invalid image.");
  }
  return parsed.data;
}

async function findOurWorkItem(id: string): Promise<OurWorkAdminItem | null> {
  const [item] = await db
    .select(adminColumns)
    .from(ourWorkItems)
    .where(eq(ourWorkItems.id, id))
    .limit(1);
  return item ?? null;
}

async function slugExists(
  slug: string,
  excludingId?: string,
): Promise<boolean> {
  const where = excludingId
    ? and(eq(ourWorkItems.slug, slug), ne(ourWorkItems.id, excludingId))
    : eq(ourWorkItems.slug, slug);
  const [item] = await db
    .select({ id: ourWorkItems.id })
    .from(ourWorkItems)
    .where(where)
    .limit(1);
  return Boolean(item);
}

function isDuplicateEntryError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as {
    code?: unknown;
    errno?: unknown;
    cause?: unknown;
  };
  return (
    candidate.code === "ER_DUP_ENTRY" ||
    candidate.errno === 1062 ||
    (candidate.cause !== undefined && isDuplicateEntryError(candidate.cause))
  );
}

function slugAlreadyExistsError(cause?: unknown): OurWorkApplicationError {
  return new OurWorkApplicationError(
    "SLUG_ALREADY_EXISTS",
    "That URL slug is already in use. Choose another slug.",
    cause,
  );
}

function logCleanupWarning(operation: string, itemId: string): void {
  console.warn(
    `[our-work] ${operation} cleanup could not be completed for item ${itemId}.`,
  );
}

async function tryDeleteMediaForCleanup(
  key: string,
  operation: string,
  itemId: string,
): Promise<boolean> {
  try {
    await deleteMedia(key);
    return true;
  } catch {
    logCleanupWarning(operation, itemId);
    return false;
  }
}

async function uploadOurWorkImage(imageInput: unknown) {
  const image = parseImage(imageInput);

  try {
    return await uploadImage({ ...image, category: "our-work" });
  } catch (error) {
    if (error instanceof MediaStorageConfigurationError) {
      throw new OurWorkApplicationError(
        "STORAGE_NOT_CONFIGURED",
        "Media storage is not configured.",
        error,
      );
    }
    if (error instanceof MediaImageValidationError) {
      const fileTooLarge = error.message.includes("8 MB");
      throw new OurWorkApplicationError(
        fileTooLarge ? "FILE_TOO_LARGE" : "INVALID_IMAGE",
        fileTooLarge ? "Image must be 8 MB or smaller." : "Invalid image.",
        error,
      );
    }
    throw new OurWorkApplicationError(
      "IMAGE_UPLOAD_FAILED",
      "Image upload failed.",
      error,
    );
  }
}

export function toOurWorkFailure(
  error: unknown,
  fallback: { code: OurWorkErrorCode; message: string },
): OurWorkFailure {
  if (error instanceof OurWorkApplicationError) {
    return { success: false, code: error.code, error: error.message };
  }

  console.error(`[our-work] ${fallback.code.toLowerCase()} operation failed.`);
  return { success: false, code: fallback.code, error: fallback.message };
}

export async function getOurWorkItemsForAdmin(): Promise<OurWorkAdminItem[]> {
  await requireAuthenticatedAdmin();

  try {
    return await db
      .select(adminColumns)
      .from(ourWorkItems)
      .orderBy(...ourWorkOrdering);
  } catch (error) {
    throw new OurWorkApplicationError(
      "UNABLE_TO_LOAD",
      "Unable to load Our Work items.",
      error,
    );
  }
}

export async function getOurWorkItemById(
  idInput: unknown,
): Promise<OurWorkAdminItem | null> {
  await requireAuthenticatedAdmin();
  const id = parseOurWorkId(idInput);

  try {
    return await findOurWorkItem(id);
  } catch (error) {
    if (error instanceof OurWorkApplicationError) throw error;
    throw new OurWorkApplicationError(
      "UNABLE_TO_LOAD",
      "Unable to load the Our Work item.",
      error,
    );
  }
}

export async function getPublishedOurWorkItems(): Promise<
  PublishedOurWorkItem[]
> {
  try {
    return await db
      .select(publicColumns)
      .from(ourWorkItems)
      .where(eq(ourWorkItems.published, true))
      .orderBy(...ourWorkOrdering);
  } catch (error) {
    throw new OurWorkApplicationError(
      "UNABLE_TO_LOAD",
      "Unable to load Our Work items.",
      error,
    );
  }
}

export async function getPublishedOurWorkItemBySlug(
  slugInput: unknown,
): Promise<PublishedOurWorkItem | null> {
  const parsed = ourWorkMetadataSchema.shape.slug.safeParse(slugInput);
  if (!parsed.success) return null;

  try {
    const [item] = await db
      .select(publicColumns)
      .from(ourWorkItems)
      .where(
        and(
          eq(ourWorkItems.slug, parsed.data),
          eq(ourWorkItems.published, true),
        ),
      )
      .limit(1);
    return item ?? null;
  } catch (error) {
    throw new OurWorkApplicationError(
      "UNABLE_TO_LOAD",
      "Unable to load the Our Work item.",
      error,
    );
  }
}

export async function createOurWorkItem(input: {
  metadata: OurWorkMetadataInput;
  image: OurWorkImageInput;
}): Promise<OurWorkAdminItem> {
  await requireAuthenticatedAdmin();
  const metadata = parseMetadata(input.metadata);
  const id = randomUUID();
  if (await slugExists(metadata.slug)) throw slugAlreadyExistsError();
  const uploaded = await uploadOurWorkImage(input.image);

  if (!uploaded.publicUrl) {
    await tryDeleteMediaForCleanup(uploaded.key, "create", id);
    throw new OurWorkApplicationError(
      "STORAGE_NOT_CONFIGURED",
      "Media storage is not configured.",
    );
  }

  try {
    return await db.transaction(async (transaction) => {
      await transaction.insert(ourWorkItems).values({
        id,
        ...metadata,
        imageUrl: uploaded.publicUrl!,
        imageStorageKey: uploaded.key,
      });

      const [created] = await transaction
        .select(adminColumns)
        .from(ourWorkItems)
        .where(eq(ourWorkItems.id, id))
        .limit(1);
      if (!created) throw new Error("Our Work insert did not return a record.");
      return created;
    });
  } catch (error) {
    await tryDeleteMediaForCleanup(uploaded.key, "create", id);
    if (isDuplicateEntryError(error)) throw slugAlreadyExistsError(error);
    throw new OurWorkApplicationError(
      "SAVE_FAILED",
      "Unable to save Our Work item.",
      error,
    );
  }
}

export async function updateOurWorkItemMetadata(input: {
  id: unknown;
  metadata: OurWorkMetadataInput;
}): Promise<OurWorkAdminItem> {
  await requireAuthenticatedAdmin();
  const id = parseOurWorkId(input.id);
  const metadata = parseMetadata(input.metadata);

  try {
    if (!(await findOurWorkItem(id))) {
      throw new OurWorkApplicationError(
        "NOT_FOUND",
        "Our Work item not found.",
      );
    }

    if (await slugExists(metadata.slug, id)) throw slugAlreadyExistsError();

    await db.update(ourWorkItems).set(metadata).where(eq(ourWorkItems.id, id));
    const updated = await findOurWorkItem(id);
    if (!updated) {
      throw new OurWorkApplicationError(
        "NOT_FOUND",
        "Our Work item not found.",
      );
    }
    return updated;
  } catch (error) {
    if (error instanceof OurWorkApplicationError) throw error;
    if (isDuplicateEntryError(error)) throw slugAlreadyExistsError(error);
    throw new OurWorkApplicationError(
      "UPDATE_FAILED",
      "Unable to update Our Work item.",
      error,
    );
  }
}

export async function replaceOurWorkItemImage(input: {
  id: unknown;
  image: OurWorkImageInput;
}): Promise<{ item: OurWorkAdminItem; cleanupWarning: boolean }> {
  await requireAuthenticatedAdmin();
  const id = parseOurWorkId(input.id);

  let existing: OurWorkAdminItem | null;
  try {
    existing = await findOurWorkItem(id);
  } catch (error) {
    throw new OurWorkApplicationError(
      "UPDATE_FAILED",
      "Unable to update Our Work item.",
      error,
    );
  }
  if (!existing) {
    throw new OurWorkApplicationError("NOT_FOUND", "Our Work item not found.");
  }

  const uploaded = await uploadOurWorkImage(input.image);
  if (!uploaded.publicUrl) {
    await tryDeleteMediaForCleanup(uploaded.key, "replace-new", id);
    throw new OurWorkApplicationError(
      "STORAGE_NOT_CONFIGURED",
      "Media storage is not configured.",
    );
  }

  let updated: OurWorkAdminItem;
  try {
    updated = await db.transaction(async (transaction) => {
      await transaction
        .update(ourWorkItems)
        .set({
          imageUrl: uploaded.publicUrl!,
          imageStorageKey: uploaded.key,
        })
        .where(eq(ourWorkItems.id, id));

      const [item] = await transaction
        .select(adminColumns)
        .from(ourWorkItems)
        .where(eq(ourWorkItems.id, id))
        .limit(1);
      if (!item) throw new Error("Our Work replacement record was not found.");
      return item;
    });
  } catch (error) {
    await tryDeleteMediaForCleanup(uploaded.key, "replace-new", id);
    throw new OurWorkApplicationError(
      "UPDATE_FAILED",
      "Unable to update Our Work item.",
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

export async function deleteOurWorkItem(
  idInput: unknown,
): Promise<{ deleted: true; cleanupWarning: boolean }> {
  await requireAuthenticatedAdmin();
  const id = parseOurWorkId(idInput);

  let deletedItem: OurWorkAdminItem | null;
  try {
    deletedItem = await db.transaction(async (transaction) => {
      const [existing] = await transaction
        .select(adminColumns)
        .from(ourWorkItems)
        .where(eq(ourWorkItems.id, id))
        .limit(1);
      if (!existing) return null;

      await transaction.delete(ourWorkItems).where(eq(ourWorkItems.id, id));
      return existing;
    });
  } catch (error) {
    throw new OurWorkApplicationError(
      "DELETE_FAILED",
      "Unable to delete Our Work item.",
      error,
    );
  }

  if (!deletedItem) {
    throw new OurWorkApplicationError("NOT_FOUND", "Our Work item not found.");
  }

  const mediaDeleted = await tryDeleteMediaForCleanup(
    deletedItem.imageStorageKey,
    "delete",
    id,
  );
  return { deleted: true, cleanupWarning: !mediaDeleted };
}
