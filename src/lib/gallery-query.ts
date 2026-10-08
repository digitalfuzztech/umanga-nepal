import { z } from "zod";

export const GALLERY_PAGE_SIZE = 25;
export const galleryQuerySchema = z
  .object({
    page: z.number().int().min(1).max(100000).default(1),
    q: z.string().trim().max(200).default(""),
    category: z.string().trim().max(100).default(""),
    album: z.union([z.string().uuid(), z.literal("")]).default(""),
  })
  .strict();
export type GalleryQuery = z.infer<typeof galleryQuerySchema>;
export function gallerySearchParams(
  input: Record<string, unknown>,
): GalleryQuery {
  return galleryQuerySchema.parse({
    page: Number(input["page"]) || 1,
    q: input["q"] ?? "",
    category: input["category"] ?? "",
    album: input["album"] ?? "",
  });
}
