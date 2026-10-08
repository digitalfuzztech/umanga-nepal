import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const listResourcesServerFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const resources = await import("@/server/resources");
    try {
      return {
        success: true as const,
        items: await resources.getResourcesForAdmin(),
      };
    } catch (error) {
      return resources.toResourceFailure(error, {
        code: "UNABLE_TO_LOAD",
        message: "Unable to load Resources.",
      });
    }
  },
);
export const getResourceServerFn = createServerFn({ method: "GET" })
  .validator(z.object({ id: z.string() }).strict())
  .handler(async ({ data }) => {
    const resources = await import("@/server/resources");
    try {
      return {
        success: true as const,
        item: await resources.getResourceById(data.id),
      };
    } catch (error) {
      return resources.toResourceFailure(error, {
        code: "UNABLE_TO_LOAD",
        message: "Unable to load the Resource.",
      });
    }
  });
export const createResourceServerFn = createServerFn({ method: "POST" })
  .validator(z.unknown())
  .handler(async ({ data }) => {
    const resources = await import("@/server/resources");
    try {
      return {
        success: true as const,
        item: await resources.createResource(data),
      };
    } catch (error) {
      return resources.toResourceFailure(error, {
        code: "SAVE_FAILED",
        message: "Unable to save Resource.",
      });
    }
  });
export const updateResourceServerFn = createServerFn({ method: "POST" })
  .validator(z.unknown())
  .handler(async ({ data }) => {
    const resources = await import("@/server/resources");
    try {
      return {
        success: true as const,
        item: await resources.updateResourceMetadata(data),
      };
    } catch (error) {
      return resources.toResourceFailure(error, {
        code: "UPDATE_FAILED",
        message: "Unable to update Resource.",
      });
    }
  });
export const deleteResourceServerFn = createServerFn({ method: "POST" })
  .validator(z.object({ id: z.string() }).strict())
  .handler(async ({ data }) => {
    const resources = await import("@/server/resources");
    try {
      return {
        success: true as const,
        ...(await resources.deleteResource(data.id)),
      };
    } catch (error) {
      return resources.toResourceFailure(error, {
        code: "DELETE_FAILED",
        message: "Unable to delete Resource.",
      });
    }
  });
