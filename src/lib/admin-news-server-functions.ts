import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { NewsAdminItem } from "@/server/news";

function forAdminUi({ imageStorageKey: _storageKey, ...item }: NewsAdminItem) {
  return item;
}

const idTransport = z.object({ id: z.string() }).strict();
const metadataTransport = z
  .object({
    slug: z.string(),
    title: z.string(),
    excerpt: z.string(),
    content: z.string(),
    category: z.string(),
    location: z.string().nullable().optional(),
    newsDate: z.string(),
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

export const listNewsServerFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const news = await import("@/server/news");
    try {
      return {
        success: true as const,
        items: (await news.getNewsForAdmin()).map(forAdminUi),
      };
    } catch (error) {
      return news.toNewsFailure(error, {
        code: "UNABLE_TO_LOAD",
        message: "Unable to load News.",
      });
    }
  },
);
export const getNewsServerFn = createServerFn({ method: "GET" })
  .validator(idTransport)
  .handler(async ({ data }) => {
    const news = await import("@/server/news");
    try {
      return {
        success: true as const,
        item: await news
          .getNewsById(data.id)
          .then((item) => (item ? forAdminUi(item) : null)),
      };
    } catch (error) {
      return news.toNewsFailure(error, {
        code: "UNABLE_TO_LOAD",
        message: "Unable to load the News.",
      });
    }
  });
export const createNewsServerFn = createServerFn({ method: "POST" })
  .validator(validateFormData)
  .handler(async ({ data }) => {
    const news = await import("@/server/news");
    try {
      await news.requireNewsAdmin();
      const metadata = readMetadata(data);
      if (!metadata)
        throw new news.NewsApplicationError(
          "INVALID_NEWS_DATA",
          "Invalid News data.",
        );
      const file = data.get("image");
      if (!(file instanceof File) || data.getAll("image").length !== 1)
        throw new news.NewsApplicationError("INVALID_IMAGE", "Invalid image.");
      const item = await news.createNews({
        metadata,
        image: await news.newsImageFromFile(file),
      });
      return { success: true as const, item: forAdminUi(item) };
    } catch (error) {
      return news.toNewsFailure(error, {
        code: "SAVE_FAILED",
        message: "Unable to save News.",
      });
    }
  });
export const updateNewsServerFn = createServerFn({ method: "POST" })
  .validator(updateTransport)
  .handler(async ({ data }) => {
    const news = await import("@/server/news");
    try {
      return {
        success: true as const,
        item: forAdminUi(await news.updateNewsMetadata(data)),
      };
    } catch (error) {
      return news.toNewsFailure(error, {
        code: "UPDATE_FAILED",
        message: "Unable to update News.",
      });
    }
  });
export const replaceNewsImageServerFn = createServerFn({ method: "POST" })
  .validator(validateFormData)
  .handler(async ({ data }) => {
    const news = await import("@/server/news");
    try {
      await news.requireNewsAdmin();
      const id = data.get("id");
      if (
        typeof id !== "string" ||
        [...data.keys()].some((key) => key !== "id" && key !== "image") ||
        data.getAll("id").length !== 1
      )
        throw new news.NewsApplicationError(
          "INVALID_NEWS_DATA",
          "Invalid News data.",
        );
      const file = data.get("image");
      if (!(file instanceof File) || data.getAll("image").length !== 1)
        throw new news.NewsApplicationError("INVALID_IMAGE", "Invalid image.");
      const result = await news.replaceNewsImage({
        id,
        image: await news.newsImageFromFile(file),
      });
      return {
        success: true as const,
        item: forAdminUi(result.item),
        cleanupWarning: result.cleanupWarning,
      };
    } catch (error) {
      return news.toNewsFailure(error, {
        code: "UPDATE_FAILED",
        message: "Unable to update News image.",
      });
    }
  });
export const deleteNewsServerFn = createServerFn({ method: "POST" })
  .validator(idTransport)
  .handler(async ({ data }) => {
    const news = await import("@/server/news");
    try {
      return {
        success: true as const,
        ...(await news.deleteNews(data.id)),
      };
    } catch (error) {
      return news.toNewsFailure(error, {
        code: "DELETE_FAILED",
        message: "Unable to delete News.",
      });
    }
  });
