import "@tanstack/react-start/server-only";
import { randomUUID } from "node:crypto";
import { and, asc, desc, eq, gte, ne, sql } from "drizzle-orm";
import { z } from "zod";
import { getCurrentAdmin } from "@/server/auth";
import { db } from "@/server/db";
import { eventItems, type EventItem } from "@/server/db/schema";
import {
  calendarDateSchema,
  getKathmanduDate,
  idSchema,
  isDuplicate,
  slugSchema,
  sortOrderSchema,
} from "@/server/news-events/validation";

export const eventMetadataSchema = z
  .object({
    slug: slugSchema,
    title: z.string().trim().min(1).max(255),
    summary: z.string().trim().min(1).max(5_000),
    category: z.string().trim().min(1).max(100),
    eventStart: calendarDateSchema,
    location: z.string().trim().min(1).max(255),
    registrationOpen: z.boolean().optional().default(false),
    demoContent: z.boolean().optional().default(false),
    published: z.boolean().optional().default(true),
    sortOrder: sortOrderSchema.optional().default(null),
  })
  .strict();
export const eventMetadataUpdateSchema = eventMetadataSchema.partial().strict();
export type EventMetadataInput = z.input<typeof eventMetadataSchema>;
export type EventMetadataUpdateInput = z.input<
  typeof eventMetadataUpdateSchema
>;
export type EventAdminItem = EventItem;
export type PublishedEvent = Omit<EventItem, "published" | "updatedAt">;
export type EventErrorCode =
  | "UNAUTHORIZED"
  | "INVALID_EVENT_DATA"
  | "SLUG_ALREADY_EXISTS"
  | "NOT_FOUND"
  | "UNABLE_TO_LOAD"
  | "SAVE_FAILED"
  | "UPDATE_FAILED"
  | "DELETE_FAILED";
export class EventApplicationError extends Error {
  constructor(
    readonly code: EventErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "EventApplicationError";
  }
}
export function toEventFailure(
  error: unknown,
  fallback: { code: EventErrorCode; message: string },
) {
  if (error instanceof EventApplicationError)
    return { success: false as const, code: error.code, error: error.message };
  console.error(`[events] ${fallback.code.toLowerCase()} operation failed.`);
  return {
    success: false as const,
    code: fallback.code,
    error: fallback.message,
  };
}
export async function requireEventAdmin(): Promise<void> {
  let authenticated: boolean;
  try {
    authenticated = Boolean(await getCurrentAdmin());
  } catch {
    throw new EventApplicationError(
      "UNABLE_TO_LOAD",
      "Unable to verify admin session.",
    );
  }
  if (!authenticated)
    throw new EventApplicationError("UNAUTHORIZED", "Unauthorized.");
}
function parseId(input: unknown) {
  const parsed = idSchema.safeParse(input);
  if (!parsed.success)
    throw new EventApplicationError(
      "INVALID_EVENT_DATA",
      "Invalid Event data.",
    );
  return parsed.data;
}
function parseMetadata(input: unknown) {
  const parsed = eventMetadataSchema.safeParse(input);
  if (!parsed.success)
    throw new EventApplicationError(
      "INVALID_EVENT_DATA",
      "Invalid Event data.",
    );
  return parsed.data;
}
function notFound() {
  return new EventApplicationError("NOT_FOUND", "Event not found.");
}
function duplicateSlug() {
  return new EventApplicationError(
    "SLUG_ALREADY_EXISTS",
    "That URL slug is already in use. Choose another slug.",
  );
}
async function slugExists(slug: string, excludingId?: string) {
  const [row] = await db
    .select({ id: eventItems.id })
    .from(eventItems)
    .where(
      excludingId
        ? and(eq(eventItems.slug, slug), ne(eventItems.id, excludingId))
        : eq(eventItems.slug, slug),
    )
    .limit(1);
  return Boolean(row);
}
const publicColumns = {
  id: eventItems.id,
  slug: eventItems.slug,
  title: eventItems.title,
  summary: eventItems.summary,
  category: eventItems.category,
  eventStart: eventItems.eventStart,
  location: eventItems.location,
  registrationOpen: eventItems.registrationOpen,
  demoContent: eventItems.demoContent,
  sortOrder: eventItems.sortOrder,
  createdAt: eventItems.createdAt,
};
// Preserve explicit editorial positions; otherwise dates ascend with stable tie-breakers.
const ordering = [
  asc(sql`${eventItems.sortOrder} IS NULL`),
  asc(eventItems.sortOrder),
  asc(eventItems.eventStart),
  desc(eventItems.createdAt),
  asc(eventItems.id),
] as const;

export async function getEventsForAdmin(): Promise<EventAdminItem[]> {
  await requireEventAdmin();
  try {
    return await db
      .select()
      .from(eventItems)
      .orderBy(...ordering);
  } catch {
    throw new EventApplicationError("UNABLE_TO_LOAD", "Unable to load Events.");
  }
}
export async function getEventById(
  input: unknown,
): Promise<EventAdminItem | null> {
  await requireEventAdmin();
  const id = parseId(input);
  try {
    const [item] = await db
      .select()
      .from(eventItems)
      .where(eq(eventItems.id, id))
      .limit(1);
    return item ?? null;
  } catch {
    throw new EventApplicationError(
      "UNABLE_TO_LOAD",
      "Unable to load the Event.",
    );
  }
}
export async function getPublishedEvents(): Promise<PublishedEvent[]> {
  try {
    return await db
      .select(publicColumns)
      .from(eventItems)
      .where(eq(eventItems.published, true))
      .orderBy(...ordering);
  } catch {
    throw new EventApplicationError("UNABLE_TO_LOAD", "Unable to load Events.");
  }
}
export async function getNearestEligibleEvent(): Promise<PublishedEvent | null> {
  try {
    // Today is eligible. Registration is independent; no static chronology labels exist.
    const [item] = await db
      .select(publicColumns)
      .from(eventItems)
      .where(
        and(
          eq(eventItems.published, true),
          gte(eventItems.eventStart, getKathmanduDate()),
        ),
      )
      .orderBy(
        asc(eventItems.eventStart),
        asc(sql`${eventItems.sortOrder} IS NULL`),
        asc(eventItems.sortOrder),
        asc(eventItems.id),
      )
      .limit(1);
    return item ?? null;
  } catch {
    throw new EventApplicationError(
      "UNABLE_TO_LOAD",
      "Unable to load the next Event.",
    );
  }
}
export async function createEvent(
  metadataInput: EventMetadataInput,
): Promise<EventAdminItem> {
  await requireEventAdmin();
  const metadata = parseMetadata(metadataInput);
  const id = randomUUID();
  try {
    if (await slugExists(metadata.slug)) throw duplicateSlug();
    return await db.transaction(async (transaction) => {
      await transaction.insert(eventItems).values({ id, ...metadata });
      const [item] = await transaction
        .select()
        .from(eventItems)
        .where(eq(eventItems.id, id))
        .limit(1);
      if (!item) throw new Error("Insert failed.");
      return item;
    });
  } catch (error) {
    if (error instanceof EventApplicationError) throw error;
    if (isDuplicate(error)) throw duplicateSlug();
    throw new EventApplicationError("SAVE_FAILED", "Unable to save Event.");
  }
}
export async function updateEvent(input: {
  id: unknown;
  metadata: EventMetadataUpdateInput;
}): Promise<EventAdminItem> {
  await requireEventAdmin();
  const id = parseId(input.id);
  const patch = eventMetadataUpdateSchema.safeParse(input.metadata);
  if (!patch.success)
    throw new EventApplicationError(
      "INVALID_EVENT_DATA",
      "Invalid Event data.",
    );
  try {
    return await db.transaction(async (transaction) => {
      const [existing] = await transaction
        .select()
        .from(eventItems)
        .where(eq(eventItems.id, id))
        .limit(1)
        .for("update");
      if (!existing) throw notFound();
      const values = parseMetadata({
        slug: existing.slug,
        title: existing.title,
        summary: existing.summary,
        category: existing.category,
        eventStart: existing.eventStart,
        location: existing.location,
        registrationOpen: existing.registrationOpen,
        demoContent: existing.demoContent,
        published: existing.published,
        sortOrder: existing.sortOrder,
        ...Object.fromEntries(
          Object.entries(patch.data).filter(([, value]) => value !== undefined),
        ),
      });
      if (await slugExists(values.slug, id)) throw duplicateSlug();
      await transaction
        .update(eventItems)
        .set(values)
        .where(eq(eventItems.id, id));
      const [item] = await transaction
        .select()
        .from(eventItems)
        .where(eq(eventItems.id, id))
        .limit(1);
      if (!item) throw notFound();
      return item;
    });
  } catch (error) {
    if (error instanceof EventApplicationError) throw error;
    if (isDuplicate(error)) throw duplicateSlug();
    throw new EventApplicationError("UPDATE_FAILED", "Unable to update Event.");
  }
}
export async function deleteEvent(input: unknown): Promise<{ deleted: true }> {
  await requireEventAdmin();
  const id = parseId(input);
  try {
    await db.transaction(async (transaction) => {
      const [existing] = await transaction
        .select({ id: eventItems.id })
        .from(eventItems)
        .where(eq(eventItems.id, id))
        .limit(1)
        .for("update");
      if (!existing) throw notFound();
      await transaction.delete(eventItems).where(eq(eventItems.id, id));
    });
    return { deleted: true };
  } catch (error) {
    if (error instanceof EventApplicationError) throw error;
    throw new EventApplicationError("DELETE_FAILED", "Unable to delete Event.");
  }
}
