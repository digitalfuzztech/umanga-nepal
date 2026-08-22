import { Link } from "@tanstack/react-router";
import { Facebook, Instagram, Linkedin, Mail, MapPin, Phone, Youtube } from "lucide-react";
import { footerNav, siteConfig } from "@/data/site-config";
import { Logo } from "./Logo";

const socialIcons = {
  facebook: Facebook,
  instagram: Instagram,
  youtube: Youtube,
  linkedin: Linkedin,
} as const;

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: { label: string; to: string }[];
}) {
  return (
    <div>
      <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-ink-deep">{title}</h3>
      <ul className="mt-4 flex flex-col gap-2.5">
        {links.map((link) => (
          <li key={link.to + link.label}>
            <Link
              to={link.to}
              className="text-sm text-muted-foreground transition-colors hover:text-brand-strong"
            >
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function Footer() {
  const year = new Date().getFullYear();
  const activeSocial = siteConfig.social.filter((s) => s.url);
  const { email, phone, address } = siteConfig.contact;

  return (
    <footer className="border-t border-border bg-surface">
      <div className="container-page grid gap-10 py-14 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
            {siteConfig.shortDescription}
          </p>
          <ul className="mt-5 flex flex-col gap-2 text-sm text-muted-foreground">
            {address ? (
              <li className="flex items-start gap-2">
                <MapPin className="mt-0.5 size-4 text-brand-strong" aria-hidden /> {address}
              </li>
            ) : null}
            {email ? (
              <li className="flex items-start gap-2">
                <Mail className="mt-0.5 size-4 text-brand-strong" aria-hidden />
                <a className="hover:text-brand-strong" href={`mailto:${email}`}>
                  {email}
                </a>
              </li>
            ) : null}
            {phone ? (
              <li className="flex items-start gap-2">
                <Phone className="mt-0.5 size-4 text-brand-strong" aria-hidden /> {phone}
              </li>
            ) : null}
          </ul>
          {activeSocial.length ? (
            <ul className="mt-6 flex gap-2">
              {activeSocial.map((social) => {
                const Icon = socialIcons[social.platform];
                return (
                  <li key={social.platform}>
                    <a
                      href={social.url}
                      aria-label={social.label}
                      className="inline-flex size-10 items-center justify-center rounded-full border border-border bg-background text-ink transition-colors hover:border-brand hover:text-brand-strong"
                    >
                      <Icon className="size-4" />
                    </a>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>

        <FooterColumn title="Explore" links={footerNav.explore} />
        <FooterColumn title="Get Involved" links={footerNav.involved} />
        <FooterColumn title="Connect" links={footerNav.connect} />
        <FooterColumn title="Support" links={footerNav.support} />
      </div>

      <div className="border-t border-border">
        <div className="container-page flex flex-col gap-3 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {year} Umanga Nepal. All rights reserved.</p>
          <p className="max-w-xl">
            Umanga Nepal is an awareness and community organization. This website is not an
            emergency, crisis or clinical service.
          </p>
        </div>
      </div>
    </footer>
  );
}
