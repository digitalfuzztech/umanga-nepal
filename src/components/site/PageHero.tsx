import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Reveal } from "./Reveal";

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
    <header
      className={cn(
        "relative overflow-hidden border-b border-brand-muted/45 surface-gradient",
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-48 editorial-grid opacity-70"
        aria-hidden
      />
      <div
        className={cn(
          "container-page relative grid gap-12 py-16 sm:py-20 lg:py-24",
          image && "lg:grid-cols-[1.05fr_0.95fr] lg:items-center",
        )}
      >
        <Reveal className="max-w-3xl">
          <div className="flex flex-col gap-5 border-l-2 border-warm pl-5 sm:pl-7">
            {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
            <h1 className="text-balance-title text-4xl font-extrabold leading-[1.06] text-ink-deep sm:text-5xl lg:text-6xl">
              {title}
            </h1>
            {description ? (
              <p className="max-w-2xl text-lg text-muted-foreground">
                {description}
              </p>
            ) : null}
            {children ? (
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {children}
              </div>
            ) : null}
          </div>
        </Reveal>
        {image ? (
          <Reveal variant="scale" delay={100}>
            <div className="relative isolate p-2 sm:p-3">
              <div
                className="absolute inset-0 -rotate-2 rounded-[2rem] bg-warm-muted/45"
                aria-hidden
              />
              <img
                src={image}
                alt=""
                loading="lazy"
                width={1400}
                height={1000}
                className="relative aspect-[4/3] w-full rounded-[1.7rem] border border-white/80 object-cover shadow-image"
              />
            </div>
          </Reveal>
        ) : null}
      </div>
    </header>
  );
}
