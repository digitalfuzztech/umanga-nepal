import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero } from "@/components/site/PageHero";
import { Section, SectionHeading } from "@/components/site/Section";
import { EventCard, NewsCard } from "@/components/site/Cards";
import { Button } from "@/components/ui/button";
import { Newsletter } from "@/components/site/Newsletter";
import { events, news } from "@/data/news";

export const Route = createFileRoute("/news/")({
  head: () => ({
    meta: [
      { title: "News & Events | Umanga Nepal" },
      {
        name: "description",
        content:
          "Updates, campaigns and upcoming mental health sessions, workshops and community programs from Umanga Nepal.",
      },
      { property: "og:title", content: "News & Events | Umanga Nepal" },
      {
        property: "og:description",
        content: "Latest updates and upcoming events from Umanga Nepal.",
      },
    ],
  }),
  component: News,
});

function News() {
  const upcoming = events.filter((event) => event.status !== "past").slice(0, 3);

  return (
    <>
      <PageHero
        eyebrow="News & events"
        title="What's happening at Umanga Nepal"
        description="Program updates, campaigns and community activities as they happen."
      />

      <Section>
        <SectionHeading eyebrow="Latest" title="News and updates" />
        <ul className="reveal-grid mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {news.map((item) => (
            <li key={item.id}>
              <NewsCard item={item} />
            </li>
          ))}
        </ul>
      </Section>

      <Section tone="surface">
        <SectionHeading
          eyebrow="Coming up"
          title="Upcoming events"
          description="Sessions, workshops and campaigns open to communities, schools and partners."
        />
        <ul className="reveal-grid mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {upcoming.map((event) => (
            <li key={event.id}>
              <EventCard event={event} />
            </li>
          ))}
        </ul>
        <div className="mt-10">
          <Button asChild variant="outline">
            <Link to="/events">See all events</Link>
          </Button>
        </div>
      </Section>

      <Section>
        <Newsletter />
      </Section>
    </>
  );
}
