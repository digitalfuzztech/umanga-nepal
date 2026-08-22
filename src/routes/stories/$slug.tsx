import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Section, SectionHeading } from "@/components/site/Section";
import { StoryCard } from "@/components/site/Cards";
import { Button } from "@/components/ui/button";
import { getStory, stories } from "@/data/stories";
import { supportDisclaimer } from "@/data/support";

export const Route = createFileRoute("/stories/$slug")({
  loader: ({ params }) => {
    const story = getStory(params.slug);
    if (!story) throw notFound();
    return story;
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.title} | Umanga Nepal Stories` },
          { name: "description", content: loaderData.excerpt },
          { property: "og:title", content: `${loaderData.title} | Umanga Nepal` },
          { property: "og:description", content: loaderData.excerpt },
          { property: "og:type", content: "article" },
        ]
      : [],
  }),
  component: StoryDetail,
});

function StoryDetail() {
  const story = Route.useLoaderData();
  const related = stories.filter((s) => s.slug !== story.slug).slice(0, 3);

  return (
    <>
      <article>
        <header className="surface-gradient">
          <div className="container-page py-12 lg:py-16">
            <Link
              to="/stories"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-strong"
            >
              <ArrowLeft className="size-4" aria-hidden /> All stories
            </Link>
            <div className="mt-6 max-w-3xl">
              <span className="eyebrow">{story.category}</span>
              <h1 className="mt-4 text-balance-title text-4xl font-extrabold leading-tight text-ink-deep sm:text-5xl">
                {story.title}
              </h1>
              <p className="mt-5 text-lg text-muted-foreground">{story.excerpt}</p>
              <p className="mt-4 text-sm text-muted-foreground">
                {story.attribution}
                {story.date
                  ? ` · ${new Date(story.date).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}`
                  : ""}
              </p>
            </div>
          </div>
        </header>

        <Section>
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
            <img
              src={story.image}
              alt={story.title}
              width={1400}
              height={1000}
              className="aspect-[4/3] w-full rounded-[2rem] object-cover shadow-lift"
            />
            <div className="flex flex-col gap-5">
              {story.demoContent ? (
                <p className="rounded-2xl border border-dashed border-border bg-surface px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Demo content — placeholder narrative for layout
                </p>
              ) : null}
              {story.body.map((paragraph) => (
                <p key={paragraph} className="text-base leading-relaxed text-muted-foreground">
                  {paragraph}
                </p>
              ))}
              <div className="rounded-2xl border border-border bg-accent/60 p-5 text-sm text-accent-foreground">
                {supportDisclaimer}{" "}
                <Link to="/get-support" className="font-semibold underline underline-offset-4">
                  Find support options
                </Link>
                .
              </div>
            </div>
          </div>
        </Section>
      </article>

      <Section tone="surface">
        <SectionHeading eyebrow="Keep reading" title="More stories" />
        <ul className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {related.map((item) => (
            <li key={item.id}>
              <StoryCard story={item} />
            </li>
          ))}
        </ul>
        <div className="mt-10">
          <Button asChild variant="brand">
            <Link to="/share-your-story">Share your story</Link>
          </Button>
        </div>
      </Section>
    </>
  );
}
