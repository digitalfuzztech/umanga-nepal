import { createFileRoute, Link } from "@tanstack/react-router";
import { Info } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import { Section, SectionHeading } from "@/components/site/Section";
import { Counter } from "@/components/site/Counter";
import { Testimonials } from "@/components/site/Testimonials";
import { CTABand } from "@/components/site/CTABand";
import { Button } from "@/components/ui/button";
import { futureDirection, impactMetrics, nepalFacts } from "@/data/impact";
import { programs } from "@/data/programs";

export const Route = createFileRoute("/impact")({
  head: () => ({
    meta: [
      { title: "Our Impact | Umanga Nepal" },
      {
        name: "description",
        content:
          "Sessions delivered, participants reached and the direction ahead — Umanga Nepal's mental health work in Nepal, reported without inflated figures.",
      },
      { property: "og:title", content: "Our Impact | Umanga Nepal" },
      {
        property: "og:description",
        content: "Programs delivered and participants reached by Umanga Nepal since 2020.",
      },
    ],
  }),
  component: Impact,
});

function Impact() {
  return (
    <>
      <PageHero
        eyebrow="Impact"
        title="Small conversations. Meaningful change."
        description="Every figure below reflects work Umanga Nepal has delivered. We report them separately, because participation across programs may overlap."
      />

      <Section>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {impactMetrics.map((metric) => (
            <li key={metric.label} className="rounded-3xl border border-border bg-card p-7 shadow-soft">
              <p className="font-display text-4xl font-extrabold text-brand-strong">
                <Counter value={metric.value} />
              </p>
              <p className="mt-2 font-semibold text-ink-deep">{metric.label}</p>
              {metric.note ? (
                <p className="mt-1 text-xs text-muted-foreground">{metric.note}</p>
              ) : null}
            </li>
          ))}
        </ul>
        <div className="mt-8 flex gap-3 rounded-2xl border border-border bg-surface p-5 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-5 shrink-0 text-brand-strong" aria-hidden />
          <p>
            We do not publish a combined “total lives impacted” figure. Doing so would assume no
            participant attended more than one program, which has not been confirmed.
          </p>
        </div>
      </Section>

      <Section tone="surface">
        <SectionHeading eyebrow="By program" title="Where the work happens" />
        <ul className="mt-10 grid gap-4 md:grid-cols-2">
          {programs
            .filter((p) => p.metrics?.length)
            .map((program) => (
              <li
                key={program.id}
                className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-7 shadow-soft"
              >
                <span className="eyebrow">{program.category}</span>
                <h3 className="font-display text-xl font-bold text-ink-deep">{program.title}</h3>
                <ul className="flex flex-wrap gap-6">
                  {program.metrics?.map((metric) => (
                    <li key={metric.label}>
                      <p className="font-display text-2xl font-extrabold text-brand-strong">
                        <Counter value={metric.value} />
                      </p>
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        {metric.label}
                      </p>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
        </ul>
      </Section>

      <Section>
        <SectionHeading
          eyebrow="Context"
          title="Facts and citations"
          description="We publish quantitative mental-health statistics only with a named source, publication year and review date."
        />
        {nepalFacts.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-border bg-surface p-8 text-sm text-muted-foreground">
            <p className="font-semibold text-ink-deep">No verified statistics published yet.</p>
            <p className="mt-2">
              Sourced figures will appear here once each statement has been checked against a
              current, citable publication.
            </p>
          </div>
        ) : (
          <ul className="mt-8 grid gap-4 md:grid-cols-2">
            {nepalFacts.map((fact) => (
              <li key={fact.statement} className="rounded-3xl border border-border bg-card p-7">
                <p className="font-display text-3xl font-extrabold text-brand-strong">{fact.value}</p>
                <p className="mt-2 text-sm text-ink">{fact.statement}</p>
                <p className="mt-3 text-xs text-muted-foreground">
                  Source: {fact.source} ({fact.publicationYear})
                </p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section tone="blue">
        <SectionHeading eyebrow="Community voices" title="What participants tell us" />
        <div className="mt-10">
          <Testimonials />
        </div>
      </Section>

      <Section>
        <div className="grid gap-10 lg:grid-cols-2">
          <SectionHeading
            eyebrow="Future direction"
            title="Every conversation can move us toward a mentally healthier Nepal."
          >
            <div className="pt-2">
              <Button asChild variant="brand">
                <Link to="/support-us">Support our work</Link>
              </Button>
            </div>
          </SectionHeading>
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

      <CTABand />
    </>
  );
}
