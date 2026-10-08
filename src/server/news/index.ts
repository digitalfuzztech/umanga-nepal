import "@tanstack/react-start/server-only";

import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { getCurrentAdmin } from "@/server/auth";
import { db } from "@/server/db";
import { newsItems, type NewsItem } from "@/server/db/schema";
import {
  deleteMedia,
  mediaExists,
  MAX_IMAGE_SIZE_BYTES,
  MediaImageValidationError,
  MediaStorageConfigurationError,
  uploadImage,
} from "@/server/storage";

import {
  calendarDateSchema,
  idSchema,
  isDuplicate,
  slugSchema,
  sortOrderSchema,
} from "@/server/news-events/validation";

const nullableLocation = z.preprocess((value) => {
  if (value === null || value === undefined) return null;
  return typeof value === "string" ? value.trim() || null : value;
}, z.string().max(255).nullable());

export const newsMetadataSchema = z
  .object({
    slug: slugSchema,
    title: z.string().trim().min(1).max(255),
    excerpt: z.string().trim().min(1).max(5_000),
    content: z.string().trim().min(1).max(200_000),
    category: z.string().trim().min(1).max(100),
    location: nullableLocation.optional().default(null),
    newsDate: calendarDateSchema,
    demoContent: z.boolean().optional().default(false),
    published: z.boolean().optional().default(true),
    sortOrder: sortOrderSchema.optional().default(null),
  })
  .strict();
export const newsMetadataUpdateSchema = newsMetadataSchema.partial().strict();
const imageSchema = z
  .object({
    buffer: z.custom<Buffer>((value) => Buffer.isBuffer(value)),
    mimeType: z.string().trim().min(1).max(255),
  })
  .strict();

export type NewsMetadataInput = z.input<typeof newsMetadataSchema>;
export type NewsMetadataUpdateInput = z.input<typeof newsMetadataUpdateSchema>;
export type NewsImageInput = z.input<typeof imageSchema>;
export type NewsAdminItem = NewsItem;
export type PublishedNews = Pick<
  NewsItem,
  | "id"
  | "slug"
  | "title"
  | "excerpt"
  | "content"
  | "category"
  | "location"
  | "imageUrl"
  | "newsDate"
  | "demoContent"
  | "sortOrder"
  | "createdAt"
>;
export type NewsErrorCode =
  | "UNAUTHORIZED"
  | "INVALID_NEWS_DATA"
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

export class NewsApplicationError extends Error {
  constructor(
    readonly code: NewsErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "NewsApplicationError";
  }
}
export type NewsFailure = {
  success: false;
  code: NewsErrorCode;
  error: string;
};
export async function newsImageFromFile(file: File): Promise<NewsImageInput> {
  if (file.size > MAX_IMAGE_SIZE_BYTES)
    throw new NewsApplicationError(
      "FILE_TOO_LARGE",
      "Image must be 8 MB or smaller.",
    );
  if (file.size === 0)
    throw new NewsApplicationError("INVALID_IMAGE", "Invalid image.");
  return { buffer: Buffer.from(await file.arrayBuffer()), mimeType: file.type };
}
export function toNewsFailure(
  error: unknown,
  fallback: { code: NewsErrorCode; message: string },
): NewsFailure {
  if (error instanceof NewsApplicationError)
    return { success: false, code: error.code, error: error.message };
  console.error(`[news] ${fallback.code.toLowerCase()} operation failed.`);
  return { success: false, code: fallback.code, error: fallback.message };
}

export async function requireNewsAdmin(): Promise<void> {
  let authenticated: boolean;
  try {
    authenticated = Boolean(await getCurrentAdmin());
  } catch {
    throw new NewsApplicationError(
      "UNABLE_TO_LOAD",
      "Unable to verify admin session.",
    );
  }
  if (!authenticated)
    throw new NewsApplicationError("UNAUTHORIZED", "Unauthorized.");
}

function parseId(value: unknown): string {
  const parsed = idSchema.safeParse(value);
  if (!parsed.success)
    throw new NewsApplicationError("INVALID_NEWS_DATA", "Invalid News data.");
  return parsed.data;
}
function parseMetadata(value: unknown) {
  const parsed = newsMetadataSchema.safeParse(value);
  if (!parsed.success)
    throw new NewsApplicationError("INVALID_NEWS_DATA", "Invalid News data.");
  return parsed.data;
}
const publicColumns = {
  id: newsItems.id,
  slug: newsItems.slug,
  title: newsItems.title,
  excerpt: newsItems.excerpt,
  content: newsItems.content,
  category: newsItems.category,
  location: newsItems.location,
  imageUrl: newsItems.imageUrl,
  newsDate: newsItems.newsDate,
  demoContent: newsItems.demoContent,
  sortOrder: newsItems.sortOrder,
  createdAt: newsItems.createdAt,
};
// Explicit editorial positions first, then dated/newer News, with ID as a stable tie-breaker.
const ordering = [
  asc(sql`${newsItems.sortOrder} IS NULL`),
  asc(newsItems.sortOrder),
  desc(newsItems.newsDate),
  desc(newsItems.createdAt),
  asc(newsItems.id),
] as const;
async function slugExists(
  slug: string,
  excludingId?: string,
): Promise<boolean> {
  const [row] = await db
    .select({ id: newsItems.id })
    .from(newsItems)
    .where(
      excludingId
        ? and(eq(newsItems.slug, slug), ne(newsItems.id, excludingId))
        : eq(newsItems.slug, slug),
    )
    .limit(1);
  return Boolean(row);
}
function duplicateSlug(): NewsApplicationError {
  return new NewsApplicationError(
    "SLUG_ALREADY_EXISTS",
    "That URL slug is already in use. Choose another slug.",
  );
}
function notFound(): NewsApplicationError {
  return new NewsApplicationError("NOT_FOUND", "News not found.");
}
async function cleanup(key: string, id: string): Promise<boolean> {
  try {
    await deleteMedia(key);
    return true;
  } catch {
    console.warn(`[news] Media cleanup could not be completed for News ${id}.`);
    return false;
  }
}

async function uploadNewsImage(
  input: unknown,
  id: string,
): Promise<{ key: string; publicUrl: string }> {
  const parsed = imageSchema.safeParse(input);
  if (!parsed.success)
    throw new NewsApplicationError("INVALID_IMAGE", "Invalid image.");
  let uploaded: Awaited<ReturnType<typeof uploadImage>>;
  try {
    uploaded = await uploadImage({ ...parsed.data, category: "news" });
  } catch (error) {
    if (error instanceof MediaStorageConfigurationError)
      throw new NewsApplicationError(
        "STORAGE_NOT_CONFIGURED",
        "Media storage is not configured.",
      );
    if (error instanceof MediaImageValidationError) {
      const tooLarge = error.message.includes("8 MB");
      throw new NewsApplicationError(
        tooLarge ? "FILE_TOO_LARGE" : "INVALID_IMAGE",
        tooLarge ? "Image must be 8 MB or smaller." : "Invalid image.",
      );
    }
    throw new NewsApplicationError(
      "IMAGE_UPLOAD_FAILED",
      "Image upload failed.",
    );
  }
  try {
    if (
      !uploaded.publicUrl ||
      new URL(uploaded.publicUrl).protocol !== "https:"
    )
      throw new NewsApplicationError(
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
    if (error instanceof NewsApplicationError) throw error;
    throw new NewsApplicationError(
      "IMAGE_UPLOAD_FAILED",
      "Uploaded image could not be verified.",
    );
  }
}

export async function getNewsForAdmin(): Promise<NewsAdminItem[]> {
  await requireNewsAdmin();
  try {
    return await db
      .select()
      .from(newsItems)
      .orderBy(...ordering);
  } catch {
    throw new NewsApplicationError("UNABLE_TO_LOAD", "Unable to load News.");
  }
}
export async function getNewsById(
  idInput: unknown,
): Promise<NewsAdminItem | null> {
  await requireNewsAdmin();
  const id = parseId(idInput);
  try {
    const [item] = await db
      .select()
      .from(newsItems)
      .where(eq(newsItems.id, id))
      .limit(1);
    return item ?? null;
  } catch {
    throw new NewsApplicationError(
      "UNABLE_TO_LOAD",
      "Unable to load the News.",
    );
  }
}
export async function getPublishedNews(): Promise<PublishedNews[]> {
  try {
    return await db
      .select(publicColumns)
      .from(newsItems)
      .where(eq(newsItems.published, true))
      .orderBy(...ordering);
  } catch {
    throw new NewsApplicationError("UNABLE_TO_LOAD", "Unable to load News.");
  }
}
export async function getPublishedNewsBySlug(
  input: unknown,
): Promise<PublishedNews | null> {
  const parsed = slugSchema.safeParse(input);
  if (!parsed.success) return null;
  try {
    const [item] = await db
      .select(publicColumns)
      .from(newsItems)
      .where(
        and(eq(newsItems.slug, parsed.data), eq(newsItems.published, true)),
      )
      .limit(1);
    return item ?? null;
  } catch {
    throw new NewsApplicationError(
      "UNABLE_TO_LOAD",
      "Unable to load the News.",
    );
  }
}

export async function createNews(input: {
  metadata: NewsMetadataInput;
  image: NewsImageInput;
}): Promise<NewsAdminItem> {
  await requireNewsAdmin();
  const metadata = parseMetadata(input.metadata);
  try {
    if (await slugExists(metadata.slug)) throw duplicateSlug();
  } catch (error) {
    if (error instanceof NewsApplicationError) throw error;
    throw new NewsApplicationError("SAVE_FAILED", "Unable to save News.");
  }
  const id = randomUUID();
  const uploaded = await uploadNewsImage(input.image, id);
  try {
    return await db.transaction(async (transaction) => {
      await transaction.insert(newsItems).values({
        id,
        ...metadata,
        imageUrl: uploaded.publicUrl,
        imageStorageKey: uploaded.key,
      });
      const [item] = await transaction
        .select()
        .from(newsItems)
        .where(eq(newsItems.id, id))
        .limit(1);
      if (!item) throw new Error("Insert failed.");
      return item;
    });
  } catch (error) {
    await cleanup(uploaded.key, id);
    if (isDuplicate(error)) throw duplicateSlug();
    throw new NewsApplicationError("SAVE_FAILED", "Unable to save News.");
  }
}

export async function updateNewsMetadata(input: {
  id: unknown;
  metadata: NewsMetadataUpdateInput;
}): Promise<NewsAdminItem> {
  await requireNewsAdmin();
  const id = parseId(input.id);
  const patch = newsMetadataUpdateSchema.safeParse(input.metadata);
  if (!patch.success)
    throw new NewsApplicationError("INVALID_NEWS_DATA", "Invalid News data.");
  try {
    return await db.transaction(async (transaction) => {
      const [existing] = await transaction
        .select()
        .from(newsItems)
        .where(eq(newsItems.id, id))
        .limit(1)
        .for("update");
      if (!existing) throw notFound();
      const values = parseMetadata({
        slug: existing.slug,
        title: existing.title,
        excerpt: existing.excerpt,
        content: existing.content,
        category: existing.category,
        location: existing.location,
        newsDate: existing.newsDate,
        demoContent: existing.demoContent,
        published: existing.published,
        sortOrder: existing.sortOrder,
        ...Object.fromEntries(
          Object.entries(patch.data).filter(([, value]) => value !== undefined),
        ),
      });
      if (await slugExists(values.slug, id)) throw duplicateSlug();
      await transaction
        .update(newsItems)
        .set(values)
        .where(eq(newsItems.id, id));
      const [item] = await transaction
        .select()
        .from(newsItems)
        .where(eq(newsItems.id, id))
        .limit(1);
      if (!item) throw notFound();
      return item;
    });
  } catch (error) {
    if (error instanceof NewsApplicationError) throw error;
    if (isDuplicate(error)) throw duplicateSlug();
    throw new NewsApplicationError("UPDATE_FAILED", "Unable to update News.");
  }
}

export async function replaceNewsImage(input: {
  id: unknown;
  image: NewsImageInput;
}): Promise<{ item: NewsAdminItem; cleanupWarning: boolean }> {
  await requireNewsAdmin();
  const id = parseId(input.id);
  const existing = await getNewsById(id);
  if (!existing) throw notFound();
  const uploaded = await uploadNewsImage(input.image, id);
  let item: NewsAdminItem;
  try {
    item = await db.transaction(async (transaction) => {
      const [current] = await transaction
        .select()
        .from(newsItems)
        .where(eq(newsItems.id, id))
        .limit(1)
        .for("update");
      if (!current) throw notFound();
      if (current.imageStorageKey !== existing.imageStorageKey)
        throw new NewsApplicationError(
          "UPDATE_FAILED",
          "News image changed. Reload and try again.",
        );
      await transaction
        .update(newsItems)
        .set({ imageUrl: uploaded.publicUrl, imageStorageKey: uploaded.key })
        .where(eq(newsItems.id, id));
      const [updated] = await transaction
        .select()
        .from(newsItems)
        .where(eq(newsItems.id, id))
        .limit(1);
      if (!updated) throw notFound();
      return updated;
    });
  } catch (error) {
    await cleanup(uploaded.key, id);
    if (error instanceof NewsApplicationError) throw error;
    throw new NewsApplicationError(
      "UPDATE_FAILED",
      "Unable to update News image.",
    );
  }
  return {
    item,
    cleanupWarning: !(await cleanup(existing.imageStorageKey, id)),
  };
}

export async function deleteNews(
  idInput: unknown,
): Promise<{ deleted: true; cleanupWarning: boolean }> {
  await requireNewsAdmin();
  const id = parseId(idInput);
  let existing: NewsAdminItem;
  try {
    existing = await db.transaction(async (transaction) => {
      const [item] = await transaction
        .select()
        .from(newsItems)
        .where(eq(newsItems.id, id))
        .limit(1)
        .for("update");
      if (!item) throw notFound();
      await transaction.delete(newsItems).where(eq(newsItems.id, id));
      return item;
    });
  } catch (error) {
    if (error instanceof NewsApplicationError) throw error;
    throw new NewsApplicationError("DELETE_FAILED", "Unable to delete News.");
  }
  return {
    deleted: true,
    cleanupWarning: !(await cleanup(existing.imageStorageKey, id)),
  };
}
