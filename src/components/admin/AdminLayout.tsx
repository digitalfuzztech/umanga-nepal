import { Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { LayoutDashboard, LogOut } from "lucide-react";
import { useState, type ReactNode } from "react";

import logo from "@/assets/logo/umanga-2.jpg";
import { logoutAdminServerFn } from "@/lib/admin-auth-server-functions";

type AdminLayoutProps = {
  adminEmail: string;
  children: ReactNode;
};

export function AdminLayout({ adminEmail, children }: AdminLayoutProps) {
  const navigate = useNavigate();
  const logout = useServerFn(logoutAdminServerFn);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    if (isLoggingOut) return;

    setIsLoggingOut(true);
    try {
      await logout();
      await navigate({ to: "/admin", replace: true });
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white px-4 py-3 md:hidden">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <img
            src={logo}
            alt="Umanga Nepal"
            className="h-auto w-40 object-contain"
          />
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <LogOut className="size-4" aria-hidden />
            {isLoggingOut ? "Signing out…" : "Logout"}
          </button>
        </div>
      </header>

      <div className="mx-auto grid min-h-screen max-w-[1600px] md:grid-cols-[260px_1fr]">
        <aside className="hidden border-r border-slate-200 bg-white p-6 md:flex md:flex-col">
          <img
            src={logo}
            alt="Umanga Nepal"
            className="h-auto w-48 object-contain"
          />
          <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-sky-700">
            Administration
          </p>

          <nav className="mt-8" aria-label="Admin navigation">
            <Link
              to="/admin/dashboard"
              activeOptions={{ exact: true }}
              className="flex items-center gap-3 rounded-xl bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-900"
            >
              <LayoutDashboard className="size-4" aria-hidden />
              Dashboard
            </Link>
          </nav>

          <div className="mt-auto border-t border-slate-200 pt-5">
            <p className="truncate text-xs text-slate-500" title={adminEmail}>
              {adminEmail}
            </p>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogOut className="size-4" aria-hidden />
              {isLoggingOut ? "Signing out…" : "Logout"}
            </button>
          </div>
        </aside>

        <main className="min-w-0 px-4 py-8 sm:px-6 lg:px-10 lg:py-10">
          {children}
        </main>
      </div>
    </div>
  );
}
