import { createFileRoute } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Images, Search, X } from "lucide-react";
import { useEffect, useState } from "react";
import { gallerySearchParams, type GalleryQuery } from "@/lib/gallery-query";

import { PageHero } from "@/components/site/PageHero";
import { GalleryImagePreview } from "@/components/site/GalleryImagePreview";
import { Reveal } from "@/components/site/Reveal";
import { Section, SectionHeading } from "@/components/site/Section";
import { getPublishedGalleryItemsServerFn } from "@/lib/gallery-server-functions";

export const Route = createFileRoute("/gallery")({
  validateSearch: gallerySearchParams,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => getPublishedGalleryItemsServerFn({ data: deps }),
  head: () => ({
    meta: [
      { title: "Gallery | Umanga Nepal" },
      {
        name: "description",
        content:
          "Photographs from Umanga Nepal programs, workshops, community activities and mental health initiatives across Nepal.",
      },
      { property: "og:title", content: "Gallery | Umanga Nepal" },
      {
        property: "og:description",
        content:
          "A visual record of Umanga Nepal's programs, workshops and community initiatives.",
      },
    ],
  }),
  component: Gallery,
});

function Gallery() {
  const result = Route.useLoaderData();
  const filters = Route.useSearch();
  const navigate = Route.useNavigate();
  const [query, setQuery] = useState(filters.q);
  useEffect(() => setQuery(filters.q), [filters.q]);
  function change(next: Partial<GalleryQuery>) {
    void navigate({
      search: (previous) => ({ ...previous, ...next, page: next.page ?? 1 }),
    });
  }
  const filtered = Boolean(filters.q || filters.category || filters.album);

  return (
    <>
      <PageHero
        eyebrow="Gallery"
        title="Moments from the work"
        description="Photographs from programs, workshops, community activities and Umanga initiatives across Nepal."
      />

      <Section>
        <SectionHeading
          eyebrow="Photo gallery"
          title="A window into Umanga's activities"
          description="Explore photographs from Umanga Nepal's programs, workshops and community initiatives."
        />

        <form
          className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_auto]"
          onSubmit={(event) => {
            event.preventDefault();
            change({ q: query.trim() });
          }}
        >
          <div className="grid min-w-0 gap-2 text-sm font-semibold">
            <label htmlFor="gallery-search">Search photos</label>
            <div className="flex">
              <input
                id="gallery-search"
                type="search"
                maxLength={200}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="min-w-0 flex-1 rounded-l-lg border border-border bg-background px-3 py-2.5"
              />
              <button
                type="submit"
                aria-label="Search photos"
                title="Search photos"
                className="inline-flex size-11 shrink-0 items-center justify-center rounded-r-lg border border-l-0 border-border hover:bg-accent"
              >
                <Search className="size-5" aria-hidden />
              </button>
            </div>
          </div>
          <label
            className="grid min-w-0 gap-2 text-sm font-semibold"
            htmlFor="gallery-category"
          >
            Category
            <select
              id="gallery-category"
              aria-label="Category"
              value={filters.category}
              onChange={(event) => change({ category: event.target.value })}
              className="min-w-0 w-full rounded-lg border border-border bg-background px-3 py-2.5"
            >
              <option value="">All categories</option>
              {result.categories.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </label>
          <label
            className="grid min-w-0 gap-2 text-sm font-semibold"
            htmlFor="gallery-album"
          >
            Album
            <select
              id="gallery-album"
              aria-label="Album"
              value={filters.album}
              onChange={(event) => change({ album: event.target.value })}
              className="min-w-0 w-full rounded-lg border border-border bg-background px-3 py-2.5"
            >
              <option value="">All albums</option>
              {result.albums.map((album) => (
                <option key={album.id} value={album.id}>
                  {album.name}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            aria-label="Clear filters"
            title="Clear filters"
            disabled={!filtered && !query}
            onClick={() => {
              setQuery("");
              change({ q: "", category: "", album: "" });
            }}
            className="inline-flex size-11 items-center justify-center self-end rounded-lg border border-border hover:bg-accent disabled:opacity-40"
          >
            <X className="size-5" aria-hidden />
          </button>
        </form>
        <p className="mt-4 text-sm text-muted-foreground" role="status">
          {result.totalCount} {result.totalCount === 1 ? "photo" : "photos"}
          {result.totalPages > 1
            ? ` · Page ${result.page} of ${result.totalPages}`
            : ""}
        </p>
        {result.items.length > 0 ? (
          <ul
            className="mt-6 columns-1 gap-4 sm:columns-2 lg:columns-3"
            aria-label="Gallery photos"
          >
            {result.items.map((item) => (
              <li key={item.id} className="mb-4 break-inside-avoid">
                <GalleryImagePreview
                  imageUrl={item.imageUrl}
                  title={item.title}
                  caption={
                    [item.caption, item.albumName, item.contextName]
                      .filter(Boolean)
                      .join("\n") || null
                  }
                  imageWidth={item.imageWidth}
                  imageHeight={item.imageHeight}
                />
              </li>
            ))}
          </ul>
        ) : (
          <Reveal className="mt-10">
            <div className="flex min-h-56 flex-col items-center justify-center rounded-3xl border border-dashed border-brand-muted bg-brand-pale px-6 py-10 text-center">
              <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-white text-brand-strong shadow-soft">
                <Images className="size-5" aria-hidden />
              </span>
              <h2 className="mt-4 font-display text-xl font-bold text-brand-deeper">
                {filtered
                  ? "No photos match these filters"
                  : "More moments are on the way"}
              </h2>
              <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
                {filtered
                  ? "Try another search or clear the filters."
                  : "No gallery images are available yet. Please check back soon for photographs from Umanga Nepal's work."}
              </p>
            </div>
          </Reveal>
        )}
        {result.totalPages > 1 ? (
          <nav
            aria-label="Gallery pagination"
            className="mt-8 flex flex-wrap items-center justify-center gap-2"
          >
            <button
              aria-label="Previous page"
              title="Previous page"
              disabled={result.page === 1}
              onClick={() => change({ page: result.page - 1 })}
              className="inline-flex size-10 items-center justify-center rounded-lg border border-border disabled:opacity-40"
            >
              <ChevronLeft aria-hidden />
            </button>
            {[
              ...new Set([
                1,
                ...Array.from(
                  { length: 5 },
                  (_, index) => result.page - 2 + index,
                ).filter((page) => page > 0 && page <= result.totalPages),
                result.totalPages,
              ]),
            ]
              .sort((a, b) => a - b)
              .map((page, index, array) => (
                <span key={page} className="inline-flex items-center gap-2">
                  {index > 0 && page - array[index - 1]! > 1 ? (
                    <span aria-hidden>…</span>
                  ) : null}
                  <button
                    aria-label={`Page ${page}`}
                    aria-current={page === result.page ? "page" : undefined}
                    onClick={() => change({ page })}
                    className={`size-10 rounded-lg border border-border ${page === result.page ? "bg-brand-strong font-bold text-white" : "hover:bg-accent"}`}
                  >
                    {page}
                  </button>
                </span>
              ))}
            <button
              aria-label="Next page"
              title="Next page"
              disabled={result.page === result.totalPages}
              onClick={() => change({ page: result.page + 1 })}
              className="inline-flex size-10 items-center justify-center rounded-lg border border-border disabled:opacity-40"
            >
              <ChevronRight aria-hidden />
            </button>
          </nav>
        ) : null}
      </Section>
    </>
  );
}
