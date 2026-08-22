import wmhd from "@/assets/program-wmhd.jpg";
import awareness from "@/assets/program-awareness.jpg";
import online from "@/assets/program-online.jpg";
import type { EventItem, NewsItem } from "./types";

/** Demo content for layout. Replace with confirmed organizational updates. */
export const news: NewsItem[] = [
  {
    id: "n1",
    slug: "world-mental-health-day-community-program",
    title: "World Mental Health Day community program",
    excerpt:
      "Volunteers, partners and community members gathered for a day of conversation, creative activity and advocacy.",
    category: "Campaign",
    date: "2025-10-10",
    image: wmhd,
    location: "Kathmandu",
    demoContent: true,
    body: [
      "Demo content prepared for layout purposes.",
      "Each year around 10 October, Umanga Nepal marks World Mental Health Day with community activities and awareness campaigns.",
      "The program brought together volunteers, partner organizations and community members for interactive sessions and advocacy.",
    ],
  },
  {
    id: "n2",
    slug: "awareness-sessions-reach-new-communities",
    title: "Awareness sessions reach new communities",
    excerpt:
      "Umanga Nepal's awareness program continued into additional schools and ward-level community groups.",
    category: "Programs",
    date: "2025-08-21",
    image: awareness,
    location: "Nepal",
    demoContent: true,
    body: [
      "Demo content prepared for layout purposes.",
      "Sessions cover mental wellbeing, common challenges, self-esteem and how to seek appropriate support.",
    ],
  },
  {
    id: "n3",
    slug: "abyakta-katha-online-series-concludes",
    title: "Abyakta Katha online series concludes",
    excerpt:
      "Six structured online sessions closed with a conversation on expressing distress safely.",
    category: "Programs",
    date: "2025-06-30",
    image: online,
    location: "Online",
    demoContent: true,
    body: [
      "Demo content prepared for layout purposes.",
      "The series covered self-improvement, social media and mental health, and expressing distress.",
    ],
  },
];

export const events: EventItem[] = [
  {
    id: "e1",
    slug: "community-awareness-session",
    title: "Community mental health awareness session",
    summary:
      "An open session covering mental wellbeing, stigma and how to support someone who is struggling.",
    date: "2026-09-18",
    location: "To be announced",
    category: "Awareness Session",
    status: "upcoming",
    demoContent: true,
  },
  {
    id: "e2",
    slug: "stress-management-workshop",
    title: "Stress management workshop",
    summary: "A practical, experiential workshop on triggers, regulation and coping strategies.",
    date: "2026-10-02",
    location: "To be announced",
    category: "Workshop",
    status: "registration-open",
    demoContent: true,
  },
  {
    id: "e3",
    slug: "world-mental-health-day-2026",
    title: "World Mental Health Day 2026",
    summary: "Community activities, creative sessions and advocacy with partner organizations.",
    date: "2026-10-10",
    location: "To be announced",
    category: "Campaign",
    status: "upcoming",
    demoContent: true,
  },
];

export const getNews = (slug: string) => news.find((n) => n.slug === slug);
