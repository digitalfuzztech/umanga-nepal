import { createFileRoute } from "@tanstack/react-router";
import { ImageOff, Images } from "lucide-react";
import { useState } from "react";

import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";
import { Section, SectionHeading } from "@/components/site/Section";
import { getPublishedGalleryItemsServerFn } from "@/lib/gallery-server-functions";

export const Route = createFileRoute("/gallery")({
  loader: () => getPublishedGalleryItemsServerFn(),
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
  const galleryItems = Route.useLoaderData();

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

        {galleryItems.length > 0 ? (
          <ul className="reveal-grid mt-10 grid auto-rows-[13rem] gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:auto-rows-[16rem]">
            {galleryItems.map((item, index) => (
              <li
                key={item.id}
                className={
                  index % 5 === 0 ? "sm:col-span-2 lg:col-span-2" : undefined
                }
              >
                <Reveal className="h-full" variant="scale">
                  <PublicGalleryFigure
                    imageUrl={item.imageUrl}
                    title={item.title}
                    caption={item.caption}
                  />
                </Reveal>
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
                More moments are on the way
              </h2>
              <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
                No gallery images are available yet. Please check back soon for
                photographs from Umanga Nepal's work.
              </p>
            </div>
          </Reveal>
        )}
      </Section>
    </>
  );
}

function PublicGalleryFigure({
  imageUrl,
  title,
  caption,
}: {
  imageUrl: string;
  title: string;
  caption: string | null;
}) {
  const [imageFailed, setImageFailed] = useState(false);

  return (
    <figure className="group relative h-full overflow-hidden rounded-[1.75rem] border border-brand-muted/55 bg-surface-blue shadow-card">
      {imageFailed ? (
        <div
          className="flex size-full flex-col items-center justify-center gap-3 bg-brand-pale px-5 text-center text-muted-foreground"
          role="img"
          aria-label={`Image unavailable for ${title}`}
        >
          <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-white text-brand-strong shadow-soft">
            <ImageOff className="size-5" aria-hidden />
          </span>
          <span className="text-sm font-semibold">Image unavailable</span>
        </div>
      ) : (
        <img
          src={imageUrl}
          alt={title}
          loading="lazy"
          width={1400}
          height={1000}
          className="size-full object-cover transition-transform duration-700 group-hover:scale-[1.025]"
          onError={() => setImageFailed(true)}
        />
      )}
      <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-brand-deeper/90 via-brand-deeper/45 to-transparent px-5 pb-4 pt-12 text-white">
        <span className="block text-sm font-semibold">{title}</span>
        {caption ? (
          <span className="mt-1 block text-xs leading-5 text-white/85">
            {caption}
          </span>
        ) : null}
      </figcaption>
    </figure>
  );
}
