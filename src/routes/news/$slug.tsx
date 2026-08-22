import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, MapPin } from "lucide-react";
import { Section, SectionHeading } from "@/components/site/Section";
import { NewsCard } from "@/components/site/Cards";
import { getNews, news } from "@/data/news";

export const Route = createFileRoute("/news/$slug")({
  loader: ({ params }) => {
    const item = getNews(params.slug);
    if (!item) throw notFound();
    return item;
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.title} | Umanga Nepal News` },
          { name: "description", content: loaderData.excerpt },
          { property: "og:title", content: `${loaderData.title} | Umanga Nepal` },
          { property: "og:description", content: loaderData.excerpt },
          { property: "og:type", content: "article" },
        ]
      : [],
  }),
  component: NewsDetail,
});

function NewsDetail() {
  const item = Route.useLoaderData();
  const related = news.filter((n) => n.slug !== item.slug).slice(0, 3);

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
                <time dateTime={item.date}>
                  {new Date(item.date).toLocaleDateString("en-GB", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
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
            {item.image ? (
              <img
                src={item.image}
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
              {item.body.map((paragraph) => (
                <p key={paragraph} className="text-base leading-relaxed text-muted-foreground">
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
