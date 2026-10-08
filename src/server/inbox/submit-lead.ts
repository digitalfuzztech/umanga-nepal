import "@tanstack/react-start/server-only";
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import {
  leadInputSchema,
  invalidLeadResult,
  type LeadInput,
  type PublicLeadResult,
} from "@/lib/lead-input";
import { db } from "../db";
import {
  inboxThreads,
  inboxMessages,
  type InboxMetadataValue,
} from "../db/schema";
import {
  getLeadMailbox,
  sendLeadNotification,
  type LeadChannel,
} from "../mail/channel-routing";
import { getPublishedOurWorkItems } from "../our-work";
import { buildLeadNotification } from "./notification";

const sources = {
  contact: "/contact",
  volunteer: "/volunteer",
  partner: "/partner-with-us",
  support: "/support-us",
  invite: "/invite-umanga",
  stories: "/share-your-story",
} as const;
export type CapturedLead = {
  id: string;
  channel: LeadChannel;
  mailbox: string;
  name: string | null;
  email: string;
  phone: string | null;
  subject: string | null;
  body: string;
  metadata: Record<string, InboxMetadataValue>;
  submittedAt: Date;
};

export function mapLead(input: LeadInput): CapturedLead {
  let name: string | null = null;
  let phone: string | null = null;
  let subject: string | null = null;
  let body = "";
  switch (input.channel) {
    case "contact":
      name = input.fields.name;
      phone = input.fields.phone || null;
      subject = input.fields.subject;
      body = input.fields.message;
      break;
    case "volunteer":
      name = input.fields.name;
      phone = input.fields.phone || null;
      body = input.fields.motivation;
      break;
    case "partner":
      name = input.fields.contactName;
      phone = input.fields.phone || null;
      body = input.fields.proposal;
      break;
    case "support":
      name = input.fields.name;
      body = input.fields.details;
      break;
    case "invite":
      name = input.fields.contactName;
      phone = input.fields.phone || null;
      body = input.fields.details;
      break;
    case "stories":
      name = input.fields.name || null;
      subject = input.fields.title || null;
      body = input.fields.story;
      break;
    case "newsletter":
      break;
  }
  const universal = new Set([
    "name",
    "contactName",
    "email",
    "phone",
    "subject",
    "title",
    "message",
    "motivation",
    "proposal",
    "details",
    "story",
  ]);
  const metadata: CapturedLead["metadata"] = {};
  for (const [key, value] of Object.entries(input.fields)) {
    if (!universal.has(key)) metadata[key] = value || null;
  }
  metadata["consent"] = true;
  metadata["source"] =
    input.channel === "newsletter" ? input.source : sources[input.channel];
  if (input.channel === "newsletter")
    metadata["event"] = "newsletter_subscription";
  metadata["notification"] = { status: "pending" };
  return {
    id: randomUUID(),
    channel: input.channel,
    mailbox: getLeadMailbox(input.channel),
    name,
    email: input.fields.email,
    phone,
    subject,
    body,
    metadata,
    submittedAt: new Date(),
  };
}

export async function persistLead(lead: CapturedLead): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.insert(inboxThreads).values({
      id: lead.id,
      channel: lead.channel,
      mailbox: lead.mailbox,
      leadName: lead.name,
      leadEmail: lead.email,
      leadPhone: lead.phone,
      subject: lead.subject,
      metadata: lead.metadata,
      status: "new",
      readAt: null,
      lastMessageAt: lead.submittedAt,
      createdAt: lead.submittedAt,
      updatedAt: lead.submittedAt,
    });
    await tx.insert(inboxMessages).values({
      id: randomUUID(),
      threadId: lead.id,
      direction: "inbound",
      senderType: "lead",
      fromAddress: lead.email,
      toAddress: lead.mailbox,
      subject: lead.subject,
      body: lead.body,
      createdAt: lead.submittedAt,
    });
  });
}

async function recordNotification(
  lead: CapturedLead,
  notification: InboxMetadataValue,
) {
  await db
    .update(inboxThreads)
    .set({ metadata: { ...lead.metadata, notification } })
    .where(eq(inboxThreads.id, lead.id));
}

// Server-only dependency injection permits failure tests without changing live SMTP.
export function createLeadSubmissionService(
  dependencies: {
    persist?: typeof persistLead;
    notify?: typeof sendLeadNotification;
    recordNotification?: typeof recordNotification;
  } = {},
) {
  const persist = dependencies.persist ?? persistLead;
  const notify = dependencies.notify ?? sendLeadNotification;
  const record = dependencies.recordNotification ?? recordNotification;
  return async (request: unknown): Promise<PublicLeadResult> => {
    const parsed = leadInputSchema.safeParse(request);
    if (!parsed.success) return invalidLeadResult(parsed.error);
    if (
      parsed.data.channel === "invite" &&
      parsed.data.fields.program !== "Not sure yet"
    ) {
      const requestedProgram = parsed.data.fields.program;
      try {
        const programs = await getPublishedOurWorkItems();
        if (!programs.some((program) => program.title === requestedProgram)) {
          return {
            success: false,
            error: "Please check the form and try again.",
            fieldErrors: { program: "Please select an available program." },
          };
        }
      } catch {
        return {
          success: false,
          error:
            "We couldn't receive your request right now. Please try again.",
          fieldErrors: {},
        };
      }
    }
    const lead = mapLead(parsed.data);
    try {
      await persist(lead);
    } catch {
      console.error(`[inbox] CAPTURE_FAILED channel=${lead.channel}`);
      return {
        success: false,
        error: "We couldn't receive your message right now. Please try again.",
        fieldErrors: {},
      };
    }
    let notification: InboxMetadataValue;
    try {
      const message = buildLeadNotification(lead);
      const result = await notify(lead.channel, message);
      if (
        result.rejected.length ||
        !result.accepted.some(
          (address) => address.toLowerCase() === lead.mailbox,
        )
      )
        throw new Error("NOT_ACCEPTED");
      notification = {
        status: "sent",
        subject: message.subject,
        messageId: result.messageId,
        accepted: result.accepted,
        rejected: result.rejected,
        from: lead.mailbox,
        to: lead.mailbox,
        replyTo: lead.mailbox,
      };
    } catch {
      notification = {
        status: "failed",
        errorCode: "MAIL_NOTIFICATION_FAILED",
      };
      console.error(
        `[inbox] MAIL_NOTIFICATION_FAILED thread=${lead.id} channel=${lead.channel}`,
      );
    }
    try {
      await record(lead, notification);
    } catch {
      console.error(
        `[inbox] NOTIFICATION_STATUS_SAVE_FAILED thread=${lead.id}`,
      );
    }
    return { success: true };
  };
}

export const submitLead = createLeadSubmissionService();
