import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ourWorkIdTransportSchema = z.object({ id: z.string() }).strict();

const nullableIntegerTransportSchema = z
  .union([z.number(), z.string(), z.null()])
  .optional();

const ourWorkMetadataTransportSchema = z
  .object({
    slug: z.string(),
    type: z.string(),
    title: z.string(),
    description: z.string(),
    tags: z.array(z.string()),
    aboutProgram: z.string().nullable().optional(),
    whatWeCover: z.array(z.string()),
    awarenessSessionCount: nullableIntegerTransportSchema,
    participantCount: nullableIntegerTransportSchema,
    published: z.boolean(),
    sortOrder: nullableIntegerTransportSchema,
  })
  .strict();

const updateOurWorkTransportSchema = z
  .object({
    id: z.string(),
    metadata: ourWorkMetadataTransportSchema,
  })
  .strict();

function validateFormData(input: FormData): FormData {
  if (!(input instanceof FormData)) {
    throw new Error("Invalid form data.");
  }
  return input;
}

function parseStringArray(value: FormDataEntryValue | null): unknown[] | null {
  if (typeof value !== "string") return null;

  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function readMetadata(formData: FormData) {
  const slug = formData.get("slug");
  const type = formData.get("type");
  const title = formData.get("title");
  const description = formData.get("description");
  const tags = parseStringArray(formData.get("tags"));
  const aboutProgram = formData.get("aboutProgram");
  const whatWeCover = parseStringArray(formData.get("whatWeCover"));
  const awarenessSessionCount = formData.get("awarenessSessionCount");
  const participantCount = formData.get("participantCount");
  const published = formData.get("published");
  const sortOrder = formData.get("sortOrder");

  if (
    typeof slug !== "string" ||
    typeof type !== "string" ||
    typeof title !== "string" ||
    typeof description !== "string" ||
    tags === null ||
    (aboutProgram !== null && typeof aboutProgram !== "string") ||
    whatWeCover === null ||
    (awarenessSessionCount !== null &&
      typeof awarenessSessionCount !== "string") ||
    (participantCount !== null && typeof participantCount !== "string") ||
    (sortOrder !== null && typeof sortOrder !== "string") ||
    (published !== "true" && published !== "false")
  ) {
    return null;
  }

  return {
    slug,
    type,
    title,
    description,
    tags,
    aboutProgram: aboutProgram ?? null,
    whatWeCover,
    awarenessSessionCount: awarenessSessionCount ?? null,
    participantCount: participantCount ?? null,
    published: published === "true",
    sortOrder: sortOrder ?? null,
  };
}

function readImage(formData: FormData): File | null {
  const image = formData.get("image");
  return image instanceof File ? image : null;
}

export const listOurWorkItemsServerFn = createServerFn({
  method: "GET",
}).handler(async () => {
  const ourWork = await import("@/server/our-work");

  try {
    const items = await ourWork.getOurWorkItemsForAdmin();
    return { success: true as const, items };
  } catch (error) {
    return ourWork.toOurWorkFailure(error, {
      code: "UNABLE_TO_LOAD",
      message: "Unable to load Our Work items.",
    });
  }
});

export const getOurWorkItemServerFn = createServerFn({ method: "GET" })
  .validator(ourWorkIdTransportSchema)
  .handler(async ({ data }) => {
    const ourWork = await import("@/server/our-work");

    try {
      const item = await ourWork.getOurWorkItemById(data.id);
      return { success: true as const, item };
    } catch (error) {
      return ourWork.toOurWorkFailure(error, {
        code: "UNABLE_TO_LOAD",
        message: "Unable to load the Our Work item.",
      });
    }
  });

export const createOurWorkItemServerFn = createServerFn({ method: "POST" })
  .validator(validateFormData)
  .handler(async ({ data }) => {
    const ourWork = await import("@/server/our-work");
    const metadata = readMetadata(data);
    const image = readImage(data);

    if (!metadata || !image) {
      return {
        success: false as const,
        code: !image
          ? ("INVALID_IMAGE" as const)
          : ("INVALID_OUR_WORK_DATA" as const),
        error: !image ? "Invalid image." : "Invalid Our Work data.",
      };
    }

    try {
      const item = await ourWork.createOurWorkItem({
        metadata,
        image: {
          buffer: Buffer.from(await image.arrayBuffer()),
          mimeType: image.type,
        },
      });
      return { success: true as const, item };
    } catch (error) {
      return ourWork.toOurWorkFailure(error, {
        code: "SAVE_FAILED",
        message: "Unable to save Our Work item.",
      });
    }
  });

export const updateOurWorkItemServerFn = createServerFn({ method: "POST" })
  .validator(updateOurWorkTransportSchema)
  .handler(async ({ data }) => {
    const ourWork = await import("@/server/our-work");

    try {
      const item = await ourWork.updateOurWorkItemMetadata(data);
      return { success: true as const, item };
    } catch (error) {
      return ourWork.toOurWorkFailure(error, {
        code: "UPDATE_FAILED",
        message: "Unable to update Our Work item.",
      });
    }
  });

export const replaceOurWorkImageServerFn = createServerFn({ method: "POST" })
  .validator(validateFormData)
  .handler(async ({ data }) => {
    const ourWork = await import("@/server/our-work");
    const id = data.get("id");
    const image = readImage(data);

    if (typeof id !== "string" || !image) {
      return {
        success: false as const,
        code: !image
          ? ("INVALID_IMAGE" as const)
          : ("INVALID_OUR_WORK_DATA" as const),
        error: !image ? "Invalid image." : "Invalid Our Work data.",
      };
    }

    try {
      const result = await ourWork.replaceOurWorkItemImage({
        id,
        image: {
          buffer: Buffer.from(await image.arrayBuffer()),
          mimeType: image.type,
        },
      });
      return { success: true as const, ...result };
    } catch (error) {
      return ourWork.toOurWorkFailure(error, {
        code: "UPDATE_FAILED",
        message: "Unable to update Our Work item.",
      });
    }
  });

export const deleteOurWorkItemServerFn = createServerFn({ method: "POST" })
  .validator(ourWorkIdTransportSchema)
  .handler(async ({ data }) => {
    const ourWork = await import("@/server/our-work");

    try {
      const result = await ourWork.deleteOurWorkItem(data.id);
      return { success: true as const, ...result };
    } catch (error) {
      return ourWork.toOurWorkFailure(error, {
        code: "DELETE_FAILED",
        message: "Unable to delete Our Work item.",
      });
    }
  });
