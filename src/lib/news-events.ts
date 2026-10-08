import type { PublishedNews } from "@/server/news";
import type { PublishedEvent } from "@/server/events";

export type PublicNews = PublishedNews;
export type PublicEvent = PublishedEvent;

export function getNewsParagraphs(content: string) {
  return content
    .split(/\r?\n(?:[\t ]*\r?\n)+/)
    .filter((paragraph) => paragraph.trim().length > 0);
}
