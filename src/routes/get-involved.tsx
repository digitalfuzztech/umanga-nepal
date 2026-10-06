import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Handshake, HeartHandshake, Mic, PenLine, Users } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import { Section, SectionHeading } from "@/components/site/Section";
import { Button } from "@/components/ui/button";
import { Newsletter } from "@/components/site/Newsletter";

export const Route = createFileRoute("/get-involved")({
  head: () => ({
    meta: [
      { title: "Get Involved | Volunteer & Partner with Umanga Nepal" },
      {
        name: "description",
        content:
          "Volunteer, partner with us, invite Umanga to your community, share your story or support our mental health work across Nepal.",
      },
      { property: "og:title", content: "Get Involved | Umanga Nepal" },
      {
        property: "og:description",
        content: "Ways to join Umanga Nepal's mental health work: volunteer, partner, invite, share, support.",
      },
    ],
  }),
  component: GetInvolved,
});

const pathways = [
  {
    icon: Users,
    title: "Volunteer",
    body: "Facilitate sessions, help with creative programs, content, outreach or event logistics.",
    to: "/volunteer" as const,
  },
  {
    icon: Handshake,
    title: "Partner with us",
    body: "Schools, colleges, NGOs, workplaces and local bodies collaborating on awareness work.",
    to: "/partner-with-us" as const,
  },
  {
    icon: Mic,
    title: "Invite Umanga",
    body: "Request an awareness session, workshop or creative program for your community.",
    to: "/invite-umanga" as const,
  },
  {
    icon: PenLine,
    title: "Share your story",
    body: "Contribute your experience, on your terms, with full control over what is published.",
    to: "/share-your-story" as const,
  },
  {
    icon: HeartHandshake,
    title: "Support our work",
    body: "Contribute skills, materials or resources that keep community programs running.",
    to: "/support-us" as const,
  },
];

function GetInvolved() {
  return (
    <>
      <PageHero
        eyebrow="Get involved"
        title="There's a place here for you"
        description="Umanga Nepal's work is carried by volunteers, partners and communities. Choose the pathway that fits what you can offer."
      />

      <Section>
        <SectionHeading eyebrow="Pathways" title="Five ways to join in" />
        <ul className="reveal-grid mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {pathways.map((pathway) => (
            <li key={pathway.title}>
              <Link
                to={pathway.to}
                className="group flex h-full flex-col rounded-3xl border border-border bg-card p-7 shadow-soft transition-all hover:-translate-y-1 hover:shadow-lift"
              >
                <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-brand-soft text-brand-strong">
                  <pathway.icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-4 font-display text-xl font-bold text-ink-deep">
                  {pathway.title}
                </h3>
                <p className="mt-2 flex-1 text-sm text-muted-foreground">{pathway.body}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-strong">
                  Learn more
                  <ArrowRight
                    className="size-4 transition-transform group-hover:translate-x-1"
                    aria-hidden
                  />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="blue">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <SectionHeading
            eyebrow="Not sure where you fit?"
            title="Tell us what you can offer and we'll find a fit"
          />
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="brand" size="lg">
              <Link to="/contact">Contact the team</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/our-work">See our programs</Link>
            </Button>
          </div>
        </div>
      </Section>

      <Section>
        <Newsletter />
      </Section>
    </>
  );
}
