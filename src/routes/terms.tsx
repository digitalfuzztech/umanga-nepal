import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero } from "@/components/site/PageHero";
import { Section } from "@/components/site/Section";
import { supportDisclaimer } from "@/data/support";

export const Route = createFileRoute("/terms")({
  head: () => ({
    meta: [
      { title: "Terms of Use | Umanga Nepal" },
      {
        name: "description",
        content:
          "Terms of use for the Umanga Nepal website, including the limits of the information published here and its relationship to professional care.",
      },
      { property: "og:title", content: "Terms of Use | Umanga Nepal" },
      { property: "og:description", content: "Terms of use for the Umanga Nepal website." },
    ],
  }),
  component: Terms,
});

const sections = [
  {
    title: "Purpose of this website",
    body: [
      "This website provides information about Umanga Nepal, its programs and general mental health education for the public.",
    ],
  },
  {
    title: "Not medical or clinical advice",
    body: [
      supportDisclaimer,
      "Content on this website is educational and general in nature. It is not a substitute for assessment, diagnosis or treatment by a qualified professional. If you are concerned about your mental health, please consult a qualified professional.",
    ],
  },
  {
    title: "Emergencies",
    body: [
      "This website is not monitored continuously and must not be used to report emergencies. If someone is at immediate risk of harm, contact local emergency services or go to the nearest hospital.",
    ],
  },
  {
    title: "Content and accuracy",
    body: [
      "We aim to keep information accurate and current. Some content on this site is clearly marked as demo content prepared for layout purposes and will be replaced with verified organizational material.",
    ],
  },
  {
    title: "Intellectual property",
    body: [
      "Content published on this website belongs to Umanga Nepal unless otherwise stated. Please credit the organization when sharing material.",
    ],
  },
  {
    title: "External links",
    body: [
      "Where we link to external organizations, we are not responsible for the content or practices of those websites.",
    ],
  },
];

function Terms() {
  return (
    <>
      <PageHero
        eyebrow="Terms"
        title="Terms of use"
        description="What this website is for, and the important limits of the information published here."
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
            Need support right now?{" "}
            <Link
              to="/get-support"
              className="font-semibold text-brand-strong underline underline-offset-4"
            >
              See support options
            </Link>
            .
          </p>
        </div>
      </Section>
    </>
  );
}
