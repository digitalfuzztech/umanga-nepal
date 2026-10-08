import { createServerFn } from "@tanstack/react-start";

export const getPublishedEventsServerFn = createServerFn({
  method: "GET",
}).handler(async () => {
  try {
    const events = await import("@/server/events");
    return await events.getPublishedEvents();
  } catch {
    console.error("[events] Public events could not be loaded.");
    throw new Error(
      "Events are temporarily unavailable. Please try again later.",
    );
  }
});
export const getNearestEligibleEventServerFn = createServerFn({
  method: "GET",
}).handler(async () => {
  try {
    const events = await import("@/server/events");
    return await events.getNearestEligibleEvent();
  } catch {
    console.error("[events] The next event could not be loaded.");
    throw new Error(
      "Events are temporarily unavailable. Please try again later.",
    );
  }
});
