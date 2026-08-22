import { ArrowRight, CalendarDays, Clock, MapPin } from "lucide-react";
import type { EventItem, NewsItem, Program, Resource, Story } from "@/data/types";
import { AppLink } from "./AppLink";

const formatDate = (value?: string) =>
  value
    ? new Date(value).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : "";

export function ProgramCard({ program }: { program: Program }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
      <div className="relative aspect-[16/10] overflow-hidden">
        <img
          src={program.heroImage}
          alt={program.title}
          loading="lazy"
          width={1400}
          height={1000}
          className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <span className="absolute left-4 top-4 rounded-full bg-background/95 px-3 py-1 text-xs font-semibold text-brand-strong">
          {program.category}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-3 p-6">
        <h3 className="font-display text-xl font-bold text-ink-deep">{program.title}</h3>
        <p className="flex-1 text-sm text-muted-foreground">{program.shortDescription}</p>
        <AppLink
          to={`/our-work/${program.slug}`}
          className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-strong"
        >
          Learn more
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
        </AppLink>
      </div>
    </article>
  );
}

export function StoryCard({ story }: { story: Story }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
      <div className="aspect-[16/10] overflow-hidden">
        <img
          src={story.image}
          alt={story.title}
          loading="lazy"
          width={1400}
          height={1000}
          className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-6">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className="rounded-full bg-brand-soft px-2.5 py-1 text-brand-strong">
            {story.category}
          </span>
          {story.demoContent ? (
            <span className="rounded-full bg-accent px-2.5 py-1 text-accent-foreground">
              Demo content
            </span>
          ) : null}
          {story.date ? (
            <span className="text-muted-foreground">{formatDate(story.date)}</span>
          ) : null}
        </div>
        <h3 className="font-display text-xl font-bold text-ink-deep">{story.title}</h3>
        <p className="flex-1 text-sm text-muted-foreground">{story.excerpt}</p>
        <AppLink
          to={`/stories/${story.slug}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-strong"
        >
          Read story <ArrowRight className="size-4" aria-hidden />
        </AppLink>
      </div>
    </article>
  );
}

export function ResourceCard({ resource }: { resource: Resource }) {
  return (
    <article className="group flex h-full flex-col gap-3 rounded-3xl border border-border bg-card p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-brand hover:shadow-lift">
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground">
        <span className="rounded-full bg-surface-blue px-2.5 py-1 capitalize text-brand-strong">
          {resource.type}
        </span>
        {resource.readingTime ? (
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3.5" aria-hidden /> {resource.readingTime} min read
          </span>
        ) : null}
      </div>
      <h3 className="font-display text-lg font-bold text-ink-deep">{resource.title}</h3>
      <p className="flex-1 text-sm text-muted-foreground">{resource.excerpt}</p>
      <AppLink
        to={`/resources/${resource.slug}`}
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-strong"
      >
        Read <ArrowRight className="size-4" aria-hidden />
      </AppLink>
    </article>
  );
}

export function NewsCard({ item }: { item: NewsItem }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-soft transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
      <div className="aspect-[16/10] overflow-hidden">
        <img
          src={item.image}
          alt={item.title}
          loading="lazy"
          width={1400}
          height={1000}
          className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-6">
        <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-muted-foreground">
          <span className="rounded-full bg-brand-soft px-2.5 py-1 text-brand-strong">
            {item.category}
          </span>
          <span className="inline-flex items-center gap-1">
            <CalendarDays className="size-3.5" aria-hidden /> {formatDate(item.date)}
          </span>
          {item.location ? (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" aria-hidden /> {item.location}
            </span>
          ) : null}
        </div>
        <h3 className="font-display text-lg font-bold text-ink-deep">{item.title}</h3>
        <p className="flex-1 text-sm text-muted-foreground">{item.excerpt}</p>
        <AppLink
          to={`/news/${item.slug}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-strong"
        >
          Read more <ArrowRight className="size-4" aria-hidden />
        </AppLink>
      </div>
    </article>
  );
}

export function EventCard({ event }: { event: EventItem }) {
  const statusLabel = {
    upcoming: "Upcoming",
    past: "Past event",
    "registration-open": "Registration open",
  }[event.status];

  return (
    <article className="flex h-full flex-col gap-3 rounded-3xl border border-border bg-card p-6 shadow-soft">
      <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
        <span className="rounded-full bg-accent px-2.5 py-1 text-accent-foreground">
          {statusLabel}
        </span>
        <span className="rounded-full bg-surface-blue px-2.5 py-1 text-brand-strong">
          {event.category}
        </span>
      </div>
      <h3 className="font-display text-lg font-bold text-ink-deep">{event.title}</h3>
      <p className="flex-1 text-sm text-muted-foreground">{event.summary}</p>
      <dl className="grid gap-1.5 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <CalendarDays className="size-4 text-brand-strong" aria-hidden />
          <dt className="sr-only">Date</dt>
          <dd>{formatDate(event.date)}</dd>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="size-4 text-brand-strong" aria-hidden />
          <dt className="sr-only">Location</dt>
          <dd>{event.location}</dd>
        </div>
      </dl>
    </article>
  );
}

export { formatDate };
