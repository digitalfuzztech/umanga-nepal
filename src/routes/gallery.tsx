import { createFileRoute } from "@tanstack/react-router";
import { Images } from "lucide-react";

import { PageHero } from "@/components/site/PageHero";
import { GalleryImagePreview } from "@/components/site/GalleryImagePreview";
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
                  <GalleryImagePreview
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
