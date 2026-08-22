import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero } from "@/components/site/PageHero";
import { Section } from "@/components/site/Section";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Policy | Umanga Nepal" },
      {
        name: "description",
        content:
          "How Umanga Nepal handles information submitted through this website, including form submissions, story consent and newsletter signups.",
      },
      { property: "og:title", content: "Privacy Policy | Umanga Nepal" },
      { property: "og:description", content: "How Umanga Nepal handles your information." },
    ],
  }),
  component: Privacy,
});

const sections = [
  {
    title: "Information we collect",
    body: [
      "We collect only the information you choose to submit through the forms on this website: your name, contact details, organization where relevant, and the content of your message or story.",
      "This website does not currently use analytics or advertising cookies.",
    ],
  },
  {
    title: "How we use it",
    body: [
      "Information is used solely to respond to your message, process a volunteer or partnership enquiry, plan a requested session, or discuss a story submission with you.",
      "We do not sell, rent or trade personal information.",
    ],
  },
  {
    title: "Stories and consent",
    body: [
      "Stories submitted through this website are never published without explicit consent from the person who shared them. You may choose to remain anonymous and may withdraw your story at any time.",
    ],
  },
  {
    title: "Sensitive information",
    body: [
      "Please do not submit clinical or medical records through this website. Umanga Nepal is not a clinical provider and this site is not a secure channel for health records.",
    ],
  },
  {
    title: "Retention and access",
    body: [
      "Submissions are kept only as long as needed to respond and to maintain a basic record of program activity. You may ask us to correct or delete your information at any time.",
    ],
  },
  {
    title: "Updates to this policy",
    body: [
      "This policy may be revised as the organization's processes develop. Material changes will be reflected on this page.",
    ],
  },
];

function Privacy() {
  return (
    <>
      <PageHero
        eyebrow="Privacy"
        title="Privacy policy"
        description="A plain-language summary of how Umanga Nepal handles information submitted through this website."
      />
      <Section>
        <div className="mx-auto flex max-w-3xl flex-col gap-10">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="font-display text-2xl font-bold text-ink-deep">{section.title}</h2>
              <div className="mt-3 flex flex-col gap-3">
                {section.body.map((paragraph) => (
                  <p key={paragraph} className="text-base leading-relaxed text-muted-foreground">
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
          <p className="rounded-2xl border border-border bg-surface p-5 text-sm text-muted-foreground">
            Questions about this policy?{" "}
            <Link to="/contact" className="font-semibold text-brand-strong underline underline-offset-4">
              Contact the team
            </Link>
            .
          </p>
        </div>
      </Section>
    </>
  );
}
