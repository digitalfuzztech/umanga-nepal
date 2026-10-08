import { ArrowRight, CalendarDays, Clock, MapPin } from "lucide-react";
import type { Resource } from "@/data/types";
import type { PublicEvent, PublicNews } from "@/lib/news-events";
import { AppLink } from "./AppLink";
import { Reveal } from "./Reveal";
import { ProgramImage } from "./ProgramImage";
import type { PublicOurWorkItem } from "@/lib/our-work";
import type { PublicStory } from "@/lib/stories";

const formatDate = (value?: string) =>
  value
    ? new Date(value).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

export function ProgramCard({
  program,
}: {
  program: Pick<
    PublicOurWorkItem,
    "slug" | "title" | "type" | "description" | "imageUrl"
  >;
}) {
  return (
    <Reveal className="h-full">
      <article className="group flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-card transition-all duration-300 motion-safe:hover:-translate-y-0.5 hover:border-brand/65 hover:shadow-lift">
        <div className="relative aspect-[16/10] overflow-hidden">
          <ProgramImage
            src={program.imageUrl}
            alt={program.title}
            loading="lazy"
            width={1400}
            height={1000}
            className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          <span className="absolute left-4 top-4 rounded-full bg-background/95 px-3 py-1 text-xs font-semibold text-brand-strong">
            {program.type}
          </span>
        </div>
        <div className="relative flex flex-1 flex-col gap-3 p-6 before:absolute before:left-6 before:top-0 before:h-0.5 before:w-12 before:bg-warm">
          <h3 className="font-display text-xl font-bold text-ink-deep">
            {program.title}
          </h3>
          <p className="flex-1 text-sm text-muted-foreground">
            {program.description}
          </p>
          <AppLink
            to={`/our-work/${program.slug}`}
            className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-brand-strong"
          >
            Learn more
            <ArrowRight
              className="size-4 transition-transform group-hover:translate-x-1"
              aria-hidden
            />
          </AppLink>
        </div>
      </article>
    </Reveal>
  );
}

export function StoryCard({
  story,
}: {
  story: Pick<
    PublicStory,
    | "slug"
    | "title"
    | "excerpt"
    | "category"
    | "imageUrl"
    | "storyDate"
    | "demoContent"
  >;
}) {
  return (
    <Reveal className="h-full">
      <article className="group flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-card transition-all duration-300 motion-safe:hover:-translate-y-0.5 hover:border-brand/65 hover:shadow-lift">
        <div className="aspect-[16/10] overflow-hidden">
          <ProgramImage
            src={story.imageUrl}
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
            {story.storyDate ? (
              <span className="text-muted-foreground">
                {formatDate(story.storyDate)}
              </span>
            ) : null}
          </div>
          <h3 className="font-display text-xl font-bold text-ink-deep">
            {story.title}
          </h3>
          <p className="flex-1 text-sm text-muted-foreground">
            {story.excerpt}
          </p>
          <AppLink
            to={`/stories/${story.slug}`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-strong"
          >
            Read story <ArrowRight className="size-4" aria-hidden />
          </AppLink>
        </div>
      </article>
    </Reveal>
  );
}

export function ResourceCard({ resource }: { resource: Resource }) {
  return (
    <Reveal className="h-full">
      <article className="group relative flex h-full flex-col gap-3 overflow-hidden rounded-[1.75rem] border border-border bg-card p-6 shadow-card transition-all duration-300 before:absolute before:inset-y-0 before:left-0 before:w-1 before:bg-brand-muted motion-safe:hover:-translate-y-0.5 hover:border-brand hover:shadow-lift">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground">
          <span className="rounded-full bg-surface-blue px-2.5 py-1 capitalize text-brand-strong">
            {resource.type}
          </span>
          {resource.readingTime ? (
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3.5" aria-hidden /> {resource.readingTime}{" "}
              min read
            </span>
          ) : null}
        </div>
        <h3 className="font-display text-lg font-bold text-ink-deep">
          {resource.title}
        </h3>
        <p className="flex-1 text-sm text-muted-foreground">
          {resource.excerpt}
        </p>
        <AppLink
          to={`/resources/${resource.slug}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-strong"
        >
          Read <ArrowRight className="size-4" aria-hidden />
        </AppLink>
      </article>
    </Reveal>
  );
}

export function NewsCard({ item }: { item: PublicNews }) {
  return (
    <Reveal className="h-full">
      <article className="group flex h-full flex-col overflow-hidden rounded-[1.75rem] border border-border bg-card shadow-card transition-all duration-300 motion-safe:hover:-translate-y-0.5 hover:border-brand/65 hover:shadow-lift">
        <div className="aspect-[16/10] overflow-hidden">
          <img
            src={item.imageUrl}
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
              <CalendarDays className="size-3.5" aria-hidden />{" "}
              {formatDate(`${item.newsDate}T12:00:00`)}
            </span>
            {item.location ? (
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-3.5" aria-hidden /> {item.location}
              </span>
            ) : null}
          </div>
          <h3 className="font-display text-lg font-bold text-ink-deep">
            {item.title}
          </h3>
          <p className="flex-1 text-sm text-muted-foreground">{item.excerpt}</p>
          <AppLink
            to={`/news/${item.slug}`}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-strong"
          >
            Read more <ArrowRight className="size-4" aria-hidden />
          </AppLink>
        </div>
      </article>
    </Reveal>
  );
}

export function EventCard({
  event,
  today,
}: {
  event: PublicEvent;
  today: string;
}) {
  const statusLabel = event.registrationOpen
    ? "Registration open"
    : event.eventStart < today
      ? "Past event"
      : "Upcoming";

  return (
    <Reveal className="h-full">
      <article className="relative flex h-full flex-col gap-3 overflow-hidden rounded-[1.75rem] border border-border bg-card p-6 shadow-card before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-warm transition-all duration-300 motion-safe:hover:-translate-y-0.5 hover:shadow-lift">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
          <span className="rounded-full bg-accent px-2.5 py-1 text-accent-foreground">
            {statusLabel}
          </span>
          <span className="rounded-full bg-surface-blue px-2.5 py-1 text-brand-strong">
            {event.category}
          </span>
        </div>
        <h3 className="font-display text-lg font-bold text-ink-deep">
          {event.title}
        </h3>
        <p className="flex-1 text-sm text-muted-foreground">{event.summary}</p>
        <dl className="grid gap-1.5 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <CalendarDays className="size-4 text-brand-strong" aria-hidden />
            <dt className="sr-only">Date</dt>
            <dd>{formatDate(`${event.eventStart}T12:00:00`)}</dd>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="size-4 text-brand-strong" aria-hidden />
            <dt className="sr-only">Location</dt>
            <dd>{event.location}</dd>
          </div>
        </dl>
      </article>
    </Reveal>
  );
}

export { formatDate };
