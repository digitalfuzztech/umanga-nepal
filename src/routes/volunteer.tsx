import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/site/PageHero";
import { Section, SectionHeading } from "@/components/site/Section";
import { InquiryForm } from "@/components/site/InquiryForm";
import volunteerImage from "@/assets/program-awareness.jpg";

export const Route = createFileRoute("/volunteer")({
  head: () => ({
    meta: [
      { title: "Volunteer | Umanga Nepal" },
      {
        name: "description",
        content:
          "Volunteer with Umanga Nepal as a facilitator, creative lead, content contributor, outreach volunteer or event support across our mental health programs.",
      },
      { property: "og:title", content: "Volunteer with Umanga Nepal" },
      {
        property: "og:description",
        content: "Join the volunteers delivering mental health awareness work in Nepal.",
      },
    ],
  }),
  component: Volunteer,
});

const roles = [
  { title: "Session facilitator", body: "Co-lead awareness sessions with training and support." },
  { title: "Creative program volunteer", body: "Support art, storytelling and expression sessions." },
  { title: "Content & translation", body: "Write, edit and translate resources into Nepali." },
  { title: "Outreach & community liaison", body: "Connect programs with schools, wards and groups." },
  { title: "Event support", body: "Help run campaigns, logistics and World Mental Health Day." },
  { title: "Design & media", body: "Photography, graphics and social content for campaigns." },
];

function Volunteer() {
  return (
    <>
      <PageHero
        eyebrow="Volunteer"
        title="Give your time to listening"
        description="Volunteers make Umanga Nepal's programs possible. You don't need a clinical background — you need care, reliability and a willingness to learn."
        image={volunteerImage}
      />

      <Section>
        <SectionHeading eyebrow="Roles" title="Where volunteers help" />
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {roles.map((role) => (
            <li key={role.title} className="rounded-3xl border border-border bg-card p-7 shadow-soft">
              <h3 className="font-display text-lg font-bold text-ink-deep">{role.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{role.body}</p>
            </li>
          ))}
        </ul>
        <p className="mt-8 max-w-3xl rounded-2xl border border-border bg-surface p-5 text-sm text-muted-foreground">
          Volunteers receive orientation on facilitation, boundaries, confidentiality and safe
          referral. Volunteers do not provide counselling, diagnosis or clinical treatment.
        </p>
      </Section>

      <Section tone="surface">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-border bg-card p-8 shadow-soft sm:p-10">
          <SectionHeading eyebrow="Apply" title="Volunteer application" />
          <div className="mt-8">
            <InquiryForm
              channel="volunteer"
              submitLabel="Submit application"
              successMessage="Thank you. Your volunteer application has been received."
              consentLabel="I understand my details will be used to consider my volunteer application."
              fields={[
                { name: "name", label: "Full name", required: true },
                { name: "email", label: "Email", type: "email", required: true },
                { name: "phone", label: "Phone", type: "tel" },
                { name: "location", label: "Location", placeholder: "District or city" },
                {
                  name: "role",
                  label: "Preferred role",
                  type: "select",
                  required: true,
                  options: roles.map((role) => role.title).concat("Not sure yet"),
                },
                {
                  name: "availability",
                  label: "Availability",
                  type: "select",
                  options: ["A few hours a month", "Weekly", "Event-based", "Flexible"],
                },
                {
                  name: "motivation",
                  label: "Why do you want to volunteer?",
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
