import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, HeartHandshake, Phone, Users } from "lucide-react";
import { PageHero } from "@/components/site/PageHero";
import { Section, SectionHeading } from "@/components/site/Section";
import { Button } from "@/components/ui/button";
import { supportDisclaimer, verifiedSupportContacts } from "@/data/support";

export const Route = createFileRoute("/get-support")({
  head: () => ({
    meta: [
      { title: "Get Support | Umanga Nepal" },
      {
        name: "description",
        content:
          "How to find mental health support in Nepal, what Umanga Nepal can and cannot offer, and steps to take if you or someone you know is struggling.",
      },
      { property: "og:title", content: "Get Support | Umanga Nepal" },
      {
        property: "og:description",
        content: "Finding mental health support in Nepal and understanding what Umanga Nepal offers.",
      },
    ],
  }),
  component: GetSupport,
});

const steps = [
  {
    icon: Users,
    title: "Talk to someone you trust",
    body: "A friend, family member, teacher or colleague. Saying it out loud once often makes the next step easier.",
  },
  {
    icon: HeartHandshake,
    title: "Reach a qualified professional",
    body: "Psychiatrists, psychologists and counsellors work in hospitals, clinics and community health facilities across Nepal. Your local health post can point you toward available services.",
  },
  {
    icon: Phone,
    title: "In an emergency, seek immediate medical care",
    body: "If someone is at immediate risk of harm, contact local emergency services or go to the nearest hospital emergency department without delay.",
  },
];

function GetSupport() {
  return (
    <>
      <PageHero
        eyebrow="Get support"
        title="You don't have to work through it alone"
        description="Umanga Nepal runs awareness and psychosocial support programs. This page explains what we do, what we don't, and how to find appropriate help."
      />

      <Section>
        <div className="flex gap-4 rounded-[2rem] border border-warm/40 bg-warm-soft p-8">
          <AlertTriangle className="mt-0.5 size-6 shrink-0 text-warm-strong" aria-hidden />
          <div>
            <h2 className="font-display text-xl font-bold text-ink-deep">
              Important: we are not a crisis service
            </h2>
            <p className="mt-3 text-base text-muted-foreground">{supportDisclaimer}</p>
            <p className="mt-3 text-base text-muted-foreground">
              If you or someone else is in immediate danger, contact local emergency services or go
              to the nearest hospital right away.
            </p>
          </div>
        </div>
      </Section>

      <Section tone="surface">
        <SectionHeading eyebrow="Steps you can take" title="Where to start" />
        <ul className="mt-10 grid gap-4 md:grid-cols-3">
          {steps.map((step) => (
            <li key={step.title} className="rounded-3xl border border-border bg-card p-7 shadow-soft">
              <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-brand-soft text-brand-strong">
                <step.icon className="size-5" aria-hidden />
              </span>
              <h3 className="mt-4 font-display text-lg font-bold text-ink-deep">{step.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section>
        <SectionHeading
          eyebrow="Support directory"
          title="Verified services"
          description="We list a helpline or service only after confirming it is current and accurate."
        />
        {verifiedSupportContacts.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-dashed border-border bg-surface p-8">
            <p className="font-semibold text-ink-deep">
              No helpline numbers are published on this page yet.
            </p>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Publishing an incorrect or outdated crisis number can cause real harm, so this
              directory stays empty until each entry is verified by the Umanga Nepal team. In the
              meantime, your nearest hospital, health post or a qualified mental health professional
              is the most reliable route to support.
            </p>
          </div>
        ) : (
          <ul className="mt-8 grid gap-4 md:grid-cols-2">
            {verifiedSupportContacts.map((contact) => (
              <li
                key={contact.organization}
                className="rounded-3xl border border-border bg-card p-7 shadow-soft"
              >
                <h3 className="font-display text-lg font-bold text-ink-deep">
                  {contact.organization}
                </h3>
                <p className="mt-1 text-sm text-muted-foreground">{contact.service}</p>
                <p className="mt-3 font-semibold text-brand-strong">{contact.phone}</p>
                <p className="text-xs text-muted-foreground">{contact.availability}</p>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section tone="blue">
        <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
          <SectionHeading
            eyebrow="What we can offer"
            title="Awareness, conversation and community connection"
            description="Our sessions create space to talk, understand mental health and learn where to look for further help. If you'd like a session in your school, workplace or community, get in touch."
          />
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="brand" size="lg">
              <Link to="/contact">Contact us</Link>
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/resources">Read our resources</Link>
            </Button>
          </div>
        </div>
      </Section>
    </>
  );
}
