import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Search } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import { Section, SectionHeading } from "@/components/site/Section";
import { ResourceCard } from "@/components/site/Cards";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { resources } from "@/data/resources";
import { supportDisclaimer } from "@/data/support";

export const Route = createFileRoute("/resources/")({
  head: () => ({
    meta: [
      { title: "Mental Health Resources | Umanga Nepal" },
      {
        name: "description",
        content:
          "Plain-language articles and guides on stress, anxiety, self-esteem, supporting a friend and knowing when to seek professional help in Nepal.",
      },
      { property: "og:title", content: "Mental Health Resources | Umanga Nepal" },
      {
        property: "og:description",
        content: "Accessible mental health articles and guides from Umanga Nepal.",
      },
    ],
  }),
  component: Resources,
});

function Resources() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("All");

  const categories = useMemo(
    () => ["All", ...Array.from(new Set(resources.map((r) => r.category)))],
    [],
  );

  const filtered = resources.filter((resource) => {
    const matchesCategory = category === "All" || resource.category === category;
    const q = query.trim().toLowerCase();
    const matchesQuery =
      !q ||
      resource.title.toLowerCase().includes(q) ||
      resource.excerpt.toLowerCase().includes(q) ||
      resource.category.toLowerCase().includes(q);
    return matchesCategory && matchesQuery;
  });

  return (
    <>
      <PageHero
        eyebrow="Resources"
        title="Understanding mental health, in plain language"
        description="Educational articles and practical guides written to be read by anyone — no clinical vocabulary required."
      />

      <Section>
        <SectionHeading eyebrow="Library" title="Browse resources" />

        <div className="mt-8 flex flex-col gap-5">
          <div className="relative max-w-md">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search resources"
              aria-label="Search resources"
              className="h-12 rounded-full pl-11"
            />
          </div>

          <ul className="flex flex-wrap gap-2">
            {categories.map((item) => (
              <li key={item}>
                <button
                  type="button"
                  onClick={() => setCategory(item)}
                  aria-pressed={category === item}
                  className={cn(
                    "rounded-full border px-4 py-2 text-xs font-semibold transition-colors",
                    category === item
                      ? "border-transparent bg-brand text-brand-foreground"
                      : "border-border bg-surface text-muted-foreground hover:text-ink-deep",
                  )}
                >
                  {item}
                </button>
              </li>
            ))}
          </ul>
        </div>

        {filtered.length === 0 ? (
          <p className="mt-12 rounded-3xl border border-dashed border-border bg-surface p-8 text-sm text-muted-foreground">
            No resources match that search yet.
          </p>
        ) : (
          <ul className="reveal-grid mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((resource) => (
              <li key={resource.id}>
                <ResourceCard resource={resource} />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section tone="surface">
        <div className="rounded-[2rem] border border-border bg-card p-8 shadow-soft sm:p-10">
          <span className="eyebrow">Important</span>
          <p className="mt-4 max-w-3xl text-base text-muted-foreground">
            {supportDisclaimer} These resources are educational and do not replace assessment or
            treatment by a qualified professional.
          </p>
          <Link
            to="/get-support"
            className="mt-5 inline-flex text-sm font-semibold text-brand-strong underline underline-offset-4"
          >
            See support options
          </Link>
        </div>
      </Section>
    </>
  );
}
