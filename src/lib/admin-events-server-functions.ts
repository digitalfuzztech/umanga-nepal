import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const idTransport = z.object({ id: z.string() }).strict();
const metadataTransport = z
  .object({
    slug: z.string(),
    title: z.string(),
    summary: z.string(),
    category: z.string(),
    eventStart: z.string(),
    location: z.string(),
    registrationOpen: z.boolean().optional(),
    demoContent: z.boolean().optional(),
    published: z.boolean().optional(),
    sortOrder: z.union([z.string(), z.number(), z.null()]).optional(),
  })
  .strict();

export const listEventsServerFn = createServerFn({ method: "GET" }).handler(
  async () => {
    const events = await import("@/server/events");
    try {
      return {
        success: true as const,
        items: await events.getEventsForAdmin(),
      };
    } catch (error) {
      return events.toEventFailure(error, {
        code: "UNABLE_TO_LOAD",
        message: "Unable to load Events.",
      });
    }
  },
);
export const getEventServerFn = createServerFn({ method: "GET" })
  .validator(idTransport)
  .handler(async ({ data }) => {
    const events = await import("@/server/events");
    try {
      return {
        success: true as const,
        item: await events.getEventById(data.id),
      };
    } catch (error) {
      return events.toEventFailure(error, {
        code: "UNABLE_TO_LOAD",
        message: "Unable to load the Event.",
      });
    }
  });
export const createEventServerFn = createServerFn({ method: "POST" })
  .validator(metadataTransport)
  .handler(async ({ data }) => {
    const events = await import("@/server/events");
    try {
      return { success: true as const, item: await events.createEvent(data) };
    } catch (error) {
      return events.toEventFailure(error, {
        code: "SAVE_FAILED",
        message: "Unable to save Event.",
      });
    }
  });
export const updateEventServerFn = createServerFn({ method: "POST" })
  .validator(
    z
      .object({ id: z.string(), metadata: metadataTransport.partial() })
      .strict(),
  )
  .handler(async ({ data }) => {
    const events = await import("@/server/events");
    try {
      return { success: true as const, item: await events.updateEvent(data) };
    } catch (error) {
      return events.toEventFailure(error, {
        code: "UPDATE_FAILED",
        message: "Unable to update Event.",
      });
    }
  });
export const deleteEventServerFn = createServerFn({ method: "POST" })
  .validator(idTransport)
  .handler(async ({ data }) => {
    const events = await import("@/server/events");
    try {
      return { success: true as const, ...(await events.deleteEvent(data.id)) };
    } catch (error) {
      return events.toEventFailure(error, {
        code: "DELETE_FAILED",
        message: "Unable to delete Event.",
      });
    }
  });
