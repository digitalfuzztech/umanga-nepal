import awareness from "@/assets/program-awareness.jpg";
import stress from "@/assets/program-stress.jpg";
import okay from "@/assets/program-okay.jpg";
import online from "@/assets/program-online.jpg";
import art from "@/assets/program-art.jpg";
import storytelling from "@/assets/program-storytelling.jpg";
import wmhd from "@/assets/program-wmhd.jpg";
import type { Program } from "./types";

export const programs: Program[] = [
  {
    id: "p1",
    slug: "mental-health-awareness-sessions",
    title: "Mental Health Awareness Sessions",
    category: "Awareness & Education",
    shortDescription:
      "Community and school sessions that make mental wellbeing easier to understand, talk about and act on.",
    description:
      "Umanga Nepal has conducted 12 mental health awareness sessions reaching approximately 1,600 participants. Sessions are facilitated in accessible Nepali language and adapted to the community hosting them, from schools and colleges to ward-level community groups.",
    topics: [
      "Mental wellbeing",
      "Common mental health challenges",
      "Seeking support",
      "Self-esteem",
      "Confidence",
      "Stigma reduction",
      "Community understanding",
    ],
    tags: ["Community", "Schools", "Awareness"],
    heroImage: awareness,
    metrics: [
      { value: 12, label: "Awareness sessions" },
      { value: 1600, label: "Participants reached", note: "Approximate" },
    ],
  },
  {
    id: "p2",
    slug: "stress-management-program",
    title: "Stress Management Program",
    category: "Skills & Coping",
    shortDescription:
      "Practical, experiential workshops that help people recognise stress and build everyday coping skills.",
    description:
      "Approximately 500 participants have taken part in Umanga Nepal's stress management program. Sessions are experiential rather than lecture-based, giving participants space to practise coping approaches they can carry into study, work and family life.",
    topics: [
      "Understanding stress",
      "Identifying triggers",
      "Emotional regulation",
      "Coping strategies",
      "Resilience",
      "Experiential learning",
    ],
    tags: ["Workshops", "Coping", "Youth"],
    heroImage: stress,
    metrics: [{ value: 500, label: "Participants", note: "Approximate" }],
  },
  {
    id: "p3",
    slug: "its-okay-not-to-be-okay",
    title: "It's Okay Not to Be Okay",
    category: "Youth & Adolescents",
    shortDescription:
      "Facilitated conversations with adolescents that challenge the pressure to always appear strong.",
    description:
      "This initiative challenges the pressure to always appear strong. Through facilitated conversations and peer engagement, adolescents are encouraged to acknowledge difficult experiences without shame and recognise that vulnerability can be the beginning of connection and healing.",
    topics: [
      "Adolescents",
      "Vulnerability",
      "Safe conversation",
      "Peer engagement",
      "Reducing shame",
      "Emotional validation",
    ],
    tags: ["Adolescents", "Peer support", "Conversation"],
    heroImage: okay,
    featured: true,
    note: "A peer conversation and awareness initiative. It is not clinical therapy or treatment.",
  },
  {
    id: "p4",
    slug: "abyakta-katha",
    title: "Abyakta Katha",
    category: "Online Sessions",
    shortDescription:
      "Six structured online sessions on self-improvement, digital life and expressing distress.",
    description:
      "Abyakta Katha — the unspoken story — is a series of six structured online sessions created so participants across Nepal can join wherever they are. Each session opens a theme, then makes room for reflection and shared experience.",
    topics: [
      "Self-Improvement — personal growth, goals and positive self-concept",
      "Social Media and Mental Health — digital environments, comparison, online identity and wellbeing",
      "Express Your Distress — recognising, articulating and safely communicating emotional distress",
    ],
    tags: ["Online", "Series", "Reflection"],
    heroImage: online,
    metrics: [{ value: 6, label: "Online sessions" }],
  },
  {
    id: "p5",
    slug: "lets-speak-about-mental-health",
    title: "Let's Speak About Mental Health",
    category: "Multimedia Series",
    shortDescription:
      "A multimedia awareness series encouraging honest and compassionate conversations across Nepal.",
    description:
      "A multimedia public awareness series built around lived experience, honest conversation and compassion. Episodes travel further than a single hall can — reaching people who are not yet ready to speak, but are ready to listen.",
    topics: [
      "Lived experiences",
      "Honest conversation",
      "Compassion",
      "Digital awareness",
      "Community voices",
    ],
    tags: ["Video", "Audio", "Campaign"],
    heroImage: storytelling,
  },
  {
    id: "p6",
    slug: "art-therapy",
    title: "Art Therapy",
    category: "Creative Wellbeing",
    shortDescription:
      "A creative art and wellbeing program encouraging expression, reflection and self-awareness.",
    description:
      "Known within the organization as Art Therapy, this is a creative art and wellbeing program in which 38 participants have used drawing, colour and making as a way to express what words do not always reach. Facilitators encourage expression and self-awareness in a supportive group setting.",
    topics: ["Creative expression", "Self-awareness", "Group facilitation", "Reflection"],
    tags: ["Creative", "Expression", "Groups"],
    heroImage: art,
    metrics: [{ value: 38, label: "Participants" }],
    note: "Described as a creative art and wellbeing program. Umanga Nepal does not present this as clinical art psychotherapy.",
  },
  {
    id: "p7",
    slug: "storytelling-and-mental-health",
    title: "Storytelling and Mental Health",
    category: "Community Voice",
    shortDescription:
      "Personal narratives shared with care, so people feel heard and less alone in what they carry.",
    description:
      "Storytelling sessions invite people to share personal narratives in a facilitated, consent-first setting. The purpose is connection: hearing a familiar experience in someone else's voice often does more than advice ever could.",
    topics: [
      "Personal narratives",
      "Connection",
      "Feeling heard",
      "Shared experiences",
      "Community solidarity",
    ],
    tags: ["Storytelling", "Community", "Connection"],
    heroImage: storytelling,
  },
  {
    id: "p8",
    slug: "world-mental-health-day",
    title: "World Mental Health Day",
    category: "Campaigns",
    shortDescription:
      "Annual community programs and advocacy activities marked around 10 October each year.",
    description:
      "Every year around 10 October, Umanga Nepal marks World Mental Health Day with community activities, awareness campaigns, interactive sessions and collaboration with partner organizations and volunteers.",
    topics: [
      "Community activities",
      "Awareness campaigns",
      "Interactive sessions",
      "Collaboration",
      "Advocacy",
    ],
    tags: ["Campaign", "Advocacy", "Annual"],
    heroImage: wmhd,
  },
];

export const getProgram = (slug: string) => programs.find((p) => p.slug === slug);
