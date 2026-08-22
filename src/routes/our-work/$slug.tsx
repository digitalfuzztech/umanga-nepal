import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { AlertCircle, ArrowLeft, ArrowRight } from "lucide-react";
import { Section, SectionHeading } from "@/components/site/Section";
import { Button } from "@/components/ui/button";
import { ProgramCard } from "@/components/site/Cards";
import { CTABand } from "@/components/site/CTABand";
import { getProgram, programs } from "@/data/programs";
import { Counter } from "@/components/site/Counter";

export const Route = createFileRoute("/our-work/$slug")({
  loader: ({ params }) => {
    const program = getProgram(params.slug);
    if (!program) throw notFound();
    return program;
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.title} | Umanga Nepal` },
          { name: "description", content: loaderData.shortDescription },
          { property: "og:title", content: `${loaderData.title} | Umanga Nepal` },
          { property: "og:description", content: loaderData.shortDescription },
        ]
      : [],
  }),
  component: ProgramDetail,
});

function ProgramDetail() {
  const program = Route.useLoaderData();
  const related = programs.filter((p) => p.slug !== program.slug).slice(0, 3);

  return (
    <>
      <header className="surface-gradient">
        <div className="container-page py-12 lg:py-16">
          <Link
            to="/our-work"
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-strong"
          >
            <ArrowLeft className="size-4" aria-hidden /> All programs
          </Link>
          <div className="mt-6 grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div className="flex flex-col gap-5">
              <span className="eyebrow">{program.category}</span>
              <h1 className="text-balance-title text-4xl font-extrabold leading-tight text-ink-deep sm:text-5xl">
                {program.title}
              </h1>
              <p className="text-lg text-muted-foreground">{program.shortDescription}</p>
              <ul className="flex flex-wrap gap-2">
                {program.tags.map((tag) => (
                  <li
                    key={tag}
                    className="rounded-full bg-background px-3 py-1 text-xs font-semibold text-brand-strong"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
              <div className="flex flex-wrap gap-3 pt-2">
                <Button asChild variant="brand">
                  <Link to="/invite-umanga">Invite this program</Link>
                </Button>
                <Button asChild variant="outline">
                  <Link to="/volunteer">Volunteer with us</Link>
                </Button>
              </div>
            </div>
            <img
              src={program.heroImage}
              alt={program.title}
              width={1400}
              height={1000}
              className="aspect-[4/3] w-full rounded-[2rem] object-cover shadow-lift"
            />
          </div>
        </div>
      </header>

      <Section>
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="flex flex-col gap-5">
            <h2 className="font-display text-2xl font-bold text-ink-deep">About the program</h2>
            <p className="text-base leading-relaxed text-muted-foreground">{program.description}</p>
            {program.note ? (
              <div className="flex gap-3 rounded-2xl border border-border bg-accent/60 p-5 text-sm text-accent-foreground">
                <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden />
                <p>{program.note}</p>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-6">
            {program.topics?.length ? (
              <div className="rounded-3xl border border-border bg-surface p-7">
                <h3 className="font-display text-lg font-bold text-ink-deep">What we cover</h3>
                <ul className="mt-4 flex flex-col gap-2.5 text-sm text-muted-foreground">
                  {program.topics.map((topic) => (
                    <li key={topic} className="flex gap-2">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
                      {topic}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {program.metrics?.length ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {program.metrics.map((metric) => (
                  <div
                    key={metric.label}
                    className="rounded-3xl border border-border bg-card p-6 shadow-soft"
                  >
                    <p className="font-display text-3xl font-extrabold text-brand-strong">
                      <Counter value={metric.value} />
                    </p>
                    <p className="mt-1 text-sm font-semibold text-ink-deep">{metric.label}</p>
                    {metric.note ? (
                      <p className="text-xs text-muted-foreground">{metric.note}</p>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </Section>

      <Section tone="surface">
        <SectionHeading eyebrow="More programs" title="Explore related work" />
        <ul className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {related.map((item) => (
            <li key={item.id}>
              <ProgramCard program={item} />
            </li>
          ))}
        </ul>
        <div className="mt-10">
          <Button asChild variant="outline">
            <Link to="/our-work">
              All programs <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
      </Section>

      <CTABand />
    </>
  );
}
