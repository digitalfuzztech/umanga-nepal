import type { Resource } from "@/data/types";

type ResourceContent = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  type: "article" | "guide";
  readingTime: number | null;
  publishedAt: string | null;
  reviewedAt: string | null;
};

// Preserve the existing card/article presentation without static runtime data.
export function resourceView(item: ResourceContent): Resource {
  return {
    id: item.id,
    slug: item.slug,
    title: item.title,
    excerpt: item.excerpt,
    category: item.category,
    type: item.type,
    body: item.content.split("\n\n"),
    ...(item.readingTime !== null ? { readingTime: item.readingTime } : {}),
    ...(item.publishedAt !== null ? { publishedAt: item.publishedAt } : {}),
    ...(item.reviewedAt !== null ? { reviewedAt: item.reviewedAt } : {}),
  };
}
