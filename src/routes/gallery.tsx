import { createFileRoute } from "@tanstack/react-router";
import { Images } from "lucide-react";
import communitySession from "@/assets/community-session.jpg";
import heroCommunity from "@/assets/hero-community.jpg";
import programArt from "@/assets/program-art.jpg";
import programAwareness from "@/assets/program-awareness.jpg";
import programSchool from "@/assets/program-school.jpg";
import programWmhd from "@/assets/program-wmhd.jpg";
import { PageHero } from "@/components/site/PageHero";
import { Reveal } from "@/components/site/Reveal";
import { Section, SectionHeading } from "@/components/site/Section";

export const Route = createFileRoute("/gallery")({
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

const localGalleryPreview = [
  {
    src: communitySession,
    alt: "A facilitated community session",
    label: "Community activities",
  },
  {
    src: programSchool,
    alt: "A program held in a school setting",
    label: "School programs",
  },
  {
    src: programArt,
    alt: "Creative materials used during a wellbeing activity",
    label: "Creative wellbeing",
  },
  {
    src: programAwareness,
    alt: "Participants at an awareness activity",
    label: "Awareness sessions",
  },
  {
    src: heroCommunity,
    alt: "Community members gathering together",
    label: "Community connection",
  },
  {
    src: programWmhd,
    alt: "Materials from a mental health awareness initiative",
    label: "Umanga initiatives",
  },
];

function Gallery() {
  return (
    <>
      <PageHero
        eyebrow="Gallery"
        title="Moments from the work"
        description="Photographs from programs, workshops, community activities and Umanga initiatives across Nepal."
      />

      <Section>
        <SectionHeading
          eyebrow="Local preview"
          title="A window into Umanga's activities"
          description="This frontend preview uses the project's current local photography. A curated gallery and captions can be added in a later content-management phase."
        />

        <ul className="reveal-grid mt-10 grid auto-rows-[13rem] gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:auto-rows-[16rem]">
          {localGalleryPreview.map((image, index) => (
            <li
              key={image.src}
              className={
                index === 0 || index === 5
                  ? "sm:col-span-2 lg:col-span-2"
                  : undefined
              }
            >
              <Reveal className="h-full" variant="scale">
                <figure className="group relative h-full overflow-hidden rounded-[1.75rem] border border-brand-muted/55 bg-surface-blue shadow-card">
                  <img
                    src={image.src}
                    alt={image.alt}
                    loading="lazy"
                    width={1400}
                    height={1000}
                    className="size-full object-cover transition-transform duration-700 group-hover:scale-[1.025]"
                  />
                  <figcaption className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-brand-deeper/90 via-brand-deeper/45 to-transparent px-5 pb-4 pt-12 text-sm font-semibold text-white">
                    {image.label}
                  </figcaption>
                </figure>
              </Reveal>
            </li>
          ))}
        </ul>

        <Reveal className="mt-8">
          <div className="flex items-start gap-4 rounded-3xl border border-dashed border-brand-muted bg-brand-pale p-6 text-sm text-muted-foreground">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-white text-brand-strong shadow-soft">
              <Images className="size-5" aria-hidden />
            </span>
            <p>
              More photographs will appear here once the organization has
              selected approved images and confirmed captions for publication.
            </p>
          </div>
        </Reveal>
      </Section>
    </>
  );
}
