import { createServerFn } from "@tanstack/react-start";

export const getPublishedGalleryItemsServerFn = createServerFn({
  method: "GET",
}).handler(async () => {
  const gallery = await import("@/server/gallery");

  try {
    return await gallery.getPublishedGalleryItems();
  } catch {
    console.error("[gallery] Public Gallery listing could not be loaded.");
    throw new Error(
      "Gallery is temporarily unavailable. Please try again later.",
    );
  }
});
