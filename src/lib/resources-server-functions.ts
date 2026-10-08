import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { PublishedResource } from "@/server/resources";

function publicResource(item: PublishedResource) {
  const { createdAt: _createdAt, sortOrder: _sortOrder, ...editorial } = item;
  return editorial;
}

export const getPublishedResourcesServerFn = createServerFn({
  method: "GET",
}).handler(async () => {
  try {
    const resources = await import("@/server/resources");
    return (await resources.getPublishedResources()).map(publicResource);
  } catch {
    throw new Error(
      "Resources are temporarily unavailable. Please try again later.",
    );
  }
});
export const getPublishedResourceBySlugServerFn = createServerFn({
  method: "GET",
})
  .validator(z.string())
  .handler(async ({ data }) => {
    try {
      const resources = await import("@/server/resources");
      const item = await resources.getPublishedResourceBySlug(data);
      return item ? publicResource(item) : null;
    } catch {
      throw new Error(
        "This Resource is temporarily unavailable. Please try again later.",
      );
    }
  });
