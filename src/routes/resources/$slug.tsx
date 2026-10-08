import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Clock } from "lucide-react";
import { Section, SectionHeading } from "@/components/site/Section";
import { ResourceCard } from "@/components/site/Cards";
import {
  getPublishedResourceBySlugServerFn,
  getPublishedResourcesServerFn,
} from "@/lib/resources-server-functions";
import { resourceView } from "@/lib/resource-view";
import { supportDisclaimer } from "@/data/support";

export const Route = createFileRoute("/resources/$slug")({
  loader: async ({ params }) => {
    const [item, items] = await Promise.all([
      getPublishedResourceBySlugServerFn({ data: params.slug }),
      getPublishedResourcesServerFn(),
    ]);
    const resource = item ? resourceView(item) : null;
    if (!resource) throw notFound();
    return { resource, resources: items.map(resourceView) };
  },
  staleTime: 0,
  gcTime: 0,
  shouldReload: true,
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.resource.title} | Umanga Nepal Resources` },
          { name: "description", content: loaderData.resource.excerpt },
          {
            property: "og:title",
            content: `${loaderData.resource.title} | Umanga Nepal`,
          },
          { property: "og:description", content: loaderData.resource.excerpt },
          { property: "og:type", content: "article" },
        ]
      : [],
  }),
  component: ResourceDetail,
});

function ResourceDetail() {
  const { resource, resources } = Route.useLoaderData();
  const related = resources
    .filter((r) => r.slug !== resource.slug && r.category === resource.category)
    .concat(
      resources.filter(
        (r) => r.slug !== resource.slug && r.category !== resource.category,
      ),
    )
    .slice(0, 3);

  return (
    <>
      <article>
        <header className="surface-gradient">
          <div className="container-page py-12 lg:py-16">
            <Link
              to="/resources"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-strong"
            >
              <ArrowLeft className="size-4" aria-hidden /> All resources
            </Link>
            <div className="mt-6 max-w-3xl">
              <span className="eyebrow">{resource.category}</span>
              <h1 className="mt-4 text-balance-title text-4xl font-extrabold leading-tight text-ink-deep sm:text-5xl">
                {resource.title}
              </h1>
              <p className="mt-5 text-lg text-muted-foreground">
                {resource.excerpt}
              </p>
              <div className="mt-5 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                {resource.readingTime ? (
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="size-4" aria-hidden />{" "}
                    {resource.readingTime} min read
                  </span>
                ) : null}
                {resource.reviewedAt ? (
                  <span>
                    Reviewed{" "}
                    {new Date(resource.reviewedAt).toLocaleDateString("en-GB", {
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                ) : null}
              </div>
            </div>
          </div>
        </header>

        <Section>
          <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
            <div className="flex flex-col gap-5">
              {resource.body.map((paragraph) => (
                <p
                  key={paragraph}
                  className="text-base leading-relaxed text-muted-foreground"
                >
                  {paragraph}
                </p>
              ))}

              {resource.references?.length ? (
                <div className="mt-4 rounded-3xl border border-border bg-surface p-7">
                  <h2 className="font-display text-lg font-bold text-ink-deep">
                    References
                  </h2>
                  <ul className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
                    {resource.references.map((reference) => (
                      <li key={reference.title}>
                        {reference.title} — {reference.publisher}
                        {reference.year ? ` (${reference.year})` : ""}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            <aside className="flex flex-col gap-5 rounded-[2rem] border border-border bg-surface-blue p-8">
              <h2 className="font-display text-xl font-bold text-ink-deep">
                Need support now?
              </h2>
              <p className="text-sm text-muted-foreground">
                {supportDisclaimer}
              </p>
              <Link
                to="/get-support"
                className="text-sm font-semibold text-brand-strong underline underline-offset-4"
              >
                Get support
              </Link>
              <Link
                to="/contact"
                className="text-sm font-semibold text-brand-strong underline underline-offset-4"
              >
                Contact Umanga Nepal
              </Link>
            </aside>
          </div>
        </Section>
      </article>

      <Section tone="surface">
        <SectionHeading eyebrow="Keep learning" title="Related resources" />
        <ul className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {related.map((item) => (
            <li key={item.id}>
              <ResourceCard resource={item} />
            </li>
          ))}
        </ul>
      </Section>
    </>
  );
}
