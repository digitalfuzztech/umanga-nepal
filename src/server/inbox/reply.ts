import "@tanstack/react-start/server-only";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { inboxChannels } from "@/lib/admin-inbox-input";
import {
  inboxReplySchema,
  type InboxReplyInput,
  type InboxReplyResult,
} from "@/lib/inbox-reply-input";
import { getCurrentAdmin } from "../auth";
import { db } from "../db";
import {
  inboxMessages,
  inboxThreads,
  type InboxThread,
  type InboxMessage,
} from "../db/schema";
import { getOutboundIdentity, sendLeadMail } from "../mail/channel-routing";

const fallbackSubjects = {
  contact: "Contact enquiry",
  newsletter: "Newsletter enquiry",
  volunteer: "Volunteer enquiry",
  partner: "Partnership enquiry",
  support: "Support request",
  invite: "Invite Umanga request",
  stories: "Story submission",
} as const;
const privateMailbox = /admin@umanganepal\.org/i;
const escapeHtml = (text: string) =>
  text.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ]!,
  );

export function resolveInboxReply(
  thread: Pick<InboxThread, "channel" | "leadEmail" | "subject">,
) {
  const channel = z.enum(inboxChannels).parse(thread.channel);
  const recipient = z.string().trim().max(320).email().parse(thread.leadEmail);
  if (privateMailbox.test(recipient)) throw new Error("INVALID_RECIPIENT");
  const identity = getOutboundIdentity(channel);
  const original = (thread.subject ?? "")
    .replace(/[\r\n]+/g, " ")
    .replace(/^(?:\s*re\s*:\s*)+/i, "")
    .trim();
  const subject = `Re: ${original || fallbackSubjects[channel]}`;
  if (privateMailbox.test(subject)) throw new Error("INVALID_SUBJECT");
  return {
    channel,
    fromName: identity.name,
    fromAddress: identity.address,
    toAddress: recipient,
    replyTo: identity.address,
    subject,
  };
}
export function buildInboxReplyMail(subject: string, body: string) {
  return {
    subject,
    text: body,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6"><p style="white-space:pre-wrap">${escapeHtml(body)}</p><p style="margin-top:24px;font-weight:bold">Umanga Nepal</p></div>`,
  };
}

async function prepareReply(input: InboxReplyInput) {
  return db.transaction(async (tx) => {
    // Lock the parent while reserving the request ID; SMTP occurs after commit.
    const [thread] = await tx
      .select()
      .from(inboxThreads)
      .where(eq(inboxThreads.id, input.threadId))
      .for("update");
    if (!thread) return null;
    const routing = resolveInboxReply(thread);
    const [existing] = await tx
      .select()
      .from(inboxMessages)
      .where(eq(inboxMessages.id, input.requestId));
    if (existing) {
      if (
        existing.threadId !== thread.id ||
        existing.direction !== "outbound" ||
        existing.body !== input.replyBody
      )
        throw new Error("REQUEST_CONFLICT");
      return { message: existing, routing, created: false };
    }
    const createdAt = new Date();
    const message: InboxMessage = {
      id: input.requestId,
      threadId: thread.id,
      direction: "outbound",
      senderType: "staff",
      fromAddress: routing.fromAddress,
      toAddress: routing.toAddress,
      subject: routing.subject,
      body: input.replyBody,
      deliveryStatus: "pending",
      smtpMessageId: null,
      deliveryErrorCode: null,
      createdAt,
    };
    await tx.insert(inboxMessages).values(message);
    await tx
      .update(inboxThreads)
      .set({ lastMessageAt: createdAt })
      .where(eq(inboxThreads.id, thread.id));
    return { message, routing, created: true };
  });
}
async function finishReply(
  id: string,
  delivery: {
    deliveryStatus: "sent" | "failed";
    smtpMessageId: string | null;
    deliveryErrorCode: string | null;
  },
) {
  await db
    .update(inboxMessages)
    .set(delivery)
    .where(
      and(
        eq(inboxMessages.id, id),
        eq(inboxMessages.deliveryStatus, "pending"),
      ),
    );
}

// Fault injection stays server-only and is used by the manual verification harness.
export function createInboxReplyService(
  dependencies: {
    authenticate?: typeof getCurrentAdmin;
    prepare?: typeof prepareReply;
    send?: typeof sendLeadMail;
    finish?: typeof finishReply;
  } = {},
) {
  const authenticate = dependencies.authenticate ?? getCurrentAdmin;
  const prepare = dependencies.prepare ?? prepareReply;
  const send = dependencies.send ?? sendLeadMail;
  const finish = dependencies.finish ?? finishReply;
  return async (input: unknown): Promise<InboxReplyResult> => {
    try {
      if (!(await authenticate()))
        return {
          success: false,
          code: "UNAUTHORIZED",
          message: "Please sign in to reply.",
        };
    } catch {
      return {
        success: false,
        code: "UNAUTHORIZED",
        message: "Please sign in to reply.",
      };
    }
    const parsed = inboxReplySchema.safeParse(input);
    if (!parsed.success || privateMailbox.test(parsed.data.replyBody))
      return {
        success: false,
        code: "INVALID_REPLY",
        message: "Please enter a valid reply and try again.",
      };
    let prepared: Awaited<ReturnType<typeof prepareReply>>;
    try {
      prepared = await prepare(parsed.data);
    } catch {
      return {
        success: false,
        code: "SAVE_FAILED",
        message: "Unable to prepare this reply. No email was sent.",
      };
    }
    if (!prepared)
      return {
        success: false,
        code: "NOT_FOUND",
        message: "This enquiry is no longer available.",
      };
    const { message, routing, created } = prepared;
    if (!created) {
      if (message.deliveryStatus === "sent") return { success: true };
      if (message.deliveryStatus === "failed")
        return {
          success: false,
          code: "SEND_FAILED",
          message:
            "This reply failed. Review the message before sending a new attempt.",
        };
      return {
        success: false,
        code: "DELIVERY_UNCONFIRMED",
        message:
          "This reply is pending or its delivery is unconfirmed. Check its status before sending again.",
      };
    }
    let smtpMessageId: string;
    let receipt: { messageId: string; accepted: string[]; rejected: string[] };
    try {
      const result = await send(routing.channel, {
        to: routing.toAddress,
        ...buildInboxReplyMail(routing.subject, message.body),
      });
      if (
        result.rejected.length ||
        !result.accepted.some(
          (address) =>
            address.toLowerCase() === routing.toAddress.toLowerCase(),
        )
      )
        throw new Error("RECIPIENT_REJECTED");
      smtpMessageId = result.messageId;
      receipt = {
        messageId: result.messageId,
        accepted: result.accepted,
        rejected: result.rejected,
      };
    } catch {
      try {
        await finish(message.id, {
          deliveryStatus: "failed",
          smtpMessageId: null,
          deliveryErrorCode: "REPLY_SEND_FAILED",
        });
      } catch {
        return {
          success: false,
          code: "DELIVERY_UNCONFIRMED",
          message:
            "The reply could not be confirmed and its status could not be saved. Check delivery before sending again.",
        };
      }
      return {
        success: false,
        code: "SEND_FAILED",
        message:
          "The reply could not be sent. Your attempted message is saved in history.",
      };
    }
    try {
      await finish(message.id, {
        deliveryStatus: "sent",
        smtpMessageId,
        deliveryErrorCode: null,
      });
    } catch {
      // Keep the pending row, log reconciliation identifiers, and never resend automatically.
      console.error(
        `[inbox] REPLY_SENT_STATUS_SAVE_FAILED message=${message.id} smtpMessageId=${smtpMessageId}`,
      );
      return {
        success: true,
        receipt,
        warning:
          "The mail server accepted your reply, but its delivery status could not be saved. Do not resend; delivery needs confirmation.",
      };
    }
    return { success: true, receipt };
  };
}
export const replyToInboxThread = createInboxReplyService();
