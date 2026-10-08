import { createFileRoute, Link } from "@tanstack/react-router";
import { Box, Megaphone, Sparkles, Users } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import { Section, SectionHeading } from "@/components/site/Section";
import { InquiryForm } from "@/components/site/InquiryForm";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/support-us")({
  head: () => ({
    meta: [
      { title: "Support Our Work | Umanga Nepal" },
      {
        name: "description",
        content:
          "Support Umanga Nepal's mental health programs by contributing skills, materials, venues or advocacy that keep community sessions running.",
      },
      { property: "og:title", content: "Support Umanga Nepal" },
      {
        property: "og:description",
        content: "Ways to support community mental health programs in Nepal.",
      },
    ],
  }),
  component: SupportUs,
});

const ways = [
  {
    icon: Users,
    title: "Give your skills",
    body: "Facilitation, translation, design, research, photography and program coordination.",
  },
  {
    icon: Box,
    title: "Provide materials or space",
    body: "Art supplies, printing, refreshments or a venue for a community session.",
  },
  {
    icon: Megaphone,
    title: "Amplify the work",
    body: "Share campaigns, invite us into your networks and help normalise the conversation.",
  },
  {
    icon: Sparkles,
    title: "Organizational support",
    body: "Institutional or in-kind support for programs, agreed directly with the team.",
  },
];

function SupportUs() {
  return (
    <>
      <PageHero
        eyebrow="Support our work"
        title="Keep community conversations going"
        description="Umanga Nepal's programs run on volunteered time, shared spaces and practical contributions from people who believe mental health matters."
      >
        <Button asChild variant="brand" size="lg">
          <Link to="/contact">Talk to the team</Link>
        </Button>
      </PageHero>

      <Section>
        <SectionHeading eyebrow="Ways to help" title="What makes a difference" />
        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {ways.map((way) => (
            <li key={way.title} className="rounded-3xl border border-border bg-card p-7 shadow-soft">
              <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-warm-soft text-warm-strong">
                <way.icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-4 font-display text-lg font-bold text-ink-deep">{way.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{way.body}</p>
            </li>
          ))}
        </ul>
        <p className="mt-8 max-w-3xl rounded-2xl border border-border bg-surface p-5 text-sm text-muted-foreground">
          Online donation channels are not published on this website. Any financial or in-kind
          support is arranged directly with Umanga Nepal so that details can be confirmed properly.
        </p>
      </Section>

      <Section tone="surface">
        <div className="mx-auto max-w-3xl rounded-[2rem] border border-border bg-card p-8 shadow-soft sm:p-10">
          <SectionHeading eyebrow="Offer support" title="Tell us how you'd like to help" />
          <div className="mt-8">
            <InquiryForm
              channel="support"
              submitLabel="Send offer"
              successMessage="Thank you. Your offer of support has been received."
              fields={[
                { name: "name", label: "Name", required: true },
                { name: "organization", label: "Organization (optional)" },
                { name: "email", label: "Email", type: "email", required: true },
                {
                  name: "supportType",
                  label: "Type of support",
                  type: "select",
                  required: true,
                  options: ways.map((way) => way.title).concat("Something else"),
                },
                {
                  name: "details",
                  label: "Tell us more",
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
