import { createServerFn } from "@tanstack/react-start";
import { galleryQuerySchema } from "@/lib/gallery-query";

export const getPublishedGalleryItemsServerFn = createServerFn({
  method: "GET",
})
  .validator(galleryQuerySchema)
  .handler(async ({ data }) => {
    const gallery = await import("@/server/gallery");

    try {
      return await gallery.getPublishedGalleryPage(data);
    } catch {
      console.error("[gallery] Public Gallery listing could not be loaded.");
      throw new Error(
        "Gallery is temporarily unavailable. Please try again later.",
      );
    }
  });
