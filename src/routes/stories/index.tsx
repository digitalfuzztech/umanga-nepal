import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero } from "@/components/site/PageHero";
import { Section, SectionHeading } from "@/components/site/Section";
import { StoryCard } from "@/components/site/Cards";
import { Button } from "@/components/ui/button";
import { Testimonials } from "@/components/site/Testimonials";
import { stories } from "@/data/stories";

export const Route = createFileRoute("/stories/")({
  head: () => ({
    meta: [
      { title: "Stories | Voices from Umanga Nepal's Community" },
      {
        name: "description",
        content:
          "Community stories, volunteer reflections and youth voices from Umanga Nepal's mental health programs across Nepal.",
      },
      { property: "og:title", content: "Stories | Umanga Nepal" },
      {
        property: "og:description",
        content: "Voices from the communities, volunteers and young people Umanga Nepal works with.",
      },
    ],
  }),
  component: Stories,
});

function Stories() {
  return (
    <>
      <PageHero
        eyebrow="Stories"
        title="Every mind has a story worth hearing"
        description="Sharing is caring. These stories are published with consent and reflect what participants choose to make public."
      />

      <Section>
        <SectionHeading eyebrow="Community voices" title="Latest stories" />
        <ul className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {stories.map((story) => (
            <li key={story.id}>
              <StoryCard story={story} />
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="blue">
        <SectionHeading eyebrow="In their words" title="What people tell us" />
        <div className="mt-10">
          <Testimonials />
        </div>
        <div className="mt-10">
          <Button asChild variant="brand">
            <Link to="/share-your-story">Share your story</Link>
          </Button>
        </div>
      </Section>
    </>
  );
}
