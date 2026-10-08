import { Link } from "@tanstack/react-router";
import { Mail, MapPin, Phone } from "lucide-react";
import {
  FaFacebookF,
  FaInstagram,
  FaLinkedinIn,
  FaXTwitter,
  FaYoutube,
  FaTiktok,
} from "react-icons/fa6";
import { useGeneralSettings } from "@/lib/general-settings-context";
import { footerNav, siteConfig } from "@/data/site-config";
import umangaLogo from "@/assets/logo/umanga-png.png";

const socialIcons = {
  facebook: FaFacebookF,
  instagram: FaInstagram,
  youtube: FaYoutube,
  linkedin: FaLinkedinIn,
  twitter: FaXTwitter,
  tiktok: FaTiktok,
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
      <h3 className="text-sm font-bold uppercase tracking-[0.12em] text-white">
        {title}
      </h3>
      <ul className="mt-4 flex flex-col gap-2.5">
        {links.map((link) => (
          <li key={link.to + link.label}>
            <Link
              to={link.to}
              className="text-sm text-white/65 transition-colors hover:text-brand"
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
  const settings = useGeneralSettings();
  const activeSocial = settings
    ? (Object.keys(socialIcons) as (keyof typeof socialIcons)[])
        .map((platform) => ({
          platform,
          label: platform === "twitter" ? "Twitter / X" : platform,
          url: settings[`${platform}Url`],
        }))
        .filter((s) => s.url)
    : siteConfig.social.filter((s) => s.url);
  const { email, phone, address } = settings || siteConfig.contact;

  return (
    <footer className="relative overflow-hidden border-t border-brand-deep/15 bg-brand-deeper text-white">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-warm to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-0 top-0 h-64 w-96 bg-brand-deep/50 blur-3xl"
        aria-hidden
      />
      <div className="container-page relative grid gap-10 py-16 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
        <div className="max-w-sm">
          <div className="inline-flex rounded-full shadow-soft">
            <img
              src={settings?.footerLogoUrl || umangaLogo}
              alt="umanga logo"
              className="!w-40"
            />
          </div>
          {(
            settings ? settings.companyDescription : siteConfig.shortDescription
          ) ? (
            <p className="mt-6 whitespace-pre-line text-sm leading-relaxed text-white/70">
              {settings
                ? settings.companyDescription
                : siteConfig.shortDescription}
            </p>
          ) : null}
          <ul className="mt-5 flex flex-col gap-2 text-sm text-white/70">
            {address ? (
              <li className="flex items-start gap-2">
                <MapPin
                  className="mt-0.5 size-4 text-brand-strong"
                  aria-hidden
                />{" "}
                {address}
              </li>
            ) : null}
            {email ? (
              <li className="flex items-start gap-2">
                <Mail className="mt-0.5 size-4 text-brand-strong" aria-hidden />
                <a
                  className="break-all hover:text-brand-strong"
                  href={`mailto:${email}`}
                >
                  {email}
                </a>
              </li>
            ) : null}
            {phone ? (
              <li className="flex items-start gap-2">
                <Phone
                  className="mt-0.5 size-4 text-brand-strong"
                  aria-hidden
                />{" "}
                <a
                  href={`tel:${phone.replace(/[^+0-9]/g, "")}`}
                  className="hover:text-brand-strong"
                >
                  {phone}
                </a>
              </li>
            ) : null}
          </ul>
          {activeSocial.length ? (
            <ul className="mt-6 flex flex-wrap gap-2">
              {activeSocial.map((social) => {
                const Icon = socialIcons[social.platform];
                return (
                  <li key={social.platform}>
                    <a
                      href={social.url!}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={social.label}
                      className="inline-flex size-10 items-center justify-center rounded-full border border-white/20 bg-white/5 text-white transition-colors hover:border-brand hover:bg-white/10"
                    >
                      <Icon className="size-4" aria-hidden />
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

      <div className="relative border-t border-white/10">
        <div className="container-page flex flex-col gap-3 py-6 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-col items-center md:items-start">
            <p>
              Designed and Developed by{" "}
              <a
                href="https://blitzelement.com"
                className="text-blue-300 hover:text-orange-400 ease-in-out"
                target="_blank"
              >
                Blitz Elements
              </a>
            </p>
            <p>© {year} Umanga Nepal. All rights reserved. </p>
          </div>
          <div className="flex flex-col items-center md:items-end">
            <p className="max-w-xl">
              Umanga Nepal is an awareness and community organization.
            </p>
            <p>This website is not an emergency, crisis or clinical service.</p>
          </div>
        </div>
      </div>
    </footer>
  );
}
