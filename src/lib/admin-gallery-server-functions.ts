import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const galleryIdTransportSchema = z.object({ id: z.string() }).strict();

const galleryMetadataTransportSchema = z
  .object({
    title: z.string(),
    caption: z.string().nullable().optional(),
    published: z.boolean(),
    sortOrder: z.union([z.number(), z.string(), z.null()]).optional(),
  })
  .strict();

const updateGalleryTransportSchema = z
  .object({
    id: z.string(),
    metadata: galleryMetadataTransportSchema,
  })
  .strict();

function validateFormData(input: FormData): FormData {
  if (!(input instanceof FormData)) {
    throw new Error("Invalid form data.");
  }
  return input;
}

function readMetadata(formData: FormData) {
  const title = formData.get("title");
  const caption = formData.get("caption");
  const published = formData.get("published");
  const sortOrder = formData.get("sortOrder");

  if (
    typeof title !== "string" ||
    (caption !== null && typeof caption !== "string") ||
    (sortOrder !== null && typeof sortOrder !== "string") ||
    (published !== "true" && published !== "false")
  ) {
    return null;
  }

  return {
    title,
    caption: caption ?? null,
    published: published === "true",
    sortOrder: sortOrder ?? null,
  };
}

function readImage(formData: FormData): File | null {
  const image = formData.get("image");
  return image instanceof File ? image : null;
}

export const listGalleryItemsServerFn = createServerFn({
  method: "GET",
}).handler(async () => {
  const gallery = await import("@/server/gallery");

  try {
    const items = await gallery.getGalleryItemsForAdmin();
    return { success: true as const, items };
  } catch (error) {
    return gallery.toGalleryFailure(error, {
      code: "UNABLE_TO_LOAD",
      message: "Unable to load gallery items.",
    });
  }
});

export const getGalleryItemServerFn = createServerFn({ method: "GET" })
  .validator(galleryIdTransportSchema)
  .handler(async ({ data }) => {
    const gallery = await import("@/server/gallery");

    try {
      const item = await gallery.getGalleryItemById(data.id);
      return { success: true as const, item };
    } catch (error) {
      return gallery.toGalleryFailure(error, {
        code: "UNABLE_TO_LOAD",
        message: "Unable to load the gallery item.",
      });
    }
  });

export const createGalleryItemServerFn = createServerFn({ method: "POST" })
  .validator(validateFormData)
  .handler(async ({ data }) => {
    const gallery = await import("@/server/gallery");
    const metadata = readMetadata(data);
    const image = readImage(data);

    if (!metadata || !image) {
      return {
        success: false as const,
        code: !image ? ("INVALID_IMAGE" as const) : ("INVALID_DATA" as const),
        error: !image ? "Invalid image." : "Invalid gallery data.",
      };
    }

    try {
      const item = await gallery.createGalleryItem({
        metadata,
        image: {
          buffer: Buffer.from(await image.arrayBuffer()),
          mimeType: image.type,
        },
      });
      return { success: true as const, item };
    } catch (error) {
      return gallery.toGalleryFailure(error, {
        code: "UNABLE_TO_SAVE",
        message: "Unable to save gallery item.",
      });
    }
  });

export const updateGalleryItemServerFn = createServerFn({ method: "POST" })
  .validator(updateGalleryTransportSchema)
  .handler(async ({ data }) => {
    const gallery = await import("@/server/gallery");

    try {
      const item = await gallery.updateGalleryItemMetadata(data);
      return { success: true as const, item };
    } catch (error) {
      return gallery.toGalleryFailure(error, {
        code: "UNABLE_TO_UPDATE",
        message: "Unable to update gallery item.",
      });
    }
  });

export const replaceGalleryImageServerFn = createServerFn({ method: "POST" })
  .validator(validateFormData)
  .handler(async ({ data }) => {
    const gallery = await import("@/server/gallery");
    const id = data.get("id");
    const image = readImage(data);

    if (typeof id !== "string" || !image) {
      return {
        success: false as const,
        code: !image ? ("INVALID_IMAGE" as const) : ("INVALID_DATA" as const),
        error: !image ? "Invalid image." : "Invalid gallery data.",
      };
    }

    try {
      const result = await gallery.replaceGalleryItemImage({
        id,
        image: {
          buffer: Buffer.from(await image.arrayBuffer()),
          mimeType: image.type,
        },
      });
      return { success: true as const, ...result };
    } catch (error) {
      return gallery.toGalleryFailure(error, {
        code: "UNABLE_TO_UPDATE",
        message: "Unable to update gallery item.",
      });
    }
  });

export const deleteGalleryItemServerFn = createServerFn({ method: "POST" })
  .validator(galleryIdTransportSchema)
  .handler(async ({ data }) => {
    const gallery = await import("@/server/gallery");

    try {
      const result = await gallery.deleteGalleryItem(data.id);
      return { success: true as const, ...result };
    } catch (error) {
      return gallery.toGalleryFailure(error, {
        code: "UNABLE_TO_DELETE",
        message: "Unable to delete gallery item.",
      });
    }
  });
