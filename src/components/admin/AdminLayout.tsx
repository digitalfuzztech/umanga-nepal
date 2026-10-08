import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ExternalLink, LogOut, Menu, X } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

import logo from "@/assets/logo/umanga-2.png";
import { adminNavigationItems } from "@/components/admin/admin-navigation";
import { logoutAdminServerFn } from "@/lib/admin-auth-server-functions";

type AdminLayoutProps = {
  adminEmail: string;
  children: ReactNode;
};

export function AdminLayout({ adminEmail, children }: AdminLayoutProps) {
  const navigate = useNavigate();
  const logout = useServerFn(logoutAdminServerFn);
  const pathname = useRouterState({
    select: (state) => state.location.pathname,
  });
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const pageTitle =
    adminNavigationItems.find(
      (item) =>
        item.to === pathname ||
        (item.to === "/admin/cms" && pathname.startsWith("/admin/cms/")),
    )?.label ?? "Administration";

  useEffect(() => {
    setIsDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!isDrawerOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setIsDrawerOpen(false);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isDrawerOpen]);

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

  const sidebar = (
    <div className="flex h-full flex-col p-5 lg:p-6">
      <div className="flex items-start justify-between gap-3">
        <Link to="/admin/dashboard" aria-label="Umanga Nepal admin dashboard">
          <img
            src={logo}
            alt="Umanga Nepal"
            className="h-auto w-44 object-contain"
          />
        </Link>
        <button
          type="button"
          onClick={() => setIsDrawerOpen(false)}
          className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 md:hidden"
          aria-label="Close admin navigation"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>

      <p className="mt-5 text-xs font-bold uppercase tracking-[0.18em] text-sky-700">
        Administration
      </p>

      <nav className="mt-6 space-y-1.5" aria-label="Admin navigation">
        {adminNavigationItems.map((item) => (
          <Link
            key={item.to}
            to={item.to}
            activeOptions={{ exact: item.to !== "/admin/cms" }}
            onClick={() => setIsDrawerOpen(false)}
            className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-slate-950 [&.active]:bg-sky-50 [&.active]:text-sky-900 [&.active]:shadow-[inset_3px_0_0_#1ebbe8]"
          >
            <item.icon className="size-4.5 shrink-0" aria-hidden />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="mt-auto space-y-3 border-t border-slate-200 pt-5">
        <a
          href="/"
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-950 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
        >
          <ExternalLink className="size-4" aria-hidden />
          View Website
        </a>
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LogOut className="size-4" aria-hidden />
          {isLoggingOut ? "Signing out…" : "Logout"}
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-950">
      <div className="mx-auto grid min-h-screen max-w-[1720px] md:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="hidden border-r border-slate-200 bg-white md:block">
          {sidebar}
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6 lg:px-8">
            <div className="flex min-h-11 items-center justify-between gap-4">
              <div className="flex min-w-0 items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsDrawerOpen(true)}
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500 md:hidden"
                  aria-label="Open admin navigation"
                  aria-expanded={isDrawerOpen}
                  aria-controls="admin-mobile-navigation"
                >
                  <Menu className="size-5" aria-hidden />
                </button>
                <h1 className="truncate font-display text-lg font-bold text-slate-950 sm:text-xl">
                  {pageTitle}
                </h1>
              </div>

              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sm font-bold text-sky-800"
                  aria-hidden
                >
                  {adminEmail.charAt(0).toUpperCase()}
                </span>
                <span className="hidden max-w-64 truncate text-sm font-medium text-slate-600 sm:block">
                  {adminEmail}
                </span>
              </div>
            </div>
          </header>

          <main className="px-4 py-7 sm:px-6 lg:px-8 lg:py-9">
            <div className="mx-auto max-w-6xl">{children}</div>
          </main>
        </div>
      </div>

      {isDrawerOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-950/35"
            onClick={() => setIsDrawerOpen(false)}
            aria-label="Close admin navigation"
          />
          <aside
            id="admin-mobile-navigation"
            className="relative h-full w-[min(86vw,320px)] border-r border-slate-200 bg-white shadow-2xl"
          >
            {sidebar}
          </aside>
        </div>
      ) : null}
    </div>
  );
}
