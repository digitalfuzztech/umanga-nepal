import "@tanstack/react-start/server-only";
import type { CapturedLead } from "./submit-lead";

const subjects = {
  contact: "New Contact Enquiry",
  newsletter: "New Newsletter Subscription",
  volunteer: "New Volunteer Enquiry",
  partner: "New Partnership Enquiry",
  support: "New Support Request",
  invite: "New Invite Umanga Request",
  stories: "New Story Submission",
} as const;
const labels: Record<string, string> = {
  organization: "Organization",
  location: "Location",
  role: "Preferred role",
  availability: "Availability",
  type: "Organization type",
  supportType: "Type of support",
  program: "Program of interest",
  audience: "Audience",
  attribution: "Attribution preference",
  consent: "Submission consent",
  source: "Submitted from",
  event: "Submission type",
};
const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        character
      ]!,
  );

export function buildLeadNotification(lead: CapturedLead) {
  const lines = [
    `Channel: ${lead.channel}`,
    `Submitted: ${lead.submittedAt.toISOString()}`,
    `Name: ${lead.name ?? "Not provided"}`,
    `Email: ${lead.email}`,
  ];
  if (lead.phone) lines.push(`Phone: ${lead.phone}`);
  if (lead.subject) lines.push(`Subject: ${lead.subject}`);
  for (const [key, value] of Object.entries(lead.metadata)) {
    if (key === "notification" || value === null) continue;
    lines.push(
      `${labels[key] ?? key}: ${value === true ? "Yes" : String(value)}`,
    );
  }
  lines.push(
    "",
    lead.body
      ? "Message:"
      : "Newsletter subscription requested; no message was submitted.",
  );
  if (lead.body) lines.push(lead.body);
  lines.push(
    "",
    "Respond through the Admin Inbox when available, using this channel's public identity.",
  );
  const text = lines.join("\n");
  return {
    subject: `[Umanga Nepal] ${subjects[lead.channel]}`,
    text,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6"><h1 style="font-size:20px">Umanga Nepal</h1><h2 style="font-size:16px">${subjects[lead.channel]}</h2><p style="white-space:pre-wrap">${escapeHtml(text)}</p></div>`,
  };
}
