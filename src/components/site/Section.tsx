import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Section({
  children,
  className,
  tone = "default",
  id,
}: {
  children: ReactNode;
  className?: string;
  tone?: "default" | "surface" | "blue" | "brand";
  id?: string;
}) {
  const tones = {
    default: "bg-background",
    surface: "bg-surface",
    blue: "bg-surface-blue",
    brand: "brand-gradient text-primary-foreground",
  } as const;

  return (
    <section id={id} className={cn("py-16 sm:py-20 lg:py-24", tones[tone], className)}>
      <div className="container-page">{children}</div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  onBrand = false,
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  onBrand?: boolean;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4",
        align === "center" && "items-center text-center",
        align === "center" && "mx-auto max-w-2xl",
      )}
    >
      {eyebrow ? (
        <span className={cn("eyebrow", onBrand && "text-primary-foreground/80")}>
          <span
            className={cn(
              "h-px w-6",
              onBrand ? "bg-primary-foreground/50" : "bg-warm",
              align === "center" && "hidden",
            )}
            aria-hidden
          />
          {eyebrow}
        </span>
      ) : null}
      <h2
        className={cn(
          "text-balance-title text-3xl font-extrabold sm:text-4xl lg:text-[2.75rem] lg:leading-[1.1]",
          onBrand ? "text-primary-foreground" : "text-ink-deep",
        )}
      >
        {title}
      </h2>
      {description ? (
        <p
          className={cn(
            "max-w-2xl text-base sm:text-lg",
            onBrand ? "text-primary-foreground/85" : "text-muted-foreground",
          )}
        >
          {description}
        </p>
      ) : null}
      {children}
    </div>
  );
}
