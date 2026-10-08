import { createFileRoute, Link } from "@tanstack/react-router";
import { Mail, MapPin, Phone } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import { Section, SectionHeading } from "@/components/site/Section";
import { InquiryForm } from "@/components/site/InquiryForm";
import { siteConfig } from "@/data/site-config";
import { supportDisclaimer } from "@/data/support";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Umanga Nepal | Get in Touch" },
      {
        name: "description",
        content:
          "Contact Umanga Nepal about awareness sessions, volunteering, partnerships, media enquiries or general questions about our mental health work.",
      },
      { property: "og:title", content: "Contact Umanga Nepal" },
      {
        property: "og:description",
        content: "Reach the Umanga Nepal team about programs, partnerships and volunteering.",
      },
    ],
  }),
  component: Contact,
});

function Contact() {
  const { contact } = siteConfig;
  const hasContactDetails = Boolean(contact.email || contact.phone || contact.address);

  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Let's start a conversation"
        description="Questions about a program, an invitation, a partnership or the organization itself — this reaches the Umanga Nepal team."
      />

      <Section>
        <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
          <div className="rounded-[2rem] border border-border bg-card p-8 shadow-soft sm:p-10">
            <SectionHeading eyebrow="Send a message" title="Contact form" />
            <div className="mt-8">
              <InquiryForm
                channel="contact"
                submitLabel="Send message"
                fields={[
                  { name: "name", label: "Full name", required: true },
                  { name: "email", label: "Email", type: "email", required: true },
                  { name: "phone", label: "Phone (optional)", type: "tel" },
                  {
                    name: "subject",
                    label: "Reason for contact",
                    type: "select",
                    required: true,
                    options: [
                      "General enquiry",
                      "Invite Umanga to our community",
                      "Volunteering",
                      "Partnership",
                      "Media",
                      "Other",
                    ],
                  },
                  {
                    name: "message",
                    label: "Message",
                    type: "textarea",
                    required: true,
                    placeholder: "Tell us how we can help.",
                  },
                ]}
              />
            </div>
          </div>

          <aside className="flex flex-col gap-6">
            <div className="rounded-[2rem] border border-border bg-surface-blue p-8">
              <h2 className="font-display text-xl font-bold text-ink-deep">Organization details</h2>
              {hasContactDetails ? (
                <ul className="mt-5 flex flex-col gap-4 text-sm text-muted-foreground">
                  {contact.email ? (
                    <li className="flex gap-3">
                      <Mail className="mt-0.5 size-4 shrink-0 text-brand-strong" aria-hidden />
                      <a href={`mailto:${contact.email}`} className="underline underline-offset-4">
                        {contact.email}
                      </a>
                    </li>
                  ) : null}
                  {contact.phone ? (
                    <li className="flex gap-3">
                      <Phone className="mt-0.5 size-4 shrink-0 text-brand-strong" aria-hidden />
                      <a href={`tel:${contact.phone}`} className="underline underline-offset-4">
                        {contact.phone}
                      </a>
                    </li>
                  ) : null}
                  {contact.address ? (
                    <li className="flex gap-3">
                      <MapPin className="mt-0.5 size-4 shrink-0 text-brand-strong" aria-hidden />
                      {contact.address}
                    </li>
                  ) : null}
                </ul>
              ) : (
                <p className="mt-4 text-sm text-muted-foreground">
                  Umanga Nepal's public email, phone number and office address will be listed here
                  once confirmed by the organization. We don't publish contact details we haven't
                  verified — please use the form for now.
                </p>
              )}
            </div>

            <div className="rounded-[2rem] border border-border bg-card p-8 shadow-soft">
              <h2 className="font-display text-xl font-bold text-ink-deep">Need support?</h2>
              <p className="mt-3 text-sm text-muted-foreground">{supportDisclaimer}</p>
              <Link
                to="/get-support"
                className="mt-4 inline-flex text-sm font-semibold text-brand-strong underline underline-offset-4"
              >
                See support options
              </Link>
            </div>

            <div className="rounded-[2rem] border border-dashed border-border bg-surface p-8">
              <h2 className="font-display text-lg font-bold text-ink-deep">Response time</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Umanga Nepal is largely volunteer-run, so replies may take a few days. Messages about
                immediate safety should go to emergency services instead.
              </p>
            </div>
          </aside>
        </div>
      </Section>
    </>
  );
}
