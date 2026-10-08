import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Section, SectionHeading } from "@/components/site/Section";
import { StoryCard } from "@/components/site/Cards";
import { Button } from "@/components/ui/button";
import {
  getPublishedStoriesServerFn,
  getPublishedStoryBySlugServerFn,
} from "@/lib/stories-server-functions";
import { getStoryParagraphs } from "@/lib/stories";
import { ProgramImage } from "@/components/site/ProgramImage";
import { supportDisclaimer } from "@/data/support";

export const Route = createFileRoute("/stories/$slug")({
  loader: async ({ params }) => {
    const story = await getPublishedStoryBySlugServerFn({ data: params.slug });
    if (!story) throw notFound();
    const stories = await getPublishedStoriesServerFn();
    return {
      story,
      related: stories.filter((item) => item.slug !== story.slug).slice(0, 3),
    };
  },
  staleTime: 0,
  gcTime: 0,
  shouldReload: true,
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.story.title} | Umanga Nepal Stories` },
          { name: "description", content: loaderData.story.excerpt },
          {
            property: "og:title",
            content: `${loaderData.story.title} | Umanga Nepal`,
          },
          { property: "og:description", content: loaderData.story.excerpt },
          { property: "og:type", content: "article" },
        ]
      : [],
  }),
  component: StoryDetail,
});

function StoryDetail() {
  const { story, related } = Route.useLoaderData();

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
                {story.storyDate
                  ? ` · ${new Date(story.storyDate).toLocaleDateString(
                      "en-GB",
                      {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      },
                    )}`
                  : ""}
              </p>
            </div>
          </div>
        </header>

        <Section>
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
            <ProgramImage
              src={story.imageUrl}
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
              {getStoryParagraphs(story.content).map((paragraph, index) => (
                <p
                  key={index}
                  className="text-base leading-relaxed text-muted-foreground"
                >
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
