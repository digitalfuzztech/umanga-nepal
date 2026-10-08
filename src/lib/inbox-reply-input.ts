import { z } from "zod";

export const MAX_REPLY_LENGTH = 50000;
export const inboxReplySchema = z
  .object({
    threadId: z.string().uuid(),
    requestId: z.string().uuid(),
    replyBody: z.string().trim().min(1).max(MAX_REPLY_LENGTH),
  })
  .strict();
export type InboxReplyInput = z.infer<typeof inboxReplySchema>;
export type InboxReplyResult =
  | {
      success: true;
      warning?: string;
      receipt?: { messageId: string; accepted: string[]; rejected: string[] };
    }
  | {
      success: false;
      code:
        | "UNAUTHORIZED"
        | "INVALID_REPLY"
        | "NOT_FOUND"
        | "SAVE_FAILED"
        | "SEND_FAILED"
        | "DELIVERY_UNCONFIRMED";
      message: string;
    };
