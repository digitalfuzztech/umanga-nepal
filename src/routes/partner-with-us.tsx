import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/site/PageHero";
import { Section, SectionHeading } from "@/components/site/Section";
import { InquiryForm } from "@/components/site/InquiryForm";
import { partners } from "@/data/testimonials";

export const Route = createFileRoute("/partner-with-us")({
  head: () => ({
    meta: [
      { title: "Partner With Us | Umanga Nepal" },
      {
        name: "description",
        content:
          "Partner with Umanga Nepal — schools, colleges, NGOs, workplaces and local bodies collaborating on mental health awareness and psychosocial programs in Nepal.",
      },
      { property: "og:title", content: "Partner With Umanga Nepal" },
      {
        property: "og:description",
        content: "Collaborate with Umanga Nepal on mental health awareness programs.",
      },
    ],
  }),
  component: PartnerWithUs,
});

const collaborations = [
  { title: "Schools & colleges", body: "Adolescent wellbeing, exam stress and peer support programs." },
  { title: "NGOs & networks", body: "Joint campaigns, referrals and community-level awareness work." },
  { title: "Workplaces", body: "Stress management and wellbeing sessions for teams." },
  { title: "Local bodies", body: "Ward-level awareness reaching groups outside urban centres." },
];

function PartnerWithUs() {
  return (
    <>
      <PageHero
        eyebrow="Partnerships"
        title="Reach further, together"
        description="Umanga Nepal has delivered awareness sessions, workshops and campaigns in collaboration with partner organizations since 2020."
      />

      <Section>
        <SectionHeading eyebrow="Collaboration" title="Who we work with" />
        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {collaborations.map((item) => (
            <li key={item.title} className="rounded-3xl border border-border bg-card p-7 shadow-soft">
              <h3 className="font-display text-lg font-bold text-ink-deep">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="surface">
        <SectionHeading eyebrow="Existing partners" title="Organizations we've worked alongside" />
        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {partners.map((partner) => (
            <li
              key={partner.id}
              className="flex items-center gap-5 rounded-3xl border border-border bg-card p-6 shadow-soft"
            >
              <div className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-surface-blue text-xs font-semibold text-brand-strong">
                Logo
              </div>
              <div>
                <p className="font-display text-lg font-bold text-ink-deep">{partner.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{partner.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section>
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-border bg-card p-8 shadow-soft sm:p-10">
          <SectionHeading eyebrow="Start a conversation" title="Partnership enquiry" />
          <div className="mt-8">
            <InquiryForm
              submitLabel="Send enquiry"
              successMessage="Thank you — your partnership enquiry has been prepared for the Umanga Nepal team."
              fields={[
                { name: "organization", label: "Organization name", required: true },
                { name: "contactName", label: "Contact person", required: true },
                { name: "email", label: "Email", type: "email", required: true },
                { name: "phone", label: "Phone", type: "tel" },
                {
                  name: "type",
                  label: "Organization type",
                  type: "select",
                  required: true,
                  options: [
                    "School or college",
                    "NGO or network",
                    "Workplace or company",
                    "Local body or government",
                    "Other",
                  ],
                },
                {
                  name: "proposal",
                  label: "What would you like to collaborate on?",
                  type: "textarea",
                  required: true,
                },
              ]}
            />
          </div>
        </div>
      </Section>
    </>
  );
}
