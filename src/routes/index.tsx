import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpenText,
  CalendarHeart,
  Ear,
  HandHeart,
  HeartHandshake,
  Megaphone,
  MessagesSquare,
  Network,
  Sparkles,
} from "lucide-react";
import heroImage from "@/assets/hero-community.jpg";
import { Button } from "@/components/ui/button";
import { Section, SectionHeading } from "@/components/site/Section";
import { ProgramCard, ResourceCard, StoryCard, NewsCard } from "@/components/site/Cards";
import { Counter } from "@/components/site/Counter";
import { Testimonials } from "@/components/site/Testimonials";
import { CTABand } from "@/components/site/CTABand";
import { Newsletter } from "@/components/site/Newsletter";
import { AppLink } from "@/components/site/AppLink";
import { Reveal } from "@/components/site/Reveal";
import { getPublishedOurWorkItemsServerFn } from "@/lib/our-work-server-functions";
import { getPublishedStoriesServerFn } from "@/lib/stories-server-functions";
import { getFeaturedOurWorkItem } from "@/lib/our-work";
import { ProgramImage } from "@/components/site/ProgramImage";
import { impactMetrics, nepalContext, objectiveGroups } from "@/data/impact";
import { getPublishedResourcesServerFn } from "@/lib/resources-server-functions";
import { resourceView } from "@/lib/resource-view";
import { getPublishedNewsServerFn } from "@/lib/news-server-functions";
import { partners } from "@/data/testimonials";
import { siteConfig } from "@/data/site-config";
import hamroPalo from "@/assets/logo/hamropalo.png";

export const Route = createFileRoute("/")({
  loader: async () => {
    const [programs, stories, news, resourceItems] = await Promise.all([
      getPublishedOurWorkItemsServerFn(),
      getPublishedStoriesServerFn(),
      getPublishedNewsServerFn(),
      getPublishedResourcesServerFn(),
    ]);
    return { programs, stories, news, resources: resourceItems.map(resourceView) };
  },
  staleTime: 0,
  gcTime: 0,
  shouldReload: true,
  head: () => ({
    meta: [
      { title: "Umanga Nepal | Every Mind Deserves to Be Heard" },
      {
        name: "description",
        content:
          "Umanga Nepal creates spaces where people across Nepal can speak openly about mental health, learn, connect and find pathways to appropriate support.",
      },
      { property: "og:title", content: "Umanga Nepal | Every Mind Deserves to Be Heard" },
      {
        property: "og:description",
        content:
          "Mental health awareness, youth programs, creative wellbeing and community partnerships across Nepal.",
      },
    ],
  }),
  component: Home,
});

const objectiveIcons = {
  ear: Ear,
  heart: HeartHandshake,
  book: BookOpenText,
  network: Network,
  megaphone: Megaphone,
} as const;

const entryPoints = [
  {
    title: "I want someone to listen",
    body: "Reach out and share what you are carrying. You do not have to explain it perfectly.",
    to: "/get-support",
    icon: Ear,
  },
  {
    title: "I want to understand mental health",
    body: "Plain-language articles and guides on stress, anxiety, self-esteem and support.",
    to: "/resources",
    icon: BookOpenText,
  },
  {
    title: "I want to attend a program",
    body: "Sessions, workshops and community events happening across Nepal.",
    to: "/events",
    icon: CalendarHeart,
  },
  {
    title: "I want to help Umanga",
    body: "Volunteer, partner with us, invite a session or support the work.",
    to: "/get-involved",
    icon: HandHeart,
  },
];

function Home() {
  const { programs, stories, news, resources } = Route.useLoaderData();
  const featured = getFeaturedOurWorkItem(programs);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-brand-muted/45 surface-gradient">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-64 editorial-grid opacity-70"
          aria-hidden
        />
        <div className="container-page relative grid items-center gap-14 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <Reveal>
          <div className="flex flex-col gap-6 border-l-2 border-warm pl-5 sm:pl-7">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border bg-background/80 px-4 py-1.5 text-xs font-semibold text-brand-strong">
              <Sparkles className="size-3.5" aria-hidden />
              {siteConfig.establishedNote}
            </span>
            <h1 className="text-balance-title text-4xl font-extrabold leading-[1.05] text-ink-deep sm:text-5xl lg:text-6xl">
              Every mind deserves <span className="text-brand-strong">to be heard.</span>
            </h1>
            <p className="max-w-xl text-lg text-muted-foreground">
              Umanga Nepal is creating spaces where people can speak openly, understand mental
              health, find support, and build healthier communities across Nepal.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <Button asChild variant="brand" size="lg">
                <Link to="/our-work">
                  Explore our work <ArrowRight aria-hidden />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link to="/get-support">Reach out</Link>
              </Button>
            </div>
            <Link
              to="/resources"
              className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-ink underline-offset-4 hover:text-brand-strong hover:underline"
            >
              Learn about mental wellbeing <ArrowRight className="size-4" aria-hidden />
            </Link>
          </div>
          </Reveal>

          <Reveal variant="scale" delay={100}>
          <div className="relative isolate p-2 sm:p-3">
            <div className="absolute inset-0 rotate-2 rounded-[2.25rem] bg-brand-muted/55" aria-hidden />
            <img
              src={heroImage}
              alt="Community members sitting together in conversation in a courtyard in Nepal"
              width={1600}
              height={1200}
              className="relative aspect-[5/4] w-full rounded-[1.8rem] border border-white/80 object-cover shadow-image"
            />
            <div className="absolute -bottom-6 left-6 hidden rounded-2xl border border-border bg-background px-5 py-4 shadow-soft sm:block">
              <p className="font-display text-2xl font-extrabold text-ink-deep">
                <Counter value={1600} />+
              </p>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Awareness participants
              </p>
            </div>
          </div>
          </Reveal>
        </div>
      </section>

      {/* Quick support strip */}
      <Section tone="default" className="pt-14 sm:pt-16">
        <SectionHeading
          eyebrow="How can we help?"
          title="What brings you here today?"
          description="Choose whatever feels closest. There is no wrong door."
        />
        <ul className="reveal-grid mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {entryPoints.map((entry) => (
            <li key={entry.to}>
              <Reveal className="h-full">
              <AppLink
                to={entry.to}
                className="group flex h-full flex-col gap-3 rounded-3xl border border-border bg-card p-6 shadow-soft transition-all duration-300 hover:-translate-y-1 hover:border-brand hover:shadow-lift"
              >
                <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-brand-soft text-brand-strong">
                  <entry.icon className="size-5" aria-hidden />
                </span>
                <span className="font-display text-lg font-bold text-ink-deep">{entry.title}</span>
                <span className="flex-1 text-sm text-muted-foreground">{entry.body}</span>
                <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-strong">
                  Continue
                  <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden />
                </span>
              </AppLink>
              </Reveal>
            </li>
          ))}
        </ul>
      </Section>

      {/* Introduction */}
      <Section tone="surface">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <SectionHeading
            eyebrow="Cherish With Umanga"
            title="Sharing can make the weight a little lighter."
          />
          <div className="flex flex-col gap-5 text-base leading-relaxed text-muted-foreground">
            <p>
              Sharing is caring, yet people often retain difficult thoughts and feelings within
              themselves. Umanga Nepal believes in the power of being heard, creating supportive
              communities, and encouraging people to seek appropriate help when needed.
            </p>
            <p>
              We work to create spaces where people can talk, learn, connect, build resilience and
              seek appropriate support — in schools, in communities, online, and through creative
              programs that reach where words alone cannot.
            </p>
            <div>
              <Button asChild variant="outline">
                <Link to="/about">
                  Discover our story <ArrowRight aria-hidden />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </Section>

      {/* Impact counters */}
      <Section>
        <SectionHeading
          eyebrow="Our impact so far"
          title="Small conversations. Meaningful change."
          description="Figures reflect programs delivered by Umanga Nepal. We do not combine them into a single total, because participation across programs may overlap."
        />
        <ul className="reveal-grid mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {impactMetrics.map((metric) => (
            <li key={metric.label}>
              <Reveal className="h-full">
              <div className="h-full rounded-3xl border border-brand-muted/55 bg-card p-7 shadow-card">
              <p className="font-display text-4xl font-extrabold text-brand-strong">
                <Counter value={metric.value} />
              </p>
              <p className="mt-2 font-semibold text-ink-deep">{metric.label}</p>
              {metric.note ? (
                <p className="mt-1 text-xs text-muted-foreground">{metric.note}</p>
              ) : null}
              </div>
              </Reveal>
            </li>
          ))}
        </ul>
      </Section>

      {/* Our work */}
      <Section tone="blue">
        <SectionHeading
          eyebrow="Our work"
          title="How we create change"
          description="From awareness and education to creativity and community conversation, our programs meet people where they are."
        />
        <ul className="reveal-grid mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {programs.slice(0, 6).map((program) => (
            <li key={program.id}>
              <ProgramCard program={program} />
            </li>
          ))}
        </ul>
        <div className="mt-10">
          <Button asChild variant="brand">
            <Link to="/our-work">
              Explore all programs <ArrowRight aria-hidden />
            </Link>
          </Button>
        </div>
      </Section>

      {/* Featured program */}
      {featured ? (
        <Section>
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center">
            <div className="relative">
              <ProgramImage
                src={featured.imageUrl}
                alt={featured.title}
                loading="lazy"
                width={1400}
                height={1000}
                className="aspect-[4/3] w-full rounded-[2rem] object-cover shadow-soft"
              />
              <span className="absolute -bottom-4 -right-2 hidden rounded-2xl bg-warm-strong px-4 py-2 text-sm font-bold text-primary-foreground sm:block">
                Featured program
              </span>
            </div>
            <div className="flex flex-col gap-5">
              <SectionHeading eyebrow={featured.type} title={featured.title} />
              <p className="text-base leading-relaxed text-muted-foreground">
                {featured.aboutProgram}
              </p>
              <ul className="flex flex-wrap gap-2">
                {featured.tags.map((tag) => (
                  <li
                    key={tag}
                    className="rounded-full bg-surface-blue px-3 py-1 text-xs font-semibold text-brand-strong"
                  >
                    {tag}
                  </li>
                ))}
              </ul>
              <blockquote className="border-l-4 border-warm pl-4 text-base italic text-ink">
                “I walked out feeling understood — and equipped.”
                <footer className="mt-1 text-xs font-semibold not-italic text-muted-foreground">
                  Program Participant
                </footer>
              </blockquote>
              <div>
                <Button asChild variant="brand">
                  <AppLink to={`/our-work/${featured.slug}`}>
                    See the program <ArrowRight aria-hidden />
                  </AppLink>
                </Button>
              </div>
            </div>
          </div>
        </Section>
      ) : null}

      {/* Partners */}
      <Section tone="surface">
        <SectionHeading
          eyebrow="Partnerships"
          title="Change happens together"
          description="Since 2020, Umanga Nepal has implemented mental health awareness initiatives and campaigns in collaboration with other organizations."
        />
        <ul className="mt-10 grid gap-4 sm:grid-cols-2">
          {partners.map((partner) => (
            <li
              key={partner.id}
              className="flex items-center gap-5 rounded-3xl border border-border bg-card p-6 shadow-soft"
            >
              <div className="flex size-20 shrink-0 items-center justify-center rounded-2xl bg-surface-blue text-xs font-semibold text-brand-strong">
                <img
                    src={partner.photo}
                    alt={`${partner.name} logo`}
                    className="max-h-full max-w-full object-contain"
                />
              </div>
              <div>
                <p className="font-display text-lg font-bold text-ink-deep">{partner.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{partner.description}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-8">
          <Button asChild variant="outline">
            <Link to="/partner-with-us">Partner with Umanga</Link>
          </Button>
        </div>
      </Section>

      {/* Community voices */}
      <Section>
        <SectionHeading
          eyebrow="Community voices"
          title="Hear from our community"
          description="Statements shared by participants. Names are withheld until consent for attribution is confirmed."
        />
        <div className="mt-10">
          <Testimonials />
        </div>
      </Section>

      {/* Stories */}
      <Section tone="blue">
        <SectionHeading
          eyebrow="Stories"
          title="Stories of hope, courage & connection"
          description="Program experiences, community change and volunteer reflections."
        />
        {stories.length > 0 ? (
          <ul className="reveal-grid mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {stories.slice(0, 3).map((story) => (
              <li key={story.id}>
                <StoryCard story={story} />
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-10 text-muted-foreground">
            More stories are on the way. Please check back soon.
          </p>
        )}
        <div className="mt-10">
          <Button asChild variant="outline">
            <Link to="/stories">Read more stories</Link>
          </Button>
        </div>
      </Section>

      {/* Mental health in Nepal */}
      <Section>
        <SectionHeading
          eyebrow="Current scenario"
          title="Mental health in Nepal"
          description="The context we work within, described in plain and respectful language. We publish statistics only with a verified source and year."
        />
        <ul className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {nepalContext.map((item) => (
            <li key={item.title} className="rounded-3xl border border-border bg-card p-6 shadow-soft">
              <h3 className="font-display text-base font-bold text-ink-deep">{item.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
            </li>
          ))}
        </ul>
      </Section>

      {/* Objectives */}
      <Section tone="surface">
        <SectionHeading eyebrow="Our objectives" title="What we're working toward" />
        <ul className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {objectiveGroups.map((group) => {
            const Icon = objectiveIcons[group.icon as keyof typeof objectiveIcons];
            return (
              <li key={group.key} className="rounded-3xl border border-border bg-card p-7 shadow-soft">
                <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-brand-soft text-brand-strong">
                  <Icon className="size-5" aria-hidden />
                </span>
                <h3 className="mt-4 font-display text-xl font-bold text-ink-deep">{group.title}</h3>
                <ul className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
                  {group.points.map((point) => (
                    <li key={point} className="flex gap-2">
                      <span className="mt-2 size-1.5 shrink-0 rounded-full bg-warm" aria-hidden />
                      {point}
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      </Section>

      {/* Vision + mission */}
      <Section>
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-[2rem] border border-border bg-surface-blue p-9">
            <span className="eyebrow">Our vision</span>
            <p className="mt-4 font-display text-2xl font-extrabold leading-snug text-ink-deep sm:text-3xl">
              A future where no one needs to face mental-health challenges alone.
            </p>
          </div>
          <div className="rounded-[2rem] border border-border bg-card p-9 shadow-soft">
            <span className="eyebrow">Our mission</span>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">
              To provide transformational, community-centered support and awareness initiatives so
              people can access understanding, encouragement, appropriate support, and pathways to
              professional help in ways that respect their needs and circumstances.
            </p>
            <ul className="mt-5 grid gap-2 text-sm text-ink sm:grid-cols-2">
              {[
                "Strengthen community and family support",
                "Protect wellbeing",
                "Improve access to appropriate care",
                "Reduce stigma",
                "Build awareness",
              ].map((item) => (
                <li key={item} className="flex gap-2">
                  <span className="mt-2 size-1.5 shrink-0 rounded-full bg-brand" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      {/* Resources preview */}
      <Section tone="blue">
        <SectionHeading
          eyebrow="Resources"
          title="Take a moment for your mind"
          description="Short, plain-language reading on the things people actually ask us about."
        />
        <ul className="reveal-grid mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {resources.slice(0, 6).map((resource) => (
            <li key={resource.id}>
              <ResourceCard resource={resource} />
            </li>
          ))}
        </ul>
        <div className="mt-10">
          <Button asChild variant="brand">
            <Link to="/resources">Explore resources</Link>
          </Button>
        </div>
      </Section>

      {/* Let's speak about mental health */}
      <Section>
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
          <SectionHeading
            eyebrow="Multimedia series"
            title="Let's Speak About Mental Health"
            description="A multimedia awareness series encouraging honest and compassionate conversations around mental-health experiences in Nepal."
          >
            <div className="pt-2">
              <Button asChild variant="outline">
                <Link to="/our-work/lets-speak-about-mental-health">See the series</Link>
              </Button>
            </div>
          </SectionHeading>
          <ul className="grid gap-4 sm:grid-cols-2">
            {[
              { type: "Video", title: "Conversations on stigma", note: "Coming soon" },
              { type: "Audio", title: "Listening without fixing", note: "Coming soon" },
              { type: "Interview", title: "Youth voices on pressure", note: "Coming soon" },
              { type: "Short", title: "What to say to a friend", note: "Coming soon" },
            ].map((media) => (
              <li
                key={media.title}
                className="flex flex-col gap-3 rounded-3xl border border-border bg-card p-6 shadow-soft"
              >
                <span className="inline-flex size-11 items-center justify-center rounded-full bg-brand-soft text-brand-strong">
                  <MessagesSquare className="size-5" aria-hidden />
                </span>
                <span className="text-xs font-bold uppercase tracking-wide text-brand-strong">
                  {media.type}
                </span>
                <span className="font-display text-base font-bold text-ink-deep">{media.title}</span>
                <span className="text-xs text-muted-foreground">{media.note}</span>
              </li>
            ))}
          </ul>
        </div>
      </Section>

      <CTABand />

      {/* News & events */}
      <Section tone="surface">
        <SectionHeading
          eyebrow="News & events"
          title="What's happening at Umanga"
          description="Campaign activities, workshops and community programs."
        />
        <ul className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {news.map((item) => (
            <li key={item.id}>
              <NewsCard item={item} />
            </li>
          ))}
        </ul>
        <div className="mt-10 flex flex-wrap gap-3">
          <Button asChild variant="brand">
            <Link to="/news">View news</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/events">Upcoming events</Link>
          </Button>
        </div>
      </Section>

      {/* Newsletter */}
      <Section tone="brand">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <SectionHeading
            onBrand
            eyebrow="Newsletter"
            title="Stay connected with Umanga"
            description="Occasional updates on programs, resources and ways to take part."
          />
          <Newsletter source="/" />
        </div>
      </Section>
    </>
  );
}
