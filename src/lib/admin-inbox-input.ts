import { z } from "zod";

export const inboxChannels = [
  "contact",
  "newsletter",
  "volunteer",
  "partner",
  "support",
  "invite",
  "stories",
] as const;
export const inboxStatuses = ["new", "open", "resolved"] as const;
export const channelLabels: Record<(typeof inboxChannels)[number], string> = {
  contact: "Contact",
  newsletter: "Newsletter",
  volunteer: "Volunteer",
  partner: "Partner",
  support: "Support",
  invite: "Invite",
  stories: "Stories",
};
export const statusLabels = {
  new: "New",
  open: "Open",
  resolved: "Resolved",
} as const;
export const inboxFiltersSchema = z
  .object({
    channel: z.enum(["all", ...inboxChannels]).default("all"),
    status: z.enum(["all", ...inboxStatuses]).default("all"),
    read: z.enum(["all", "unread", "read"]).default("all"),
    q: z.string().trim().max(200).default(""),
    page: z.number().int().min(1).max(100000).default(1),
  })
  .strict();
export type InboxFilters = z.infer<typeof inboxFiltersSchema>;
export const inboxIdSchema = z.object({ id: z.string().uuid() }).strict();
export const inboxReadSchema = inboxIdSchema.extend({ read: z.boolean() });
export const inboxStatusSchema = inboxIdSchema.extend({
  status: z.enum(inboxStatuses),
});
export type InboxFailure = {
  success: false;
  code: "UNAUTHORIZED" | "INVALID_INPUT" | "NOT_FOUND" | "INBOX_FAILED";
  message: string;
};

export function parseInboxSearch(input: Record<string, unknown>) {
  const parsed = inboxFiltersSchema.safeParse({
    channel: input["channel"] ?? "all",
    status: input["status"] ?? "all",
    read: input["read"] ?? "all",
    q: input["q"] ?? "",
    page: input["page"] === undefined ? 1 : Number(input["page"]),
  });
  const filters = parsed.success ? parsed.data : inboxFiltersSchema.parse({});
  const thread = z.string().uuid().safeParse(input["thread"]);
  return { ...filters, thread: thread.success ? thread.data : undefined };
}
