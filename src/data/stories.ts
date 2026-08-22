import hero from "@/assets/hero-community.jpg";
import awareness from "@/assets/program-awareness.jpg";
import art from "@/assets/program-art.jpg";
import storytelling from "@/assets/program-storytelling.jpg";
import okay from "@/assets/program-okay.jpg";
import type { Story } from "./types";

/**
 * All stories below are clearly-marked demo content written for layout purposes.
 * Replace with consented, verified community stories before publishing.
 */
export const stories: Story[] = [
  {
    id: "s1",
    slug: "a-classroom-that-learned-to-listen",
    title: "A classroom that learned to listen",
    excerpt:
      "What changes in a school when students are given permission to describe a difficult week honestly.",
    category: "Program Experience",
    image: okay,
    date: "2025-05-12",
    attribution: "Umanga Nepal",
    demoContent: true,
    body: [
      "Demo content: this narrative illustrates the shape of a program story and does not describe an identified individual.",
      "In a session run under It's Okay Not to Be Okay, facilitators asked a simple question: what does a hard week look like for you? The first answers were short. The tenth was not.",
      "By the end, students were describing exam pressure, family expectation and the loneliness of pretending to be fine — and hearing their own experience echoed back by classmates.",
    ],
  },
  {
    id: "s2",
    slug: "a-ward-committee-changes-the-conversation",
    title: "A ward committee changes the conversation",
    excerpt:
      "How a community awareness session in Nepali idiom shifted what a local committee felt able to discuss.",
    category: "Community Story",
    image: hero,
    date: "2025-04-08",
    attribution: "Umanga Nepal",
    demoContent: true,
    body: [
      "Demo content: written to illustrate community story formatting.",
      "Awareness work travels furthest when it is spoken in the language and idiom of the people in the room.",
      "After a session, committee members began raising wellbeing alongside water, roads and schooling in their regular meetings.",
    ],
  },
  {
    id: "s3",
    slug: "what-volunteers-carry-home",
    title: "What volunteers carry home",
    excerpt: "Volunteers describe what facilitating awareness sessions taught them about listening.",
    category: "Volunteer Story",
    image: awareness,
    date: "2025-03-19",
    attribution: "Umanga Nepal",
    demoContent: true,
    body: [
      "Demo content: illustrative volunteer reflection.",
      "Volunteers often arrive wanting to explain and leave having learned to wait.",
      "Facilitation training with Umanga Nepal focuses on listening, boundaries and knowing when to refer someone onward.",
    ],
  },
  {
    id: "s4",
    slug: "colour-before-words",
    title: "Colour before words",
    excerpt:
      "In a creative wellbeing session, a page of colour said what a paragraph could not.",
    category: "Youth Voices",
    image: art,
    date: "2025-02-27",
    attribution: "Umanga Nepal",
    demoContent: true,
    body: [
      "Demo content: illustrative creative program story.",
      "Participants are not asked to produce art. They are asked to make marks and notice what happens.",
      "Many describe the session as the first time in months they were not required to explain themselves.",
    ],
  },
  {
    id: "s5",
    slug: "the-unspoken-story",
    title: "The unspoken story",
    excerpt: "Abyakta Katha brought participants together online from across the country.",
    category: "Program Experience",
    image: storytelling,
    date: "2025-01-15",
    attribution: "Umanga Nepal",
    demoContent: true,
    body: [
      "Demo content: illustrative online series story.",
      "Six sessions, one theme at a time, with room afterwards for whoever wanted to speak.",
      "Distance stopped being the obstacle it had been for community-based programs.",
    ],
  },
];

export const getStory = (slug: string) => stories.find((s) => s.slug === slug);
