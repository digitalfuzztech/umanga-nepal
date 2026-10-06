import { createFileRoute, redirect } from "@tanstack/react-router";
import { ShieldCheck } from "lucide-react";

import { AdminLayout } from "@/components/admin/AdminLayout";
import { getCurrentAdminServerFn } from "@/lib/admin-auth-server-functions";

export const Route = createFileRoute("/admin/dashboard")({
  beforeLoad: async () => {
    const admin = await getCurrentAdminServerFn();
    if (!admin) {
      throw redirect({ to: "/admin" });
    }

    return { admin };
  },
  head: () => ({
    meta: [
      { title: "Admin Dashboard | Umanga Nepal" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminDashboardPage,
});

function AdminDashboardPage() {
  const { admin } = Route.useRouteContext();

  return (
    <AdminLayout adminEmail={admin.email}>
      <div className="mx-auto max-w-5xl">
        <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-700">
          Umanga Nepal Admin
        </p>
        <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
          Welcome,
          <span className="mt-1 block break-all text-sky-700">
            {admin.email}
          </span>
        </h1>

        <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-7 shadow-[0_20px_55px_-38px_rgba(8,47,73,0.35)] sm:p-9">
          <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
            <ShieldCheck className="size-6" aria-hidden />
          </span>
          <h2 className="mt-5 font-display text-2xl font-bold text-slate-950">
            Admin dashboard is ready.
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            Content management modules will be added in later phases.
          </p>
        </section>
      </div>
    </AdminLayout>
  );
}
