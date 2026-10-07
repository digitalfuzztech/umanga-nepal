import { relations } from "drizzle-orm";
import {
  boolean,
  date,
  datetime,
  index,
  int,
  json,
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

export const storyItems = mysqlTable(
  "story_items",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    slug: varchar("slug", { length: 191 }).notNull(),
    title: varchar("title", { length: 255 }).notNull(),
    excerpt: text("excerpt").notNull(),
    // Plain-text paragraphs are separated by a blank line.
    content: text("content").notNull(),
    category: varchar("category", { length: 100 }).notNull(),
    attribution: varchar("attribution", { length: 255 }).notNull(),
    imageUrl: text("image_url").notNull(),
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
