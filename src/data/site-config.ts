/**
 * Central site configuration. Everything here is CMS-replaceable later.
 * Contact details are intentionally empty until the organization confirms them —
 * never fabricate phone numbers, addresses or emergency services.
 */

export type NavChild = { label: string; to: string };
export type NavItem = {
  label: string;
  to: string;
  overviewLabel?: string;
  children?: NavChild[];
};

export const siteConfig = {
  name: "Umanga Nepal",
  tagline: "Every mind deserves to be heard.",
  shortDescription:
    "Umanga Nepal is a registered non-profit, non-governmental organization fostering social wellbeing and mental health awareness across Nepal.",
  establishedNote: "Mental health initiatives since 2020",
  // Fill in only when confirmed by the organization.
  contact: {
    email: "",
    phone: "",
    address: "",
    mapUrl: "",
  },
  social: [
    { label: "Facebook", url: "", platform: "facebook" as const },
    { label: "Instagram", url: "", platform: "instagram" as const },
    { label: "YouTube", url: "", platform: "youtube" as const },
    { label: "LinkedIn", url: "", platform: "linkedin" as const },
  ],
};

export const mainNav: NavItem[] = [
  {
    label: "About Umanga",
    to: "/about",
    overviewLabel: "About Umanga overview",
    children: [
      { label: "Stories", to: "/stories" },
      { label: "Resources", to: "/resources" },
      { label: "News", to: "/news" },
      { label: "Events", to: "/events" },
    ],
  },
  {
    label: "Our Work",
    to: "/our-work",
    overviewLabel: "Explore all programs",
    children: [
      {
        label: "Mental Health Awareness",
        to: "/our-work/mental-health-awareness-sessions",
      },
      { label: "Stress Management", to: "/our-work/stress-management-program" },
      {
        label: "It's Okay Not to Be Okay",
        to: "/our-work/its-okay-not-to-be-okay",
      },
      { label: "Abyakta Katha", to: "/our-work/abyakta-katha" },
      {
        label: "Let's Speak About Mental Health",
        to: "/our-work/lets-speak-about-mental-health",
      },
      { label: "Art Therapy", to: "/our-work/art-therapy" },
      {
        label: "Storytelling & Mental Health",
        to: "/our-work/storytelling-and-mental-health",
      },
      {
        label: "World Mental Health Day",
        to: "/our-work/world-mental-health-day",
      },
    ],
  },
  { label: "Gallery", to: "/gallery" },
  {
    label: "Get Involved",
    to: "/get-involved",
    overviewLabel: "Ways to get involved",
    children: [
      { label: "Volunteer", to: "/volunteer" },
      { label: "Partner With Us", to: "/partner-with-us" },
      { label: "Support Our Work", to: "/support-us" },
      { label: "Invite Umanga", to: "/invite-umanga" },
      { label: "Share Your Story", to: "/share-your-story" },
    ],
  },
  { label: "Contact", to: "/contact" },
];

export const footerNav = {
  explore: [
    { label: "About Umanga", to: "/about" },
    { label: "Our Work", to: "/our-work" },
    { label: "Gallery", to: "/gallery" },
    { label: "Impact", to: "/impact" },
    { label: "Stories", to: "/stories" },
    { label: "Resources", to: "/resources" },
  ],
  involved: [
    { label: "Volunteer", to: "/volunteer" },
    { label: "Partner With Us", to: "/partner-with-us" },
    { label: "Invite Umanga", to: "/invite-umanga" },
    { label: "Support Our Work", to: "/support-us" },
    { label: "Share Your Story", to: "/share-your-story" },
  ],
  connect: [
    { label: "Contact", to: "/contact" },
    { label: "News", to: "/news" },
    { label: "Events", to: "/events" },
  ],
  support: [
    { label: "Get Support", to: "/get-support" },
    {
      label: "Finding Professional Help",
      to: "/resources/when-to-seek-professional-help",
    },
    { label: "Privacy Policy", to: "/privacy" },
    { label: "Terms", to: "/terms" },
  ],
};
