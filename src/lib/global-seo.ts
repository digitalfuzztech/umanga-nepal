import type { PublicSettings } from "./general-settings";

export const globalSeoFallback = {
  title: "Umanga Nepal | Mental Health Awareness & Community Wellbeing",
  description:
    "Umanga Nepal is a non-profit NGO creating spaces across Nepal where people can speak openly about mental health, learn, connect and find appropriate support.",
  openGraphTitle: "Umanga Nepal | Mental Health Awareness in Nepal",
  openGraphDescription:
    "Awareness, psychosocial support, youth empowerment and creative programs for a mentally healthier Nepal.",
};
export function resolveSeo(
  settings: PublicSettings | null,
  page: { title?: string | null; description?: string | null } = {},
) {
  return {
    title:
      page.title ||
      settings?.seoTitle ||
      settings?.websiteTitle ||
      globalSeoFallback.title,
    description:
      page.description ||
      settings?.seoDescription ||
      globalSeoFallback.description,
    openGraphTitle:
      page.title ||
      settings?.openGraphTitle ||
      settings?.seoTitle ||
      globalSeoFallback.openGraphTitle,
    openGraphDescription:
      page.description ||
      settings?.openGraphDescription ||
      settings?.seoDescription ||
      globalSeoFallback.openGraphDescription,
  };
}
export function organizationJsonLd(settings: PublicSettings | null) {
  if (!settings) return null;
  const result: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
  };
  const values = {
    name: settings.companyName || settings.websiteTitle,
    url: settings.websiteUrl,
    logo: settings.headerLogoUrl,
    description: settings.companyDescription,
    email: settings.email,
    telephone: settings.phone,
    address: settings.address,
  };
  for (const [key, value] of Object.entries(values))
    if (value) result[key] = value;
  const sameAs = [
    settings.facebookUrl,
    settings.instagramUrl,
    settings.twitterUrl,
    settings.youtubeUrl,
    settings.tiktokUrl,
    settings.linkedinUrl,
  ].filter(Boolean);
  if (sameAs.length) result["sameAs"] = sameAs;
  return result;
}
export function websiteJsonLd(settings: PublicSettings | null) {
  if (!settings?.websiteUrl || !settings.websiteTitle) return null;
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: settings.websiteTitle,
    url: settings.websiteUrl,
  };
}
export function serializeJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
