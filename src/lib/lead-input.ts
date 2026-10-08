import { z } from "zod";

const text = (max: number) => z.string().trim().min(1).max(max);
const optionalText = (max: number) =>
  z.string().trim().max(max).optional().default("");
const email = z
  .string()
  .trim()
  .max(320)
  .email()
  .transform((value) => value.toLowerCase());
const consent = z.literal(true);
const contact = z
  .object({
    name: text(255),
    email,
    phone: optionalText(100),
    subject: z.enum([
      "General enquiry",
      "Invite Umanga to our community",
      "Volunteering",
      "Partnership",
      "Media",
      "Other",
    ]),
    message: text(20000),
  })
  .strict();
const volunteer = z
  .object({
    name: text(255),
    email,
    phone: optionalText(100),
    location: optionalText(255),
    role: z.enum([
      "Session facilitator",
      "Creative program volunteer",
      "Content & translation",
      "Outreach & community liaison",
      "Event support",
      "Design & media",
      "Not sure yet",
    ]),
    availability: z
      .enum(["", "A few hours a month", "Weekly", "Event-based", "Flexible"])
      .optional()
      .default(""),
    motivation: text(20000),
  })
  .strict();
const partner = z
  .object({
    organization: text(255),
    contactName: text(255),
    email,
    phone: optionalText(100),
    type: z.enum([
      "School or college",
      "NGO or network",
      "Workplace or company",
      "Local body or government",
      "Other",
    ]),
    proposal: text(20000),
  })
  .strict();
const support = z
  .object({
    name: text(255),
    organization: optionalText(255),
    email,
    supportType: z.enum([
      "Give your skills",
      "Provide materials or space",
      "Amplify the work",
      "Organizational support",
      "Something else",
    ]),
    details: text(20000),
  })
  .strict();
const invite = z
  .object({
    organization: text(255),
    contactName: text(255),
    email,
    phone: optionalText(100),
    location: optionalText(255),
    program: text(255),
    audience: optionalText(255),
    details: text(20000),
  })
  .strict();
const stories = z
  .object({
    name: optionalText(255),
    email,
    attribution: z.enum([
      "Publish anonymously",
      "Use my first name only",
      "Use my full name",
      "I'll decide later",
    ]),
    title: optionalText(255),
    story: text(100000),
  })
  .strict();

export const newsletterSources = [
  "/",
  "/get-involved",
  "/events",
  "/news",
] as const;
export type NewsletterSource = (typeof newsletterSources)[number];
export const leadInputSchema = z.discriminatedUnion("channel", [
  z
    .object({ channel: z.literal("contact"), fields: contact, consent })
    .strict(),
  z
    .object({ channel: z.literal("volunteer"), fields: volunteer, consent })
    .strict(),
  z
    .object({ channel: z.literal("partner"), fields: partner, consent })
    .strict(),
  z
    .object({ channel: z.literal("support"), fields: support, consent })
    .strict(),
  z.object({ channel: z.literal("invite"), fields: invite, consent }).strict(),
  z
    .object({ channel: z.literal("stories"), fields: stories, consent })
    .strict(),
  z
    .object({
      channel: z.literal("newsletter"),
      fields: z.object({ email }).strict(),
      consent,
      source: z.enum(newsletterSources),
    })
    .strict(),
]);

export type LeadInput = z.infer<typeof leadInputSchema>;
export type PublicLeadResult =
  | { success: true }
  | { success: false; error: string; fieldErrors: Record<string, string> };

export function invalidLeadResult(error: z.ZodError): PublicLeadResult {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0] === "fields" ? issue.path[1] : issue.path[0];
    if (typeof key !== "string" || !/^[a-zA-Z]+$/.test(key)) continue;
    fieldErrors[key] =
      key === "consent"
        ? "Please confirm before submitting."
        : key === "email"
          ? "Please enter a valid email address."
          : issue.code === "too_big"
            ? "Please shorten this field."
            : "Please check this field.";
  }
  return {
    success: false,
    error: "Please check the form and try again.",
    fieldErrors,
  };
}
