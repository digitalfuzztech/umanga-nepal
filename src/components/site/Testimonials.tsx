import { Quote } from "lucide-react";
import { testimonials } from "@/data/testimonials";
import { Reveal } from "./Reveal";

export function Testimonials() {
  return (
    <ul className="reveal-grid grid gap-6 lg:grid-cols-3">
      {testimonials.map((t) => (
        <li key={t.id}>
          <Reveal className="h-full">
            <div className="flex h-full flex-col gap-4 rounded-[1.75rem] border border-brand-muted/55 bg-card p-7 shadow-card">
              <Quote className="size-7 text-brand" aria-hidden />
              <blockquote className="flex-1 text-base leading-relaxed text-ink">
                {t.quote}
              </blockquote>
              <footer className="border-t border-border pt-4 text-sm">
                <span className="font-semibold text-ink-deep">
                  {t.attribution}
                </span>
                {t.program ? (
                  <span className="block text-muted-foreground">
                    {t.program}
                  </span>
                ) : null}
              </footer>
            </div>
          </Reveal>
        </li>
      ))}
    </ul>
  );
}
