import type { Partner, Testimonial } from "./types";

export const testimonials: Testimonial[] = [
  {
    id: "t1",
    quote:
      "Sessions of “It's Okay Not to Be Okay” were energetic, interactive, and completely free of stigma. We discussed anxiety, social media pressure, and peer support in ways that felt real to us. I walked out feeling understood — and equipped.",
    attribution: "Program Participant",
    program: "It's Okay Not to Be Okay",
    anonymous: true,
  },
  {
    id: "t2",
    quote:
      "In our village, talking about mental health was taboo. Umanga Nepal came to our community and spoke in Nepali, in our own idioms, with full respect for our culture. Now our whole ward committee talks openly about stress and wellbeing.",
    attribution: "Community Member",
    program: "Mental Health Awareness Sessions",
    anonymous: true,
  },
  {
    id: "t3",
    quote:
      "The youth session was energetic, interactive, and completely free of stigma. We discussed anxiety, social media pressure, and peer support in ways that felt real to us. I walked out feeling understood — and equipped.",
    attribution: "Youth Participant",
    anonymous: true,
  },
];

export const partners: Partner[] = [
  {
    id: "pa1",
    name: "Hamro Palo, Our Turn",
    description:
      "Collaborating partner on community mental health awareness initiatives and campaigns.",
  },
  {
    id: "pa2",
    name: "Sky Is The Limit",
    description:
      "Collaborating partner on youth-focused awareness and engagement activities.",
    nameNeedsConfirmation: true,
  },
];
