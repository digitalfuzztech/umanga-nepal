import "@tanstack/react-start/server-only";

import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { getCurrentAdmin } from "@/server/auth";
import { db } from "@/server/db";
import { storyItems, type StoryItem } from "@/server/db/schema";
import {
  deleteMedia,
  mediaExists,
  MAX_IMAGE_SIZE_BYTES,
  MediaImageValidationError,
  MediaStorageConfigurationError,
  uploadImage,
} from "@/server/storage";

const slugSchema = z
  .string()
  .trim()
  .min(1)
  .max(191)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const idSchema = z.string().uuid();
const nullableSortOrder = z.preprocess((value) => {
  if (value === undefined || value === null) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (/^-?\d+$/.test(trimmed)) return Number(trimmed);
  }
  return value;
}, z.number().int().min(-2_147_483_648).max(2_147_483_647).nullable());

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (
    year === undefined ||
    month === undefined ||
    day === undefined ||
    year < 1000 ||
    month < 1 ||
    month > 12
  )
    return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day >= 1 && day <= days[month - 1]!;
}

const nullableStoryDate = z.preprocess((value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value.trim() || null;
  return value;
}, z.string().refine(isCalendarDate).nullable());

export const storyMetadataSchema = z
  .object({
    slug: slugSchema,
    title: z.string().trim().min(1).max(255),
    excerpt: z.string().trim().min(1).max(5_000),
    content: z.string().trim().min(1).max(200_000),
    category: z.string().trim().min(1).max(100),
    attribution: z.string().trim().min(1).max(255),
    storyDate: nullableStoryDate.optional().default(null),
    demoContent: z.boolean().optional().default(false),
    published: z.boolean().optional().default(true),
    sortOrder: nullableSortOrder.optional().default(null),
  })
  .strict();
export const storyMetadataUpdateSchema = storyMetadataSchema.partial().strict();
const imageSchema = z
  .object({
    buffer: z.custom<Buffer>((value) => Buffer.isBuffer(value)),
    mimeType: z.string().trim().min(1).max(255),
  })
  .strict();

export type StoryMetadataInput = z.input<typeof storyMetadataSchema>;
export type StoryMetadataUpdateInput = z.input<
  typeof storyMetadataUpdateSchema
>;
export type StoryImageInput = z.input<typeof imageSchema>;
export type StoryAdminItem = StoryItem;
export type PublishedStory = Pick<
  StoryItem,
  | "id"
  | "slug"
  | "title"
  | "excerpt"
  | "content"
  | "category"
  | "attribution"
  | "imageUrl"
  | "storyDate"
  | "demoContent"
  | "sortOrder"
  | "createdAt"
>;
export type StoryErrorCode =
  | "UNAUTHORIZED"
  | "INVALID_STORY_DATA"
  | "SLUG_ALREADY_EXISTS"
  | "NOT_FOUND"
  | "INVALID_IMAGE"
  | "FILE_TOO_LARGE"
  | "STORAGE_NOT_CONFIGURED"
  | "IMAGE_UPLOAD_FAILED"
  | "UNABLE_TO_LOAD"
  | "SAVE_FAILED"
  | "UPDATE_FAILED"
  | "DELETE_FAILED";

export class StoryApplicationError extends Error {
  constructor(
    readonly code: StoryErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "StoryApplicationError";
  }
}
export type StoryFailure = {
  success: false;
  code: StoryErrorCode;
  error: string;
};
export async function storyImageFromFile(file: File): Promise<StoryImageInput> {
  if (file.size > MAX_IMAGE_SIZE_BYTES)
    throw new StoryApplicationError(
      "FILE_TOO_LARGE",
      "Image must be 8 MB or smaller.",
    );
  if (file.size === 0)
    throw new StoryApplicationError("INVALID_IMAGE", "Invalid image.");
  return { buffer: Buffer.from(await file.arrayBuffer()), mimeType: file.type };
}
export function toStoryFailure(
  error: unknown,
  fallback: { code: StoryErrorCode; message: string },
): StoryFailure {
  if (error instanceof StoryApplicationError)
    return { success: false, code: error.code, error: error.message };
  console.error(`[stories] ${fallback.code.toLowerCase()} operation failed.`);
  return { success: false, code: fallback.code, error: fallback.message };
}

export async function requireStoryAdmin(): Promise<void> {
  let authenticated: boolean;
  try {
    authenticated = Boolean(await getCurrentAdmin());
  } catch {
    throw new StoryApplicationError(
      "UNABLE_TO_LOAD",
      "Unable to verify admin session.",
    );
  }
  if (!authenticated)
    throw new StoryApplicationError("UNAUTHORIZED", "Unauthorized.");
}

function parseId(value: unknown): string {
  const parsed = idSchema.safeParse(value);
  if (!parsed.success)
    throw new StoryApplicationError(
      "INVALID_STORY_DATA",
      "Invalid Story data.",
    );
  return parsed.data;
}
function parseMetadata(value: unknown) {
  const parsed = storyMetadataSchema.safeParse(value);
  if (!parsed.success)
    throw new StoryApplicationError(
      "INVALID_STORY_DATA",
      "Invalid Story data.",
    );
  return parsed.data;
}
const publicColumns = {
  id: storyItems.id,
  slug: storyItems.slug,
  title: storyItems.title,
  excerpt: storyItems.excerpt,
  content: storyItems.content,
  category: storyItems.category,
  attribution: storyItems.attribution,
  imageUrl: storyItems.imageUrl,
  storyDate: storyItems.storyDate,
  demoContent: storyItems.demoContent,
  sortOrder: storyItems.sortOrder,
  createdAt: storyItems.createdAt,
};
// Explicit editorial positions first, then dated/newer Stories, with ID as a stable tie-breaker.
const ordering = [
  asc(sql`${storyItems.sortOrder} IS NULL`),
  asc(storyItems.sortOrder),
  desc(storyItems.storyDate),
  desc(storyItems.createdAt),
  asc(storyItems.id),
] as const;
async function slugExists(
  slug: string,
  excludingId?: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: storyItems.id })
    .from(storyItems)
    .where(
      excludingId
        ? and(eq(storyItems.slug, slug), ne(storyItems.id, excludingId))
        : eq(storyItems.slug, slug),
    )
    .limit(1);
  return Boolean(row);
}
function isDuplicate(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as {
    code?: unknown;
    errno?: unknown;
    cause?: unknown;
  };
  return (
    candidate.code === "ER_DUP_ENTRY" ||
    candidate.errno === 1062 ||
    (candidate.cause !== undefined && isDuplicate(candidate.cause))
  );
}
function duplicateSlug(): StoryApplicationError {
  return new StoryApplicationError(
    "SLUG_ALREADY_EXISTS",
    "That URL slug is already in use. Choose another slug.",
  );
}
function notFound(): StoryApplicationError {
  return new StoryApplicationError("NOT_FOUND", "Story not found.");
}
async function cleanup(key: string, id: string): Promise<boolean> {
  try {
    await deleteMedia(key);
    return true;
  } catch {
    console.warn(
      `[stories] Media cleanup could not be completed for Story ${id}.`,
    );
    return false;
  }
}

async function uploadStoryImage(
  input: unknown,
  id: string,
): Promise<{ key: string; publicUrl: string }> {
  const parsed = imageSchema.safeParse(input);
  if (!parsed.success)
    throw new StoryApplicationError("INVALID_IMAGE", "Invalid image.");
  let uploaded: Awaited<ReturnType<typeof uploadImage>>;
  try {
    uploaded = await uploadImage({ ...parsed.data, category: "stories" });
  } catch (error) {
    if (error instanceof MediaStorageConfigurationError)
      throw new StoryApplicationError(
        "STORAGE_NOT_CONFIGURED",
        "Media storage is not configured.",
      );
    if (error instanceof MediaImageValidationError) {
      const tooLarge = error.message.includes("8 MB");
      throw new StoryApplicationError(
        tooLarge ? "FILE_TOO_LARGE" : "INVALID_IMAGE",
        tooLarge ? "Image must be 8 MB or smaller." : "Invalid image.",
      );
    }
    throw new StoryApplicationError(
      "IMAGE_UPLOAD_FAILED",
      "Image upload failed.",
    );
  }
  try {
    if (
      !uploaded.publicUrl ||
      new URL(uploaded.publicUrl).protocol !== "https:"
    )
      throw new StoryApplicationError(
        "STORAGE_NOT_CONFIGURED",
        "A public HTTPS media URL is required.",
      );
    if (!(await mediaExists(uploaded.key)))
      throw new Error("Media unavailable.");
    const response = await fetch(uploaded.publicUrl, {
      signal: AbortSignal.timeout(15_000),
    });
    const available =
      response.ok && response.headers.get("content-type")?.startsWith("image/");
    await response.body?.cancel();
    if (!available) throw new Error("Media unavailable.");
    return { key: uploaded.key, publicUrl: uploaded.publicUrl };
  } catch (error) {
    await cleanup(uploaded.key, id);
    if (error instanceof StoryApplicationError) throw error;
    throw new StoryApplicationError(
      "IMAGE_UPLOAD_FAILED",
      "Uploaded image could not be verified.",
    );
  }
}

export async function getStoriesForAdmin(): Promise<StoryAdminItem[]> {
  await requireStoryAdmin();
  try {
    return await db
      .select()
      .from(storyItems)
      .orderBy(...ordering);
  } catch {
    throw new StoryApplicationError(
      "UNABLE_TO_LOAD",
      "Unable to load Stories.",
    );
  }
}
export async function getStoryById(
  idInput: unknown,
): Promise<StoryAdminItem | null> {
  await requireStoryAdmin();
  const id = parseId(idInput);
  try {
    const [item] = await db
      .select()
      .from(storyItems)
      .where(eq(storyItems.id, id))
      .limit(1);
    return item ?? null;
  } catch {
    throw new StoryApplicationError(
      "UNABLE_TO_LOAD",
      "Unable to load the Story.",
    );
  }
}
export async function getPublishedStories(): Promise<PublishedStory[]> {
  try {
    return await db
      .select(publicColumns)
      .from(storyItems)
      .where(eq(storyItems.published, true))
      .orderBy(...ordering);
  } catch {
    throw new StoryApplicationError(
      "UNABLE_TO_LOAD",
      "Unable to load Stories.",
    );
  }
}
export async function getPublishedStoryBySlug(
  input: unknown,
): Promise<PublishedStory | null> {
  const parsed = slugSchema.safeParse(input);
  if (!parsed.success) return null;
  try {
    const [item] = await db
      .select(publicColumns)
      .from(storyItems)
      .where(
        and(eq(storyItems.slug, parsed.data), eq(storyItems.published, true)),
      )
      .limit(1);
    return item ?? null;
  } catch {
    throw new StoryApplicationError(
      "UNABLE_TO_LOAD",
      "Unable to load the Story.",
    );
  }
}

export async function createStory(input: {
  metadata: StoryMetadataInput;
  image: StoryImageInput;
}): Promise<StoryAdminItem> {
  await requireStoryAdmin();
  const metadata = parseMetadata(input.metadata);
  try {
    if (await slugExists(metadata.slug)) throw duplicateSlug();
  } catch (error) {
    if (error instanceof StoryApplicationError) throw error;
    throw new StoryApplicationError("SAVE_FAILED", "Unable to save Story.");
  }
  const id = randomUUID();
  const uploaded = await uploadStoryImage(input.image, id);
  try {
    return await db.transaction(async (transaction) => {
      await transaction.insert(storyItems).values({
        id,
        ...metadata,
        imageUrl: uploaded.publicUrl,
        imageStorageKey: uploaded.key,
      });
      const [item] = await transaction
        .select()
        .from(storyItems)
        .where(eq(storyItems.id, id))
        .limit(1);
      if (!item) throw new Error("Insert failed.");
      return item;
    });
  } catch (error) {
    await cleanup(uploaded.key, id);
    if (isDuplicate(error)) throw duplicateSlug();
    throw new StoryApplicationError("SAVE_FAILED", "Unable to save Story.");
  }
}

export async function updateStoryMetadata(input: {
  id: unknown;
  metadata: StoryMetadataUpdateInput;
}): Promise<StoryAdminItem> {
  await requireStoryAdmin();
  const id = parseId(input.id);
  const patch = storyMetadataUpdateSchema.safeParse(input.metadata);
  if (!patch.success)
    throw new StoryApplicationError(
      "INVALID_STORY_DATA",
      "Invalid Story data.",
    );
  try {
    return await db.transaction(async (transaction) => {
      const [existing] = await transaction
        .select()
        .from(storyItems)
        .where(eq(storyItems.id, id))
        .limit(1)
        .for("update");
      if (!existing) throw notFound();
      const values = parseMetadata({
        slug: existing.slug,
        title: existing.title,
        excerpt: existing.excerpt,
        content: existing.content,
        category: existing.category,
        attribution: existing.attribution,
        storyDate: existing.storyDate,
        demoContent: existing.demoContent,
        published: existing.published,
        sortOrder: existing.sortOrder,
        ...Object.fromEntries(
          Object.entries(patch.data).filter(([, value]) => value !== undefined),
        ),
      });
      if (await slugExists(values.slug, id)) throw duplicateSlug();
      await transaction
        .update(storyItems)
        .set(values)
        .where(eq(storyItems.id, id));
      const [item] = await transaction
        .select()
        .from(storyItems)
        .where(eq(storyItems.id, id))
        .limit(1);
      if (!item) throw notFound();
      return item;
    });
  } catch (error) {
    if (error instanceof StoryApplicationError) throw error;
    if (isDuplicate(error)) throw duplicateSlug();
    throw new StoryApplicationError("UPDATE_FAILED", "Unable to update Story.");
  }
}

export async function replaceStoryImage(input: {
  id: unknown;
  image: StoryImageInput;
}): Promise<{ item: StoryAdminItem; cleanupWarning: boolean }> {
  await requireStoryAdmin();
  const id = parseId(input.id);
  const existing = await getStoryById(id);
  if (!existing) throw notFound();
  const uploaded = await uploadStoryImage(input.image, id);
  let item: StoryAdminItem;
  try {
    item = await db.transaction(async (transaction) => {
      const [current] = await transaction
        .select()
        .from(storyItems)
        .where(eq(storyItems.id, id))
        .limit(1)
        .for("update");
      if (!current) throw notFound();
      if (current.imageStorageKey !== existing.imageStorageKey)
        throw new StoryApplicationError(
          "UPDATE_FAILED",
          "Story image changed. Reload and try again.",
        );
      await transaction
        .update(storyItems)
        .set({ imageUrl: uploaded.publicUrl, imageStorageKey: uploaded.key })
        .where(eq(storyItems.id, id));
      const [updated] = await transaction
        .select()
        .from(storyItems)
        .where(eq(storyItems.id, id))
        .limit(1);
      if (!updated) throw notFound();
      return updated;
    });
  } catch (error) {
    await cleanup(uploaded.key, id);
    if (error instanceof StoryApplicationError) throw error;
    throw new StoryApplicationError(
      "UPDATE_FAILED",
      "Unable to update Story image.",
    );
  }
  return {
    item,
    cleanupWarning: !(await cleanup(existing.imageStorageKey, id)),
  };
}

export async function deleteStory(
  idInput: unknown,
): Promise<{ deleted: true; cleanupWarning: boolean }> {
  await requireStoryAdmin();
  const id = parseId(idInput);
  let existing: StoryAdminItem;
  try {
    existing = await db.transaction(async (transaction) => {
      const [item] = await transaction
        .select()
        .from(storyItems)
        .where(eq(storyItems.id, id))
        .limit(1)
        .for("update");
      if (!item) throw notFound();
      await transaction.delete(storyItems).where(eq(storyItems.id, id));
      return item;
    });
  } catch (error) {
    if (error instanceof StoryApplicationError) throw error;
    throw new StoryApplicationError("DELETE_FAILED", "Unable to delete Story.");
  }
  return {
    deleted: true,
    cleanupWarning: !(await cleanup(existing.imageStorageKey, id)),
  };
}
