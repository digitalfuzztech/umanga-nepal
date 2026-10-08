import { createServerFn } from "@tanstack/react-start";

export const getEventsCalendarDateServerFn = createServerFn({
  method: "GET",
}).handler(async () => {
  const { getKathmanduDate } = await import("@/server/news-events/validation");
  return getKathmanduDate();
});

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
