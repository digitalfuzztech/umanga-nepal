import { HandHeart, Handshake, HeartHandshake, Users } from "lucide-react";
import { Section, SectionHeading } from "./Section";
import { AppLink } from "./AppLink";

const actions = [
  { label: "Volunteer", to: "/volunteer", icon: Users, copy: "Give time and facilitate conversations." },
  { label: "Partner With Us", to: "/partner-with-us", icon: Handshake, copy: "Bring programs to your community." },
  { label: "Invite Umanga", to: "/invite-umanga", icon: HeartHandshake, copy: "Request a session for your group." },
  { label: "Support Our Work", to: "/support-us", icon: HandHeart, copy: "Help sustain awareness programs." },
];

export function CTABand() {
  return (
    <Section tone="brand">
      <SectionHeading
        onBrand
        eyebrow="Get involved"
        title="A healthier community begins with all of us."
        description="There is a role here for every kind of person — those who speak, those who listen, and those who quietly make things possible."
      />
      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {actions.map((action) => (
          <li key={action.to}>
            <AppLink
              to={action.to}
              className="flex h-full flex-col gap-3 rounded-3xl border border-primary-foreground/25 bg-primary-foreground/10 p-6 transition-colors hover:bg-primary-foreground/20"
            >
              <action.icon className="size-6 text-accent" aria-hidden />
              <span className="font-display text-lg font-bold text-primary-foreground">
                {action.label}
              </span>
              <span className="text-sm text-primary-foreground/80">{action.copy}</span>
            </AppLink>
          </li>
        ))}
      </ul>
    </Section>
  );
}
