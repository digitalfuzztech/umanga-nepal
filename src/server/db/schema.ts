import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  datetime,
  index,
  int,
  json,
  mediumtext,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

export const adminUsers = mysqlTable(
  "admin_users",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    email: varchar("email", { length: 320 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [uniqueIndex("admin_users_email_unique").on(table.email)],
);

export const adminSessions = mysqlTable(
  "admin_sessions",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    userId: varchar("user_id", { length: 36 })
      .notNull()
      .references(() => adminUsers.id, { onDelete: "cascade" }),
    tokenHash: varchar("token_hash", { length: 255 }).notNull(),
    expiresAt: datetime("expires_at", { mode: "date" }).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("admin_sessions_user_id_idx").on(table.userId),
    uniqueIndex("admin_sessions_token_hash_unique").on(table.tokenHash),
    index("admin_sessions_expires_at_idx").on(table.expiresAt),
  ],
);

export const galleryItems = mysqlTable(
  "gallery_items",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    title: varchar("title", { length: 255 }).notNull(),
    caption: text("caption"),
    imageUrl: text("image_url").notNull(),
    imageStorageKey: varchar("image_storage_key", { length: 512 }).notNull(),
    published: boolean("published").default(true).notNull(),
    sortOrder: int("sort_order"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("gallery_items_published_idx").on(table.published),
    index("gallery_items_sort_order_idx").on(table.sortOrder),
    index("gallery_items_created_at_idx").on(table.createdAt),
  ],
);

export const ourWorkItems = mysqlTable(
  "our_work_items",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    slug: varchar("slug", { length: 191 }).notNull(),
    type: varchar("type", { length: 100 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description").notNull(),
    tags: json("tags").$type<string[]>().notNull(),
    imageUrl: text("image_url").notNull(),
    imageStorageKey: varchar("image_storage_key", { length: 512 }).notNull(),
    aboutProgram: text("about_program"),
    advisoryNote: text("advisory_note"),
    featured: boolean("featured").default(false).notNull(),
    awarenessSessionLabel: varchar("awareness_session_label", { length: 120 }),
    awarenessSessionNote: text("awareness_session_note"),
    participantLabel: varchar("participant_label", { length: 120 }),
    participantNote: text("participant_note"),
    whatWeCover: json("what_we_cover").$type<string[]>().notNull(),
    awarenessSessionCount: int("awareness_session_count"),
    participantCount: int("participant_count"),
    published: boolean("published").default(true).notNull(),
    sortOrder: int("sort_order"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("our_work_items_slug_unique").on(table.slug),
    index("our_work_items_published_idx").on(table.published),
    index("our_work_items_sort_order_idx").on(table.sortOrder),
    index("our_work_items_created_at_idx").on(table.createdAt),
    index("our_work_items_type_idx").on(table.type),
  ],
);

// Drizzle's MySQL table API does not model charset/collation. Migration
// 0006_stories_utf8mb4 is authoritative; retain it in fresh database setups.
export const storyItems = mysqlTable(
  "story_items",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    slug: varchar("slug", { length: 191 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    excerpt: mediumtext("excerpt").notNull(),
    // Plain-text paragraphs are separated by a blank line.
    content: mediumtext("content").notNull(),
    category: varchar("category", { length: 100 }).notNull(),
    attribution: varchar("attribution", { length: 255 }).notNull(),
    imageUrl: mediumtext("image_url").notNull(),
    imageStorageKey: varchar("image_storage_key", { length: 512 }).notNull(),
    storyDate: date("story_date", { mode: "string" }),
    demoContent: boolean("demo_content").default(false).notNull(),
    published: boolean("published").default(true).notNull(),
    sortOrder: int("sort_order"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("story_items_slug_unique").on(table.slug),
    index("story_items_published_idx").on(table.published),
    index("story_items_sort_order_idx").on(table.sortOrder),
    index("story_items_story_date_idx").on(table.storyDate),
  ],
);

export type InboxMetadataValue =
  | string
  | number
  | boolean
  | null
  | InboxMetadataValue[]
  | { [key: string]: InboxMetadataValue };

// The News/Event creation migration specifies utf8mb4_unicode_ci explicitly;
// Drizzle's MySQL table API does not model table charset/collation.
export const newsItems = mysqlTable(
  "news_items",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    slug: varchar("slug", { length: 191 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    excerpt: mediumtext("excerpt").notNull(),
    // Plain-text paragraphs are separated by a blank line.
    content: mediumtext("content").notNull(),
    category: varchar("category", { length: 100 }).notNull(),
    newsDate: date("news_date", { mode: "string" }).notNull(),
    imageUrl: mediumtext("image_url").notNull(),
    imageStorageKey: varchar("image_storage_key", { length: 512 }).notNull(),
    location: varchar("location", { length: 255 }),
    demoContent: boolean("demo_content").default(false).notNull(),
    published: boolean("published").default(true).notNull(),
    sortOrder: int("sort_order"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("news_items_slug_unique").on(table.slug),
    index("news_items_published_idx").on(table.published),
    index("news_items_news_date_idx").on(table.newsDate),
    index("news_items_sort_order_idx").on(table.sortOrder),
  ],
);

export const eventItems = mysqlTable(
  "event_items",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    slug: varchar("slug", { length: 191 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    summary: mediumtext("summary").notNull(),
    category: varchar("category", { length: 100 }).notNull(),
    // Current events have calendar dates, without times or end dates.
    eventStart: date("event_start", { mode: "string" }).notNull(),
    location: varchar("location", { length: 255 }).notNull(),
    // Registration is editorial; upcoming/past is derived from eventStart.
    registrationOpen: boolean("registration_open").default(false).notNull(),
    demoContent: boolean("demo_content").default(false).notNull(),
    published: boolean("published").default(true).notNull(),
    sortOrder: int("sort_order"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    uniqueIndex("event_items_slug_unique").on(table.slug),
    index("event_items_published_idx").on(table.published),
    index("event_items_event_start_idx").on(table.eventStart),
    index("event_items_sort_order_idx").on(table.sortOrder),
  ],
);

// The Inbox migration explicitly creates these tables as utf8mb4_unicode_ci;
// Drizzle's MySQL table API does not model table charset/collation.
export const inboxThreads = mysqlTable(
  "inbox_threads",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    channel: mysqlEnum("channel", [
      "contact",
      "newsletter",
      "volunteer",
      "partner",
      "support",
      "invite",
      "stories",
    ]).notNull(),
    mailbox: varchar("mailbox", { length: 320 }).notNull(),
    leadName: varchar("lead_name", { length: 255 }),
    leadEmail: varchar("lead_email", { length: 320 }).notNull(),
    leadPhone: varchar("lead_phone", { length: 100 }),
    subject: varchar("subject", { length: 255 }),
    metadata: json("metadata")
      .$type<Record<string, InboxMetadataValue>>()
      .notNull(),
    status: mysqlEnum("status", ["new", "open", "resolved"])
      .default("new")
      .notNull(),
    readAt: datetime("read_at", { mode: "date" }),
    lastMessageAt: timestamp("last_message_at").defaultNow().notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().onUpdateNow().notNull(),
  },
  (table) => [
    index("inbox_threads_channel_idx").on(table.channel),
    index("inbox_threads_status_idx").on(table.status),
    index("inbox_threads_read_at_idx").on(table.readAt),
    index("inbox_threads_last_message_at_idx").on(table.lastMessageAt),
    index("inbox_threads_created_at_idx").on(table.createdAt),
    index("inbox_threads_lead_email_idx").on(table.leadEmail),
  ],
);

export const inboxMessages = mysqlTable(
  "inbox_messages",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    threadId: varchar("thread_id", { length: 36 })
      .notNull()
      .references(() => inboxThreads.id, { onDelete: "cascade" }),
    direction: mysqlEnum("direction", [
      "inbound",
      "outbound",
      "system",
    ]).notNull(),
    senderType: mysqlEnum("sender_type", ["lead", "staff", "system"]).notNull(),
    fromAddress: varchar("from_address", { length: 320 }).notNull(),
    toAddress: varchar("to_address", { length: 320 }).notNull(),
    subject: varchar("subject", { length: 998 }),
    body: mediumtext("body").notNull(),
    // Null for inbound/system messages; SMTP status applies only to outbound.
    deliveryStatus: mysqlEnum("delivery_status", ["pending", "sent", "failed"]),
    smtpMessageId: varchar("smtp_message_id", { length: 998 }),
    deliveryErrorCode: varchar("delivery_error_code", { length: 100 }),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("inbox_messages_thread_created_at_idx").on(
      table.threadId,
      table.createdAt,
    ),
  ],
);

export const inboxThreadsRelations = relations(inboxThreads, ({ many }) => ({
  messages: many(inboxMessages),
}));

export const inboxMessagesRelations = relations(inboxMessages, ({ one }) => ({
  thread: one(inboxThreads, {
    fields: [inboxMessages.threadId],
    references: [inboxThreads.id],
  }),
}));

export const adminUsersRelations = relations(adminUsers, ({ many }) => ({
  sessions: many(adminSessions),
}));

export const adminSessionsRelations = relations(adminSessions, ({ one }) => ({
  user: one(adminUsers, {
    fields: [adminSessions.userId],
    references: [adminUsers.id],
  }),
}));

export type AdminUser = typeof adminUsers.$inferSelect;
export type NewAdminUser = typeof adminUsers.$inferInsert;
export type AdminSession = typeof adminSessions.$inferSelect;
export type NewAdminSession = typeof adminSessions.$inferInsert;
export type GalleryItem = typeof galleryItems.$inferSelect;
export type NewGalleryItem = typeof galleryItems.$inferInsert;
export type OurWorkItem = typeof ourWorkItems.$inferSelect;
export type NewOurWorkItem = typeof ourWorkItems.$inferInsert;
export type StoryItem = typeof storyItems.$inferSelect;
export type NewStoryItem = typeof storyItems.$inferInsert;
export type InboxThread = typeof inboxThreads.$inferSelect;
export type NewInboxThread = typeof inboxThreads.$inferInsert;
export type InboxMessage = typeof inboxMessages.$inferSelect;
export type NewInboxMessage = typeof inboxMessages.$inferInsert;
export type NewsItem = typeof newsItems.$inferSelect;
export type NewNewsItem = typeof newsItems.$inferInsert;
export type EventItem = typeof eventItems.$inferSelect;
export type NewEventItem = typeof eventItems.$inferInsert;
