import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getPublishedStoriesServerFn = createServerFn({
  method: "GET",
}).handler(async () => {
  try {
    const stories = await import("@/server/stories");
    return await stories.getPublishedStories();
  } catch {
    console.error("[stories] Public stories could not be loaded.");
    throw new Error(
      "Stories are temporarily unavailable. Please try again later.",
    );
  }
});

export const getPublishedStoryBySlugServerFn = createServerFn({ method: "GET" })
  .validator(z.string())
  .handler(async ({ data }) => {
    try {
      const stories = await import("@/server/stories");
      return await stories.getPublishedStoryBySlug(data);
    } catch {
      console.error("[stories] Public story could not be loaded.");
      throw new Error(
        "This story is temporarily unavailable. Please try again later.",
      );
    }
  });
