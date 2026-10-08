import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const idTransport = z.object({ id: z.string() }).strict();
const metadataTransport = z
  .object({
    slug: z.string(),
    title: z.string(),
    excerpt: z.string(),
    content: z.string(),
    category: z.string(),
    attribution: z.string(),
    storyDate: z.string().nullable().optional(),
    demoContent: z.boolean().optional().default(false),
    published: z.boolean().optional().default(true),
    sortOrder: z.union([z.number(), z.string(), z.null()]).optional(),
  })
  .strict();
const updateTransport = z
  .object({ id: z.string(), metadata: metadataTransport.partial() })
  .strict();
function validateFormData(input: FormData): FormData {
  if (!(input instanceof FormData)) throw new Error("Invalid form data.");
  return input;
}
function readMetadata(form: FormData) {
  const values: Record<string, unknown> = {};
  for (const [key, value] of form.entries()) {
    if (key === "image") continue;
    if (key in values) return null;
    values[key] = value;
  }
  for (const key of ["demoContent", "published"]) {
    if (values[key] === "true") values[key] = true;
    else if (values[key] === "false") values[key] = false;
  }
  const parsed = metadataTransport.safeParse(values);
  return parsed.success ? parsed.data : null;
}

export const listStoriesServerFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const stories = await import("@/server/stories");
    try {
      return {
        success: true as const,
        items: await stories.getStoriesForAdmin(),
      };
    } catch (error) {
      return stories.toStoryFailure(error, {
        code: "UNABLE_TO_LOAD",
        message: "Unable to load Stories.",
      });
    }
  },
);
export const getStoryServerFn = createServerFn({ method: "GET" })
  .validator(idTransport)
  .handler(async ({ data }) => {
    const stories = await import("@/server/stories");
    try {
      return {
        success: true as const,
        item: await stories.getStoryById(data.id),
      };
    } catch (error) {
      return stories.toStoryFailure(error, {
        code: "UNABLE_TO_LOAD",
        message: "Unable to load the Story.",
      });
    }
  });
export const createStoryServerFn = createServerFn({ method: "POST" })
  .validator(validateFormData)
  .handler(async ({ data }) => {
    const stories = await import("@/server/stories");
    try {
      await stories.requireStoryAdmin();
      const metadata = readMetadata(data);
      if (!metadata)
        throw new stories.StoryApplicationError(
          "INVALID_STORY_DATA",
          "Invalid Story data.",
        );
      const file = data.get("image");
      if (!(file instanceof File) || data.getAll("image").length !== 1)
        throw new stories.StoryApplicationError(
          "INVALID_IMAGE",
          "Invalid image.",
        );
      const item = await stories.createStory({
        metadata,
        image: await stories.storyImageFromFile(file),
      });
      return { success: true as const, item };
    } catch (error) {
      return stories.toStoryFailure(error, {
        code: "SAVE_FAILED",
        message: "Unable to save Story.",
      });
    }
  });
export const updateStoryServerFn = createServerFn({ method: "POST" })
  .validator(updateTransport)
  .handler(async ({ data }) => {
    const stories = await import("@/server/stories");
    try {
      return {
        success: true as const,
        item: await stories.updateStoryMetadata(data),
      };
    } catch (error) {
      return stories.toStoryFailure(error, {
        code: "UPDATE_FAILED",
        message: "Unable to update Story.",
      });
    }
  });
export const replaceStoryImageServerFn = createServerFn({ method: "POST" })
  .validator(validateFormData)
  .handler(async ({ data }) => {
    const stories = await import("@/server/stories");
    try {
      await stories.requireStoryAdmin();
      const id = data.get("id");
      if (
        typeof id !== "string" ||
        [...data.keys()].some((key) => key !== "id" && key !== "image") ||
        data.getAll("id").length !== 1
      )
        throw new stories.StoryApplicationError(
          "INVALID_STORY_DATA",
          "Invalid Story data.",
        );
      const file = data.get("image");
      if (!(file instanceof File) || data.getAll("image").length !== 1)
        throw new stories.StoryApplicationError(
          "INVALID_IMAGE",
          "Invalid image.",
        );
      return {
        success: true as const,
        ...(await stories.replaceStoryImage({
          id,
          image: await stories.storyImageFromFile(file),
        })),
      };
    } catch (error) {
      return stories.toStoryFailure(error, {
        code: "UPDATE_FAILED",
        message: "Unable to update Story image.",
      });
    }
  });
export const deleteStoryServerFn = createServerFn({ method: "POST" })
  .validator(idTransport)
  .handler(async ({ data }) => {
    const stories = await import("@/server/stories");
    try {
      return {
        success: true as const,
        ...(await stories.deleteStory(data.id)),
      };
    } catch (error) {
      return stories.toStoryFailure(error, {
        code: "DELETE_FAILED",
        message: "Unable to delete Story.",
      });
    }
  });
