import { createFileRoute, Link } from "@tanstack/react-router";
import { PageHero } from "@/components/site/PageHero";
import { Section, SectionHeading } from "@/components/site/Section";
import { EventCard } from "@/components/site/Cards";
import { Button } from "@/components/ui/button";
import { Newsletter } from "@/components/site/Newsletter";
import {
  getPublishedEventsServerFn,
  getEventsCalendarDateServerFn,
} from "@/lib/events-server-functions";

export const Route = createFileRoute("/events")({
  loader: async () => {
    const [events, today] = await Promise.all([
      getPublishedEventsServerFn(),
      getEventsCalendarDateServerFn(),
    ]);
    return { events, today };
  },
  staleTime: 0,
  gcTime: 0,
  shouldReload: true,
  head: () => ({
    meta: [
      { title: "Events | Mental Health Sessions & Workshops in Nepal" },
      {
        name: "description",
        content:
          "Upcoming and past awareness sessions, workshops and campaigns hosted by Umanga Nepal for schools, communities and partners.",
      },
      { property: "og:title", content: "Events | Umanga Nepal" },
      {
        property: "og:description",
        content:
          "Awareness sessions, workshops and campaigns from Umanga Nepal.",
      },
    ],
  }),
  component: Events,
});

function Events() {
  const { events, today } = Route.useLoaderData();
  const upcoming = events.filter((event) => event.eventStart >= today);
  const past = events.filter((event) => event.eventStart < today);

  return (
    <>
      <PageHero
        eyebrow="Events"
        title="Join a session near you"
        description="Awareness sessions, workshops and campaigns. Dates and venues are confirmed with host communities before publication."
      >
        <Button asChild variant="brand" size="lg">
          <Link to="/invite-umanga">Invite Umanga to your community</Link>
        </Button>
      </PageHero>

      <Section>
        <SectionHeading eyebrow="Upcoming" title="What's coming up" />
        {upcoming.length === 0 ? (
          <p className="mt-10 rounded-3xl border border-dashed border-border bg-surface p-8 text-sm text-muted-foreground">
            No events are scheduled right now. Subscribe below to hear when new
            sessions open.
          </p>
        ) : (
          <ul className="reveal-grid mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {upcoming.map((event) => (
              <li key={event.id}>
                <EventCard event={event} today={today} />
              </li>
            ))}
          </ul>
        )}
      </Section>

      {past.length > 0 ? (
        <Section tone="surface">
          <SectionHeading eyebrow="Archive" title="Past events" />
          <ul className="reveal-grid mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {past.map((event) => (
              <li key={event.id}>
                <EventCard event={event} today={today} />
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section tone={past.length > 0 ? "default" : "surface"}>
        <Newsletter source="/events" />
      </Section>
    </>
  );
}
