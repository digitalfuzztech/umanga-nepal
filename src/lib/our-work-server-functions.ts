import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getPublishedOurWorkItemsServerFn = createServerFn({
  method: "GET",
}).handler(async () => {
  try {
    const ourWork = await import("@/server/our-work");
    const items = await ourWork.getPublishedOurWorkItems();
    if (items.filter((item) => item.featured).length > 1) {
      console.warn(
        "[our-work] Multiple published featured programs; using the first in editorial order.",
      );
    }
    return items;
  } catch {
    console.error("[our-work] Public programs could not be loaded.");
    throw new Error(
      "Programs are temporarily unavailable. Please try again later.",
    );
  }
});

export const getPublishedOurWorkItemBySlugServerFn = createServerFn({
  method: "GET",
})
  .validator(z.string())
  .handler(async ({ data }) => {
    try {
      const ourWork = await import("@/server/our-work");
      return await ourWork.getPublishedOurWorkItemBySlug(data);
    } catch {
      console.error("[our-work] Public program could not be loaded.");
      throw new Error(
        "This program is temporarily unavailable. Please try again later.",
      );
    }
  });
