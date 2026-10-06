import { z } from "zod";

export const adminLoginSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(320),
  password: z.string().min(1).max(256),
});
