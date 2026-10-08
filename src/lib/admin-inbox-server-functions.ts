import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const listInboxServerFn = createServerFn({ method: "GET" })
  .validator(z.unknown())
  .handler(async ({ data }) => {
    const inbox = await import("@/server/inbox/admin");
    try {
      return {
        success: true as const,
        ...(await inbox.listInboxThreads(data)),
      };
    } catch (error) {
      return inbox.toInboxFailure(error);
    }
  });
export const getInboxServerFn = createServerFn({ method: "GET" })
  .validator(z.unknown())
  .handler(async ({ data }) => {
    const inbox = await import("@/server/inbox/admin");
    try {
      return {
        success: true as const,
        detail: await inbox.getInboxThread(data),
      };
    } catch (error) {
      return inbox.toInboxFailure(error);
    }
  });
export const readInboxServerFn = createServerFn({ method: "POST" })
  .validator(z.unknown())
  .handler(async ({ data }) => {
    const inbox = await import("@/server/inbox/admin");
    try {
      await inbox.setInboxRead(data);
      return { success: true as const };
    } catch (error) {
      return inbox.toInboxFailure(error);
    }
  });
export const statusInboxServerFn = createServerFn({ method: "POST" })
  .validator(z.unknown())
  .handler(async ({ data }) => {
    const inbox = await import("@/server/inbox/admin");
    try {
      await inbox.setInboxStatus(data);
      return { success: true as const };
    } catch (error) {
      return inbox.toInboxFailure(error);
    }
  });
