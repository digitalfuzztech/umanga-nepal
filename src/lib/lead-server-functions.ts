import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { PublicLeadResult } from "./lead-input";

export const submitLeadServerFn = createServerFn({ method: "POST" })
  .validator(z.unknown())
  .handler(async ({ data }): Promise<PublicLeadResult> => {
    try {
      const inbox = await import("@/server/inbox/submit-lead");
      return await inbox.submitLead(data);
    } catch {
      console.error("[inbox] SUBMISSION_UNAVAILABLE");
      return {
        success: false,
        error: "We couldn't receive your message right now. Please try again.",
        fieldErrors: {},
      };
    }
  });
