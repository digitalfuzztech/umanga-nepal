import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, MapPin } from "lucide-react";
import { Section, SectionHeading } from "@/components/site/Section";
import { NewsCard } from "@/components/site/Cards";
import {
  getPublishedNewsBySlugServerFn,
  getPublishedNewsServerFn,
} from "@/lib/news-server-functions";
import { getNewsParagraphs } from "@/lib/news-events";

export const Route = createFileRoute("/news/$slug")({
  loader: async ({ params }) => {
    const item = await getPublishedNewsBySlugServerFn({ data: params.slug });
    if (!item) throw notFound();
    const news = await getPublishedNewsServerFn();
    return {
      item,
      related: news.filter((entry) => entry.slug !== item.slug).slice(0, 3),
    };
  },
  staleTime: 0,
  gcTime: 0,
  shouldReload: true,
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.item.title} | Umanga Nepal News` },
          { name: "description", content: loaderData.item.excerpt },
          {
            property: "og:title",
            content: `${loaderData.item.title} | Umanga Nepal`,
          },
          { property: "og:description", content: loaderData.item.excerpt },
          { property: "og:type", content: "article" },
        ]
      : [],
  }),
  component: NewsDetail,
});

function NewsDetail() {
  const { item, related } = Route.useLoaderData();

  return (
    <>
      <article>
        <header className="surface-gradient">
          <div className="container-page py-12 lg:py-16">
            <Link
              to="/news"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-strong"
            >
              <ArrowLeft className="size-4" aria-hidden /> All news
            </Link>
            <div className="mt-6 max-w-3xl">
              <span className="eyebrow">{item.category}</span>
              <h1 className="mt-4 text-balance-title text-4xl font-extrabold leading-tight text-ink-deep sm:text-5xl">
                {item.title}
              </h1>
              <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                <time dateTime={item.newsDate}>
                  {new Date(`${item.newsDate}T12:00:00`).toLocaleDateString(
                    "en-GB",
                    {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    },
                  )}
                </time>
                {item.location ? (
                  <span className="inline-flex items-center gap-1.5">
                    <MapPin className="size-4" aria-hidden /> {item.location}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        <Section>
          <div className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-start">
            {item.imageUrl ? (
              <img
                src={item.imageUrl}
                alt={item.title}
                width={1400}
                height={1000}
                className="aspect-[4/3] w-full rounded-[2rem] object-cover shadow-lift"
              />
            ) : null}
            <div className="flex flex-col gap-5">
              {item.demoContent ? (
                <p className="rounded-2xl border border-dashed border-border bg-surface px-5 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Demo content — placeholder update for layout
                </p>
              ) : null}
              {getNewsParagraphs(item.content).map((paragraph) => (
                <p
                  key={paragraph}
                  className="text-base leading-relaxed text-muted-foreground"
                >
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </Section>
      </article>

      <Section tone="surface">
        <SectionHeading eyebrow="More updates" title="Recent news" />
        <ul className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {related.map((entry) => (
            <li key={entry.id}>
              <NewsCard item={entry} />
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
