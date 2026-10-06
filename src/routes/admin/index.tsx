import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { LockKeyhole, ShieldCheck } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";

import logo from "@/assets/logo/umanga-2.png";
import {
  getCurrentAdminServerFn,
  loginAdminServerFn,
} from "@/lib/admin-auth-server-functions";

export const Route = createFileRoute("/admin/")({
  beforeLoad: async () => {
    const admin = await getCurrentAdminServerFn();
    if (admin) {
      throw redirect({ to: "/admin/dashboard" });
    }
  },
  head: () => ({
    meta: [
      { title: "Admin Login | Umanga Nepal" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminLoginPage,
});

function AdminLoginPage() {
  const navigate = useNavigate();
  const login = useServerFn(loginAdminServerFn);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setIsHydrated(true);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isSubmitting) return;

    setError(null);
    setIsSubmitting(true);

    try {
      const result = await login({ data: { email, password } });

      if (!result.success) {
        setError(result.error);
        setPassword("");
        return;
      }

      await navigate({ to: "/admin/dashboard", replace: true });
    } catch {
      setError("Unable to sign in right now. Please try again.");
      setPassword("");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-50 px-4 py-10 sm:px-6">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top_left,rgba(30,187,232,0.16),transparent_58%),radial-gradient(circle_at_top_right,rgba(246,147,34,0.1),transparent_48%)]"
        aria-hidden
      />

      <section className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-[0_24px_70px_-36px_rgba(8,47,73,0.35)] sm:p-9">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <img
            src={logo}
            alt="Umanga Nepal"
            className="h-auto w-48 object-contain"
          />
          <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
            <ShieldCheck className="size-5" aria-hidden />
          </span>
        </div>

        <div className="pt-7">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-sky-700">
            Authorized access only
          </p>
          <h1 className="mt-3 font-display text-3xl font-extrabold tracking-tight text-slate-950">
            Admin Login
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">
            Sign in to access the Umanga Nepal administration area.
          </p>
        </div>

        <form className="mt-7 space-y-5" method="post" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="admin-email"
              className="text-sm font-semibold text-slate-800"
            >
              Email
            </label>
            <input
              id="admin-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              maxLength={320}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
            />
          </div>

          <div>
            <label
              htmlFor="admin-password"
              className="text-sm font-semibold text-slate-800"
            >
              Password
            </label>
            <input
              id="admin-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              maxLength={256}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-sky-500 focus:ring-4 focus:ring-sky-100"
            />
          </div>

          {error ? (
            <p
              role="alert"
              aria-live="polite"
              className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-800"
            >
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={!isHydrated || isSubmitting}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-sky-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-sky-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-600 disabled:cursor-not-allowed disabled:opacity-65"
          >
            <LockKeyhole className="size-4" aria-hidden />
            {isSubmitting ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </section>
    </main>
  );
}
