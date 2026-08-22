import type { ImpactMetric, SourcedFact } from "./types";

/**
 * Only figures explicitly supported by organizational data.
 * Do not sum these into a "total lives impacted" — overlap is unconfirmed.
 */
export const impactMetrics: ImpactMetric[] = [
  { value: 12, label: "Mental health awareness sessions" },
  { value: 1600, label: "Awareness participants", note: "Approximate" },
  { value: 500, label: "Stress management participants", note: "Approximate" },
  { value: 6, label: "Abyakta Katha online sessions" },
  { value: 38, label: "Art & wellbeing participants" },
  { value: "Since 2020", label: "Mental health initiatives" },
];

export const objectiveGroups = [
  {
    key: "listen",
    title: "Listen",
    icon: "ear",
    points: [
      "Provide spaces where people feel heard",
      "Encourage people to express difficult experiences",
      "Create supportive community environments",
    ],
  },
  {
    key: "support",
    title: "Support",
    icon: "heart",
    points: [
      "Help individuals cope with life challenges",
      "Provide encouragement and psychosocial support",
      "Encourage appropriate professional help when required",
    ],
  },
  {
    key: "educate",
    title: "Educate",
    icon: "book",
    points: [
      "Increase mental health literacy",
      "Help families understand mental wellbeing",
      "Educate through digital and community platforms",
    ],
  },
  {
    key: "connect",
    title: "Connect",
    icon: "network",
    points: [
      "Coordinate with organizations and support groups",
      "Build collaborative networks",
      "Strengthen community and family support",
    ],
  },
  {
    key: "advocate",
    title: "Advocate",
    icon: "megaphone",
    points: [
      "Reduce stigma",
      "Encourage healthier conversations",
      "Promote mental wellbeing within communities",
    ],
  },
];

export const nepalContext = [
  {
    title: "Stigma can discourage open conversations",
    body: "Many people carry distress quietly because speaking about it still feels risky at home, at school or at work.",
  },
  {
    title: "Geography can affect access to support",
    body: "Where someone lives can shape how easily they reach information, services or someone qualified to help.",
  },
  {
    title: "Families and communities play an important role",
    body: "In Nepal, wellbeing is rarely an individual matter. Families, neighbours and ward-level groups are part of the answer.",
  },
  {
    title: "Youth mental wellbeing deserves attention",
    body: "Academic pressure, migration, and online life shape how young people experience stress and identity.",
  },
  {
    title: "Awareness and education matter",
    body: "Understanding the language of mental health makes it easier to notice difficulty early — in ourselves and others.",
  },
  {
    title: "Referral to appropriate support matters",
    body: "Awareness work is a bridge. Knowing when and where to seek professional help is part of the conversation.",
  },
];

/**
 * Quantitative statistics are only rendered when `verified` is true and a source
 * with a publication year is attached. Placeholders stay unpublished.
 */
export const nepalFacts: SourcedFact[] = [];

export const futureDirection = [
  "Expanding geographic reach",
  "Strengthening community partnerships",
  "Developing evidence-informed programs",
  "Responding to evolving mental-health needs",
  "Expanding public education",
  "Strengthening youth participation",
  "Increasing community-level support",
];
