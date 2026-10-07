import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/site/PageHero";
import { Section, SectionHeading } from "@/components/site/Section";
import { InquiryForm } from "@/components/site/InquiryForm";
import { getPublishedOurWorkItemsServerFn } from "@/lib/our-work-server-functions";
import inviteImage from "@/assets/program-school.jpg";

export const Route = createFileRoute("/invite-umanga")({
  loader: () => getPublishedOurWorkItemsServerFn(),
  staleTime: 0,
  gcTime: 0,
  shouldReload: true,
  head: () => ({
    meta: [
      { title: "Invite Umanga | Request a Mental Health Session" },
      {
        name: "description",
        content:
          "Request a mental health awareness session, stress management workshop or creative wellbeing program from Umanga Nepal for your school, workplace or community.",
      },
      { property: "og:title", content: "Invite Umanga Nepal" },
      {
        property: "og:description",
        content: "Request an awareness session or workshop for your school, workplace or community.",
      },
    ],
  }),
  component: InviteUmanga,
});

function InviteUmanga() {
  const programs = Route.useLoaderData();
  return (
    <>
      <PageHero
        eyebrow="Invite Umanga"
        title="Bring a session to your community"
        description="We work with schools, colleges, workplaces, wards and community groups to run awareness sessions and workshops shaped around your context."
        image={inviteImage}
      />

      <Section>
        <SectionHeading
          eyebrow="How it works"
          title="From request to session"
          description="We'll talk through your group, goals and context before confirming a format and date."
        />
        <ol className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            { step: "01", title: "Send a request", body: "Tell us about your group and what you need." },
            { step: "02", title: "Plan together", body: "We agree on format, topics, language and timing." },
            { step: "03", title: "Deliver the session", body: "Facilitators run the session with your group." },
          ].map((item) => (
            <li key={item.step} className="rounded-3xl border border-border bg-card p-7 shadow-soft">
              <span className="font-display text-sm font-extrabold text-warm-strong">
                {item.step}
              </span>
              <h3 className="mt-2 font-display text-lg font-bold text-ink-deep">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section tone="surface">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-border bg-card p-8 shadow-soft sm:p-10">
          <SectionHeading eyebrow="Request" title="Session request form" />
          <div className="mt-8">
            <InquiryForm
              submitLabel="Send request"
              successMessage="Thank you — your session request has been prepared for the Umanga Nepal team."
              fields={[
                { name: "organization", label: "School / organization", required: true },
                { name: "contactName", label: "Contact person", required: true },
                { name: "email", label: "Email", type: "email", required: true },
                { name: "phone", label: "Phone", type: "tel" },
                { name: "location", label: "Location", placeholder: "District or city" },
                {
                  name: "program",
                  label: "Program of interest",
                  type: "select",
                  required: true,
                  options: programs.map((program) => program.title).concat("Not sure yet"),
                },
                {
                  name: "audience",
                  label: "Who will attend?",
                  placeholder: "e.g. 40 secondary students",
                },
                {
                  name: "details",
                  label: "Preferred dates and anything else we should know",
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
