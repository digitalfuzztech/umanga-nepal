import { Quote } from "lucide-react";
import { testimonials } from "@/data/testimonials";

export function Testimonials() {
  return (
    <ul className="grid gap-6 lg:grid-cols-3">
      {testimonials.map((t) => (
        <li
          key={t.id}
          className="flex flex-col gap-4 rounded-3xl border border-border bg-card p-7 shadow-soft"
        >
          <Quote className="size-7 text-brand" aria-hidden />
          <blockquote className="flex-1 text-base leading-relaxed text-ink">{t.quote}</blockquote>
          <footer className="border-t border-border pt-4 text-sm">
            <span className="font-semibold text-ink-deep">{t.attribution}</span>
            {t.program ? (
              <span className="block text-muted-foreground">{t.program}</span>
            ) : null}
          </footer>
        </li>
      ))}
    </ul>
  );
}
