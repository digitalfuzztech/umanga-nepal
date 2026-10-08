import "@tanstack/react-start/server-only";
import {
  and,
  count,
  desc,
  eq,
  isNotNull,
  isNull,
  like,
  or,
  sql,
  asc,
} from "drizzle-orm";
import { getCurrentAdmin } from "../auth";
import { db } from "../db";
import { inboxThreads, inboxMessages } from "../db/schema";
import {
  inboxFiltersSchema,
  inboxIdSchema,
  inboxReadSchema,
  inboxStatusSchema,
  type InboxFailure,
} from "@/lib/admin-inbox-input";

class InboxError extends Error {
  constructor(
    readonly code: InboxFailure["code"],
    message: string,
  ) {
    super(message);
  }
}
async function requireInboxAdmin() {
  if (!(await getCurrentAdmin()))
    throw new InboxError("UNAUTHORIZED", "Please sign in to manage the Inbox.");
}
function parse<T>(
  schema: {
    safeParse: (
      input: unknown,
    ) => { success: true; data: T } | { success: false };
  },
  input: unknown,
): T {
  const result = schema.safeParse(input);
  if (!result.success)
    throw new InboxError("INVALID_INPUT", "Please check the Inbox request.");
  return result.data;
}
export function toInboxFailure(error: unknown): InboxFailure {
  if (error instanceof InboxError)
    return { success: false, code: error.code, message: error.message };
  return {
    success: false,
    code: "INBOX_FAILED",
    message: "Unable to update or load the Inbox. Please try again.",
  };
}

export async function listInboxThreads(input: unknown) {
  await requireInboxAdmin();
  const filters = parse(inboxFiltersSchema, input);
  // Escape LIKE wildcards so the search is a literal, parameterized substring.
  const search = `%${filters.q.replace(/[\\%_]/g, "\\$&")}%`;
  const where = and(
    filters.channel === "all"
      ? undefined
      : eq(inboxThreads.channel, filters.channel),
    filters.status === "all"
      ? undefined
      : eq(inboxThreads.status, filters.status),
    filters.read === "all"
      ? undefined
      : filters.read === "unread"
        ? isNull(inboxThreads.readAt)
        : isNotNull(inboxThreads.readAt),
    !filters.q
      ? undefined
      : or(
          like(inboxThreads.leadName, search),
          like(inboxThreads.leadEmail, search),
          like(inboxThreads.leadPhone, search),
          like(inboxThreads.subject, search),
        ),
  );
  const pageSize = 25;
  const [total] = await db
    .select({ value: count() })
    .from(inboxThreads)
    .where(where);
  const [unread] = await db
    .select({ value: count() })
    .from(inboxThreads)
    .where(isNull(inboxThreads.readAt));
  const items = await db
    .select({
      id: inboxThreads.id,
      channel: inboxThreads.channel,
      leadName: inboxThreads.leadName,
      leadEmail: inboxThreads.leadEmail,
      leadPhone: inboxThreads.leadPhone,
      subject: inboxThreads.subject,
      status: inboxThreads.status,
      readAt: inboxThreads.readAt,
      lastMessageAt: inboxThreads.lastMessageAt,
      createdAt: inboxThreads.createdAt,
      preview: sql<
        string | null
      >`(select left(m.body, 180) from ${inboxMessages} m where m.thread_id = ${inboxThreads}.${sql.identifier("id")} order by m.created_at desc, m.id desc limit 1)`,
    })
    .from(inboxThreads)
    .where(where)
    .orderBy(desc(inboxThreads.lastMessageAt), desc(inboxThreads.id))
    .limit(pageSize)
    .offset((filters.page - 1) * pageSize);
  return { items, total: total!.value, unread: unread!.value, pageSize };
}
export async function getInboxThread(input: unknown) {
  await requireInboxAdmin();
  const { id } = parse(inboxIdSchema, input);
  const [thread] = await db
    .select()
    .from(inboxThreads)
    .where(eq(inboxThreads.id, id))
    .limit(1);
  if (!thread) return null;
  const messages = await db
    .select({
      id: inboxMessages.id,
      direction: inboxMessages.direction,
      senderType: inboxMessages.senderType,
      fromAddress: inboxMessages.fromAddress,
      toAddress: inboxMessages.toAddress,
      subject: inboxMessages.subject,
      body: inboxMessages.body,
      deliveryStatus: inboxMessages.deliveryStatus,
      createdAt: inboxMessages.createdAt,
    })
    .from(inboxMessages)
    .where(eq(inboxMessages.threadId, id))
    .orderBy(asc(inboxMessages.createdAt), asc(inboxMessages.id));
  const { notification, ...metadata } = thread.metadata;
  const notificationFailed = Boolean(
    notification &&
    typeof notification === "object" &&
    !Array.isArray(notification) &&
    notification["status"] === "failed",
  );
  return { thread: { ...thread, metadata }, messages, notificationFailed };
}
async function existingThread(id: string) {
  const [thread] = await db
    .select({ id: inboxThreads.id })
    .from(inboxThreads)
    .where(eq(inboxThreads.id, id))
    .limit(1);
  if (!thread)
    throw new InboxError("NOT_FOUND", "This enquiry is no longer available.");
}
export async function setInboxRead(input: unknown) {
  await requireInboxAdmin();
  const { id, read } = parse(inboxReadSchema, input);
  await existingThread(id);
  if (read) {
    await db
      .update(inboxThreads)
      .set({ readAt: new Date() })
      .where(and(eq(inboxThreads.id, id), isNull(inboxThreads.readAt)));
  } else {
    await db
      .update(inboxThreads)
      .set({ readAt: null })
      .where(eq(inboxThreads.id, id));
  }
}
export async function setInboxStatus(input: unknown) {
  await requireInboxAdmin();
  const { id, status } = parse(inboxStatusSchema, input);
  await existingThread(id);
  await db.update(inboxThreads).set({ status }).where(eq(inboxThreads.id, id));
}
