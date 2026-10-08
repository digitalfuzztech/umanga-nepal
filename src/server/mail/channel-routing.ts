import "@tanstack/react-start/server-only";

import type { InboxThread } from "../db/schema";
import { sendMail, type SendMailInput, type SafeMailResult } from "./index";

export type LeadChannel = InboxThread["channel"];
export type GeneralOutboundType = "info" | "news";

export const leadMailboxes = Object.freeze({
  contact: "contact@umanganepal.org",
  newsletter: "newsletter@umanganepal.org",
  volunteer: "volunteer@umanganepal.org",
  partner: "partners@umanganepal.org",
  support: "support@umanganepal.org",
  invite: "invite@umanganepal.org",
  stories: "stories@umanganepal.org",
} satisfies Record<LeadChannel, string>);

const generalMailboxes = Object.freeze({
  info: "info@umanganepal.org",
  news: "news@umanganepal.org",
} satisfies Record<GeneralOutboundType, string>);

export function getLeadMailbox(channel: LeadChannel): string {
  if (!Object.hasOwn(leadMailboxes, channel)) {
    throw new Error("INVALID_MAIL_CHANNEL");
  }
  return leadMailboxes[channel];
}

export function getOutboundIdentity(channel: LeadChannel) {
  return { name: "Umanga Nepal", address: getLeadMailbox(channel) };
}

export function getGeneralOutboundIdentity(type: GeneralOutboundType) {
  if (!Object.hasOwn(generalMailboxes, type)) {
    throw new Error("INVALID_OUTBOUND_IDENTITY");
  }
  return { name: "Umanga Nepal", address: generalMailboxes[type] };
}

// No sender or Reply-To supplied by a browser can override these identities.
export function sendLeadMail(
  channel: LeadChannel,
  input: Omit<SendMailInput, "replyTo">,
): Promise<SafeMailResult> {
  const identity = getOutboundIdentity(channel);
  return sendMail({ ...input, replyTo: identity.address }, identity);
}

export function sendLeadNotification(
  channel: LeadChannel,
  input: Omit<SendMailInput, "to" | "replyTo">,
): Promise<SafeMailResult> {
  return sendLeadMail(channel, { ...input, to: getLeadMailbox(channel) });
}

export function sendGeneralMail(
  type: GeneralOutboundType,
  input: Omit<SendMailInput, "replyTo">,
): Promise<SafeMailResult> {
  const identity = getGeneralOutboundIdentity(type);
  return sendMail({ ...input, replyTo: identity.address }, identity);
}
