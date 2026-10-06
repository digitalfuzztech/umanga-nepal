import { Link } from "@tanstack/react-router";
import { ArrowRight, CircleDashed, type LucideIcon } from "lucide-react";

type AdminPageHeaderProps = {
  title: string;
  description?: string;
  actionLabel?: string;
};

export function AdminPageHeader({
  title,
  description,
  actionLabel,
}: AdminPageHeaderProps) {
  return (
    <div className="flex flex-col gap-5 border-b border-slate-200 pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-sky-700">
          Umanga Nepal Admin
        </p>
        <h2 className="mt-2 font-display text-3xl font-extrabold tracking-tight text-slate-950">
          {title}
        </h2>
        {description ? (
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
            {description}
          </p>
        ) : null}
      </div>
      {actionLabel ? (
        <button
          type="button"
          disabled
          className="inline-flex w-fit items-center justify-center rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-bold text-white opacity-55"
          title="Available in a later phase"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

export function AdminEmptyState({
  title = "No content yet.",
  description,
}: {
  title?: string;
  description: string;
}) {
  return (
    <section className="mt-7 flex min-h-64 flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <span className="inline-flex size-12 items-center justify-center rounded-2xl bg-sky-50 text-sky-700">
        <CircleDashed className="size-6" aria-hidden />
      </span>
      <h3 className="mt-4 font-display text-lg font-bold text-slate-950">
        {title}
      </h3>
      <p className="mt-2 max-w-lg text-sm leading-6 text-slate-600">
        {description}
      </p>
    </section>
  );
}

type AdminModuleCardProps = {
  title: string;
  description: string;
  to:
    | "/admin/inbox"
    | "/admin/gallery"
    | "/admin/our-work"
    | "/admin/stories"
    | "/admin/news-events"
    | "/admin/resources";
  icon: LucideIcon;
};

export function AdminModuleCard({
  title,
  description,
  to,
  icon: Icon,
}: AdminModuleCardProps) {
  return (
    <Link
      to={to}
      className="group flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_16px_45px_-38px_rgba(8,47,73,0.5)] transition hover:-translate-y-0.5 hover:border-sky-300 hover:shadow-[0_18px_45px_-32px_rgba(14,116,144,0.35)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-500"
    >
      <span className="inline-flex size-11 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
        <Icon className="size-5" aria-hidden />
      </span>
      <h3 className="mt-4 font-display text-lg font-bold text-slate-950">
        {title}
      </h3>
      <p className="mt-1 flex-1 text-sm leading-6 text-slate-600">
        {description}
      </p>
      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-sky-700">
        Manage
        <ArrowRight
          className="size-4 transition-transform group-hover:translate-x-0.5"
          aria-hidden
        />
      </span>
    </Link>
  );
}
