import { createFileRoute, Link } from "@tanstack/react-router";
import { BookOpenText, Ear, HeartHandshake, Megaphone, Network } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import { Section, SectionHeading } from "@/components/site/Section";
import { Button } from "@/components/ui/button";
import { CTABand } from "@/components/site/CTABand";
import heroImage from "@/assets/hero-community.jpg";
import { futureDirection, objectiveGroups } from "@/data/impact";
import { partners } from "@/data/testimonials";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About Umanga Nepal | A Mental Health NGO in Nepal" },
      {
        name: "description",
        content:
          "Umanga Nepal is a registered non-profit NGO working on mental health awareness, psychosocial wellbeing, youth empowerment and community engagement across Nepal.",
      },
      { property: "og:title", content: "About Umanga Nepal" },
      {
        property: "og:description",
        content:
          "Our story, vision, mission, approach and objectives as a community mental health organization in Nepal.",
      },
    ],
  }),
  component: About,
});

const icons = {
  ear: Ear,
  heart: HeartHandshake,
  book: BookOpenText,
  network: Network,
  megaphone: Megaphone,
} as const;

const approach = [
  {
    title: "Community first",
    body: "Programs are shaped with the schools, wards and groups that host them, in the language people actually use.",
  },
  {
    title: "Consent and dignity",
    body: "No story is shared without permission. Participants decide what is spoken about and what stays private.",
  },
  {
    title: "Awareness, not diagnosis",
    body: "We build understanding and encourage help-seeking. We do not offer clinical diagnosis or treatment.",
  },
  {
    title: "Creative and human",
    body: "Art, storytelling and conversation reach places where formal presentation cannot.",
  },
];

function About() {
  return (
    <>
      <PageHero
        eyebrow="About us"
        title="Mental health is a fundamental right."
        description="Umanga Nepal is a registered non-profit, non-governmental organization committed to fostering social wellbeing and mental health awareness across Nepal."
        image={heroImage}
      >
        <Button asChild variant="brand" size="lg">
          <Link to="/our-work">See our programs</Link>
        </Button>
        <Button asChild variant="outline" size="lg">
          <Link to="/impact">Our impact</Link>
        </Button>
      </PageHero>

      <Section>
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <SectionHeading eyebrow="Cherish With Umanga" title="Our story" />
          <div className="flex flex-col gap-5 text-base leading-relaxed text-muted-foreground">
            <p>
              Umanga Nepal was established around the belief that mental health is a fundamental
              right and that awareness, education and open conversation can help create meaningful
              change.
            </p>
            <p>
              The organization envisions a Nepal where mental health is understood, destigmatized
              and increasingly accessible regardless of geography, background or circumstance.
            </p>
            <p>
              Our work combines community engagement, youth empowerment, psychosocial support,
              education, creative interventions, campaigns and partnerships. Sharing is caring —
              yet people often retain difficult thoughts and feelings within themselves. We believe
              in the power of being heard.
            </p>
          </div>
        </div>
      </Section>

      <Section tone="surface">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-border bg-surface-blue p-9">
            <span className="eyebrow">Our vision</span>
            <p className="mt-4 font-display text-2xl font-extrabold leading-snug text-ink-deep sm:text-3xl">
              A future where no one needs to face mental-health challenges alone.
            </p>
          </div>
          <div className="rounded-[2rem] border border-border bg-card p-9 shadow-soft">
            <span className="eyebrow">Our mission</span>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              To provide transformational, community-centered support and awareness initiatives so
              people can access understanding, encouragement, appropriate support, and pathways to
              professional help in ways that respect their needs and circumstances.
            </p>
          </div>
        </div>
      </Section>

      <Section>
        <SectionHeading eyebrow="Our approach" title="How we work" />
        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {approach.map((item) => (
            <li key={item.title} className="rounded-3xl border border-border bg-card p-7 shadow-soft">
              <h3 className="font-display text-lg font-bold text-ink-deep">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="blue">
        <SectionHeading eyebrow="Objectives" title="What we're working toward" />
        <ul className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {objectiveGroups.map((group) => {
            const Icon = icons[group.icon as keyof typeof icons];
            return (
              <li key={group.key} className="rounded-3xl border border-border bg-card p-7 shadow-soft">
                <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-brand-soft text-brand-strong">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-4 font-display text-xl font-bold text-ink-deep">{group.title}</h3>
                <ul className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
                  {group.points.map((point) => (
                    <li key={point} className="flex gap-2">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-warm" aria-hidden />
                      {point}
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      </Section>

      <Section>
        <div className="grid gap-10 lg:grid-cols-[1fr_1fr]">
          <SectionHeading
            eyebrow="Looking ahead"
            title="Every conversation, every session and every story can move us toward a mentally healthier Nepal."
          />
          <ul className="grid gap-3 sm:grid-cols-2">
            {futureDirection.map((item) => (
              <li
                key={item}
                className="rounded-2xl border border-border bg-surface p-4 text-sm font-medium text-ink"
              >
                {item}
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <Section tone="surface">
        <SectionHeading
          eyebrow="Partnerships"
          title="Working with others since 2020"
          description="Awareness sessions, online workshops, creative activities, community campaigns and youth engagement delivered in collaboration."
        />
        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {partners.map((partner) => (
            <li
              key={partner.id}
              className="flex items-center gap-5 rounded-3xl border border-border bg-card p-6 shadow-soft"
            >
              <div className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-surface-blue text-xs font-semibold text-brand-strong">
                <img
                    src={partner.photo}
                    alt={`${partner.name} logo`}
                    className="max-h-full max-w-full object-contain"
                />
              </div>
              <div>
                <p className="font-display text-lg font-bold text-ink-deep">{partner.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{partner.description}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <CTABand />
    </>
  );
}
