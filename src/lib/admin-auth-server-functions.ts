import { createServerFn } from "@tanstack/react-start";

import { adminLoginSchema } from "@/lib/admin-auth-input";

export const loginAdminServerFn = createServerFn({ method: "POST" })
  .validator(adminLoginSchema)
  .handler(async ({ data }) => {
    const { InvalidAdminCredentialsError, loginAdmin } =
      await import("@/server/auth");

    try {
      await loginAdmin(data.email, data.password);
      return { success: true as const };
    } catch (error) {
      if (error instanceof InvalidAdminCredentialsError) {
        return {
          success: false as const,
          error: "Invalid email or password." as const,
        };
      }

      throw error;
    }
  });

export const getCurrentAdminServerFn = createServerFn({
  method: "GET",
}).handler(async () => {
  const { getCurrentAdmin } = await import("@/server/auth");
  const admin = await getCurrentAdmin();
  if (!admin) return null;
  // Keep the internal mailbox out of the client-facing admin profile.
  return {
    id: admin.id,
    email: /^admin@/i.test(admin.email) ? "Umanga staff" : admin.email,
  };
});

export const logoutAdminServerFn = createServerFn({ method: "POST" }).handler(
  async () => {
    const { logoutAdmin } = await import("@/server/auth");
    await logoutAdmin();
    return { success: true as const };
  },
);
