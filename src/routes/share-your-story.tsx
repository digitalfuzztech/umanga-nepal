import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import { Section, SectionHeading } from "@/components/site/Section";
import { InquiryForm } from "@/components/site/InquiryForm";
import { supportDisclaimer } from "@/data/support";

export const Route = createFileRoute("/share-your-story")({
  head: () => ({
    meta: [
      { title: "Share Your Story | Umanga Nepal" },
      {
        name: "description",
        content:
          "Share your mental health experience with Umanga Nepal on your own terms — anonymously if you prefer, and only published with your explicit consent.",
      },
      { property: "og:title", content: "Share Your Story | Umanga Nepal" },
      {
        property: "og:description",
        content: "Contribute your experience to Umanga Nepal's storytelling work, with full control over consent.",
      },
    ],
  }),
  component: ShareYourStory,
});

const promises = [
  "You decide whether your name appears, or whether the story is published anonymously.",
  "Nothing is published without your explicit written consent.",
  "You can withdraw your story at any time, before or after publication.",
  "We may lightly edit for clarity and length, and will share the edit with you first.",
];

function ShareYourStory() {
  return (
    <>
      <PageHero
        eyebrow="Share your story"
        title="Your experience can help someone else feel less alone"
        description="Sharing is caring. Many people carry difficult feelings quietly, believing no one else would understand."
      />

      <Section>
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div className="rounded-[2rem] border border-border bg-surface-blue p-8">
            <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-background text-brand-strong">
              <ShieldCheck className="size-5" aria-hidden />
            </span>
            <h2 className="mt-4 font-display text-2xl font-bold text-ink-deep">Our consent promise</h2>
            <ul className="mt-5 flex flex-col gap-3 text-sm text-muted-foreground">
              {promises.map((promise) => (
                <li key={promise} className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-warm" aria-hidden />
                  {promise}
                </li>
              ))}
            </ul>
            <p className="mt-6 text-sm text-muted-foreground">
              {supportDisclaimer}{" "}
              <Link to="/get-support" className="font-semibold underline underline-offset-4">
                Find support options
              </Link>
              .
            </p>
          </div>

          <div className="rounded-[2rem] border border-border bg-card p-8 shadow-soft sm:p-10">
            <SectionHeading eyebrow="Submit" title="Tell us your story" />
            <div className="mt-8">
              <InquiryForm
                channel="stories"
                submitLabel="Submit story"
                successMessage="Thank you for trusting us with your story. The team will read it carefully and contact you before anything is published."
                consentLabel="I understand my story will not be published without my explicit consent."
                fields={[
                  { name: "name", label: "Name (optional)" },
                  { name: "email", label: "Email", type: "email", required: true },
                  {
                    name: "attribution",
                    label: "How should this be attributed?",
                    type: "select",
                    required: true,
                    options: [
                      "Publish anonymously",
                      "Use my first name only",
                      "Use my full name",
                      "I'll decide later",
                    ],
                  },
                  { name: "title", label: "Story title (optional)" },
                  {
                    name: "story",
                    label: "Your story",
                    type: "textarea",
                    required: true,
                    placeholder: "Write as much or as little as you'd like.",
                  },
                ]}
              />
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
