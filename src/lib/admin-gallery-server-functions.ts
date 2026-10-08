import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const galleryIdTransportSchema = z.object({ id: z.string() }).strict();

const galleryMetadataTransportSchema = z
  .object({
    title: z.string(),
    caption: z.string().nullable().optional(),
    published: z.boolean(),
    sortOrder: z.union([z.number(), z.string(), z.null()]).optional(),
    category: z.string().nullable().optional(),
    contextName: z.string().nullable().optional(),
    albumId: z.string().nullable().optional(),
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
    category:
      typeof formData.get("category") === "string"
        ? String(formData.get("category")) || null
        : null,
    contextName:
      typeof formData.get("contextName") === "string"
        ? String(formData.get("contextName")) || null
        : null,
    albumId:
      typeof formData.get("albumId") === "string"
        ? String(formData.get("albumId")) || null
        : null,
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
    const albums = await gallery.getGalleryAlbumsForAdmin();
    return {
      success: true as const,
      items: items.map(({ imageStorageKey: _key, ...item }) => item),
      albums,
    };
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
      if (!item) return { success: true as const, item: null };
      const { imageStorageKey: _key, ...safeItem } = item;
      return { success: true as const, item: safeItem };
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
      const { imageStorageKey: _key, ...safeItem } = item;
      return { success: true as const, item: safeItem };
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
      const { imageStorageKey: _key, ...safeItem } = item;
      return { success: true as const, item: safeItem };
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
      const { imageStorageKey: _key, ...safeItem } = result.item;
      return {
        success: true as const,
        item: safeItem,
        cleanupWarning: result.cleanupWarning,
      };
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

export const createGalleryAlbumServerFn = createServerFn({ method: "POST" })
  .validator(validateFormData)
  .handler(async ({ data }) => {
    const gallery = await import("@/server/gallery");
    try {
      const { getCurrentAdmin } = await import("@/server/auth");
      if (!(await getCurrentAdmin()))
        throw new gallery.GalleryApplicationError(
          "UNAUTHORIZED",
          "Unauthorized.",
        );
      const files = data.getAll("images");
      if (
        !files.length ||
        files.length > 25 ||
        files.some(
          (file) => !(file instanceof File) || file.size > 8 * 1024 * 1024,
        )
      )
        throw new gallery.GalleryApplicationError(
          "INVALID_DATA",
          "Select 1–25 photos, each no larger than 8 MB.",
        );
      const base = readMetadata(data);
      if (!base)
        throw new gallery.GalleryApplicationError(
          "INVALID_DATA",
          "Invalid album details.",
        );
      const { albumId: _album, ...metadata } = base;
      const result = await gallery.createGalleryAlbum({
        metadata: {
          ...metadata,
          category: metadata.category ?? "Other",
          name: String(data.get("name") ?? ""),
        },
        images: await Promise.all(
          (files as File[]).map(async (file) => ({
            buffer: Buffer.from(await file.arrayBuffer()),
            mimeType: file.type,
          })),
        ),
      });
      return { success: true as const, ...result };
    } catch (error) {
      return gallery.toGalleryFailure(error, {
        code: "UNABLE_TO_SAVE",
        message: "Album could not be saved.",
      });
    }
  });

export const deleteGalleryAlbumServerFn = createServerFn({ method: "POST" })
  .validator(galleryIdTransportSchema)
  .handler(async ({ data }) => {
    const gallery = await import("@/server/gallery");
    try {
      return {
        success: true as const,
        ...(await gallery.deleteGalleryAlbum(data.id)),
      };
    } catch (error) {
      return gallery.toGalleryFailure(error, {
        code: "UNABLE_TO_DELETE",
        message: "Album could not be deleted.",
      });
    }
  });
