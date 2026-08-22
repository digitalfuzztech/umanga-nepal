import { createFileRoute } from "@tanstack/react-router";
import { PageHero } from "@/components/site/PageHero";
import { Section, SectionHeading } from "@/components/site/Section";
import { ProgramCard } from "@/components/site/Cards";
import { CTABand } from "@/components/site/CTABand";
import { programs } from "@/data/programs";

export const Route = createFileRoute("/our-work/")({
  head: () => ({
    meta: [
      { title: "Our Work | Mental Health Programs by Umanga Nepal" },
      {
        name: "description",
        content:
          "Awareness sessions, stress management, adolescent programs, creative wellbeing, storytelling and campaigns delivered by Umanga Nepal across Nepal.",
      },
      { property: "og:title", content: "Our Work | Umanga Nepal" },
      {
        property: "og:description",
        content: "Explore the mental health programs Umanga Nepal delivers in communities across Nepal.",
      },
    ],
  }),
  component: OurWork,
});

function OurWork() {
  const categories = Array.from(new Set(programs.map((p) => p.category)));

  return (
    <>
      <PageHero
        eyebrow="Our work"
        title="How we create change"
        description="From awareness and education to creativity and community conversation, our programs meet people where they are."
      />

      <Section>
        <SectionHeading
          eyebrow={`${programs.length} programs`}
          title="Programs and initiatives"
          description="Each program is delivered with partner organizations, volunteers and the communities that host them."
        />
        <ul className="mt-6 flex flex-wrap gap-2">
          {categories.map((category) => (
            <li
              key={category}
              className="rounded-full border border-border bg-surface px-3.5 py-1.5 text-xs font-semibold text-muted-foreground"
            >
              {category}
            </li>
          ))}
        </ul>
        <ul className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {programs.map((program) => (
            <li key={program.id}>
              <ProgramCard program={program} />
            </li>
          ))}
        </ul>
      </Section>

      <CTABand />
    </>
  );
}
