import type { PublishedStory } from "@/server/stories";

export type PublicStory = PublishedStory;

export function getStoryParagraphs(content: string) {
  return content
    .split(/\r?\n(?:[\t ]*\r?\n)+/)
    .filter((paragraph) => paragraph.trim().length > 0);
}
