import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getPublishedNewsServerFn = createServerFn({
  method: "GET",
}).handler(async () => {
  try {
    const news = await import("@/server/news");
    return await news.getPublishedNews();
  } catch {
    console.error("[news] Public news could not be loaded.");
    throw new Error(
      "News are temporarily unavailable. Please try again later.",
    );
  }
});

export const getPublishedNewsBySlugServerFn = createServerFn({ method: "GET" })
  .validator(z.string())
  .handler(async ({ data }) => {
    try {
      const news = await import("@/server/news");
      return await news.getPublishedNewsBySlug(data);
    } catch {
      console.error("[news] Public news could not be loaded.");
      throw new Error(
        "This news is temporarily unavailable. Please try again later.",
      );
    }
  });
