import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { getCurrentAdminServerFn } from "@/lib/admin-auth-server-functions";

export const Route = createFileRoute("/admin/_protected")({
  beforeLoad: async () => {
    const admin = await getCurrentAdminServerFn();
    if (!admin) {
      throw redirect({ to: "/admin" });
    }

    return { admin };
  },
  component: ProtectedAdminLayout,
});

function ProtectedAdminLayout() {
  const { admin } = Route.useRouteContext();

  return (
    <AdminLayout adminEmail={admin.email}>
      <Outlet />
    </AdminLayout>
  );
}
