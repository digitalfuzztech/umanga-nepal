import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHero({
  eyebrow,
  title,
  description,
  children,
  image,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  children?: ReactNode;
  image?: string;
  className?: string;
}) {
  return (
    <header className={cn("relative overflow-hidden surface-gradient", className)}>
      <div
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-brand-soft blur-3xl"
        aria-hidden
      />
      <div className="container-page relative grid gap-10 py-14 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="flex flex-col gap-5">
          {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
          <h1 className="text-balance-title text-4xl font-extrabold leading-[1.08] text-ink-deep sm:text-5xl lg:text-6xl">
            {title}
          </h1>
          {description ? (
            <p className="max-w-2xl text-lg text-muted-foreground">{description}</p>
          ) : null}
          {children ? <div className="flex flex-wrap items-center gap-3 pt-2">{children}</div> : null}
        </div>
        {image ? (
          <div className="relative">
            <img
              src={image}
              alt=""
              loading="lazy"
              width={1400}
              height={1000}
              className="aspect-[4/3] w-full rounded-3xl object-cover shadow-soft"
            />
          </div>
        ) : null}
      </div>
    </header>
  );
}
