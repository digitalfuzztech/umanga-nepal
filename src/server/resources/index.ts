import "@tanstack/react-start/server-only";

import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { getCurrentAdmin } from "@/server/auth";
import { db } from "@/server/db";
import { resourceItems, type ResourceItem } from "@/server/db/schema";
import {
  calendarDateSchema,
  idSchema,
  isDuplicate,
  slugSchema,
  sortOrderSchema,
} from "@/server/news-events/validation";

export const resourceMetadataSchema = z
  .object({
    slug: slugSchema,
    title: z.string().trim().min(1).max(255),
    excerpt: z.string().trim().min(1).max(5_000),
    content: z.string().trim().min(1).max(100_000),
    category: z.string().trim().min(1).max(100),
    type: z.enum(["article", "guide"]),
    readingTime: z
      .number()
      .int()
      .min(1)
      .max(2_147_483_647)
      .nullable()
      .optional()
      .default(null),
    sortOrder: sortOrderSchema.optional().default(null),
    publishedAt: calendarDateSchema.nullable().optional().default(null),
    reviewedAt: calendarDateSchema.nullable().optional().default(null),
    published: z.boolean().optional().default(true),
  })
  .strict();
export const resourceMetadataUpdateSchema = resourceMetadataSchema
  .partial()
  .strict()
  .refine((value) => Object.values(value).some((field) => field !== undefined));
const updateSchema = z
  .object({ id: idSchema, metadata: resourceMetadataUpdateSchema })
  .strict();
export type ResourceMetadataInput = z.input<typeof resourceMetadataSchema>;
export type ResourceAdminItem = ResourceItem;
export type PublishedResource = Omit<ResourceItem, "published" | "updatedAt">;
export type ResourceErrorCode =
  | "UNAUTHORIZED"
  | "INVALID_RESOURCE_DATA"
  | "SLUG_ALREADY_EXISTS"
  | "NOT_FOUND"
  | "UNABLE_TO_LOAD"
  | "SAVE_FAILED"
  | "UPDATE_FAILED"
  | "DELETE_FAILED";

export class ResourceApplicationError extends Error {
  constructor(
    readonly code: ResourceErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "ResourceApplicationError";
  }
}
export function toResourceFailure(
  error: unknown,
  fallback: { code: ResourceErrorCode; message: string },
) {
  if (error instanceof ResourceApplicationError)
    return { success: false as const, code: error.code, error: error.message };
  console.error(`[resources] ${fallback.code.toLowerCase()} operation failed.`);
  return {
    success: false as const,
    code: fallback.code,
    error: fallback.message,
  };
}
async function requireResourceAdmin() {
  let authenticated: boolean;
  try {
    authenticated = Boolean(await getCurrentAdmin());
  } catch {
    throw new ResourceApplicationError(
      "UNABLE_TO_LOAD",
      "Unable to verify admin session.",
    );
  }
  if (!authenticated)
    throw new ResourceApplicationError("UNAUTHORIZED", "Unauthorized.");
}
function parse<T>(
  schema: z.ZodType<T, z.ZodTypeDef, unknown>,
  input: unknown,
): T {
  const result = schema.safeParse(input);
  if (!result.success)
    throw new ResourceApplicationError(
      "INVALID_RESOURCE_DATA",
      "Invalid Resource data.",
    );
  return result.data;
}
function notFound() {
  return new ResourceApplicationError("NOT_FOUND", "Resource not found.");
}
function duplicateSlug() {
  return new ResourceApplicationError(
    "SLUG_ALREADY_EXISTS",
    "That URL slug is already in use. Choose another slug.",
  );
}

const publicColumns = {
  id: resourceItems.id,
  slug: resourceItems.slug,
  title: resourceItems.title,
  excerpt: resourceItems.excerpt,
  content: resourceItems.content,
  category: resourceItems.category,
  type: resourceItems.type,
  readingTime: resourceItems.readingTime,
  sortOrder: resourceItems.sortOrder,
  publishedAt: resourceItems.publishedAt,
  reviewedAt: resourceItems.reviewedAt,
  createdAt: resourceItems.createdAt,
};
// Editorial positions preserve array order; dates never rank Resources.
const ordering = [
  asc(sql`${resourceItems.sortOrder} IS NULL`),
  asc(resourceItems.sortOrder),
  desc(resourceItems.createdAt),
  asc(resourceItems.id),
] as const;

export async function getResourcesForAdmin(): Promise<ResourceAdminItem[]> {
  await requireResourceAdmin();
  try {
    return await db
      .select()
      .from(resourceItems)
      .orderBy(...ordering);
  } catch {
    throw new ResourceApplicationError(
      "UNABLE_TO_LOAD",
      "Unable to load Resources.",
    );
  }
}
export async function getResourceById(
  input: unknown,
): Promise<ResourceAdminItem | null> {
  await requireResourceAdmin();
  const id = parse(idSchema, input);
  try {
    const [item] = await db
      .select()
      .from(resourceItems)
      .where(eq(resourceItems.id, id))
      .limit(1);
    return item ?? null;
  } catch {
    throw new ResourceApplicationError(
      "UNABLE_TO_LOAD",
      "Unable to load the Resource.",
    );
  }
}
export async function getPublishedResources(): Promise<PublishedResource[]> {
  try {
    return await db
      .select(publicColumns)
      .from(resourceItems)
      .where(eq(resourceItems.published, true))
      .orderBy(...ordering);
  } catch {
    throw new ResourceApplicationError(
      "UNABLE_TO_LOAD",
      "Unable to load Resources.",
    );
  }
}
export async function getPublishedResourceBySlug(
  input: unknown,
): Promise<PublishedResource | null> {
  const parsed = slugSchema.safeParse(input);
  if (!parsed.success) return null;
  try {
    const [item] = await db
      .select(publicColumns)
      .from(resourceItems)
      .where(
        and(
          eq(resourceItems.slug, parsed.data),
          eq(resourceItems.published, true),
        ),
      )
      .limit(1);
    return item ?? null;
  } catch {
    throw new ResourceApplicationError(
      "UNABLE_TO_LOAD",
      "Unable to load the Resource.",
    );
  }
}
export async function createResource(
  input: unknown,
): Promise<ResourceAdminItem> {
  await requireResourceAdmin();
  const metadata = parse(resourceMetadataSchema, input);
  const id = randomUUID();
  try {
    return await db.transaction(async (transaction) => {
      await transaction.insert(resourceItems).values({ id, ...metadata });
      const [item] = await transaction
        .select()
        .from(resourceItems)
        .where(eq(resourceItems.id, id))
        .limit(1);
      if (!item) throw new Error("Insert failed.");
      return item;
    });
  } catch (error) {
    if (isDuplicate(error)) throw duplicateSlug();
    throw new ResourceApplicationError(
      "SAVE_FAILED",
      "Unable to save Resource.",
    );
  }
}
export async function updateResourceMetadata(
  input: unknown,
): Promise<ResourceAdminItem> {
  await requireResourceAdmin();
  const { id, metadata: patch } = parse(updateSchema, input);
  try {
    return await db.transaction(async (transaction) => {
      const [existing] = await transaction
        .select()
        .from(resourceItems)
        .where(eq(resourceItems.id, id))
        .limit(1)
        .for("update");
      if (!existing) throw notFound();
      const {
        id: _id,
        createdAt: _createdAt,
        updatedAt: _updatedAt,
        ...metadata
      } = existing;
      const values = parse(resourceMetadataSchema, {
        ...metadata,
        ...Object.fromEntries(
          Object.entries(patch).filter(([, value]) => value !== undefined),
        ),
      });
      await transaction
        .update(resourceItems)
        .set(values)
        .where(eq(resourceItems.id, id));
      const [item] = await transaction
        .select()
        .from(resourceItems)
        .where(eq(resourceItems.id, id))
        .limit(1);
      if (!item) throw notFound();
      return item;
    });
  } catch (error) {
    if (error instanceof ResourceApplicationError) throw error;
    if (isDuplicate(error)) throw duplicateSlug();
    throw new ResourceApplicationError(
      "UPDATE_FAILED",
      "Unable to update Resource.",
    );
  }
}
export async function deleteResource(
  input: unknown,
): Promise<{ deleted: true }> {
  await requireResourceAdmin();
  const id = parse(idSchema, input);
  try {
    await db.transaction(async (transaction) => {
      const [item] = await transaction
        .select({ id: resourceItems.id })
        .from(resourceItems)
        .where(eq(resourceItems.id, id))
        .limit(1)
        .for("update");
      if (!item) throw notFound();
      await transaction.delete(resourceItems).where(eq(resourceItems.id, id));
    });
    return { deleted: true };
  } catch (error) {
    if (error instanceof ResourceApplicationError) throw error;
    throw new ResourceApplicationError(
      "DELETE_FAILED",
      "Unable to delete Resource.",
    );
  }
}
