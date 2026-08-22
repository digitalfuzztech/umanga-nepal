import { useEffect, useRef, useState } from "react";

/** Counts up once when scrolled into view; renders the final value instantly for reduced-motion users. */
export function Counter({ value, className }: { value: number | string; className?: string }) {
  const isNumeric = typeof value === "number";
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState<number | string>(isNumeric ? 0 : value);

  useEffect(() => {
    if (!isNumeric) return;
    const target = value as number;
    const el = ref.current;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced || !el || typeof IntersectionObserver === "undefined") {
      setDisplay(target);
      return;
    }

    let frame = 0;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const duration = 1200;
        const tick = (now: number) => {
          const progress = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - progress, 3);
          setDisplay(Math.round(target * eased));
          if (progress < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [isNumeric, value]);

  return (
    <span ref={ref} className={className}>
      {typeof display === "number" ? display.toLocaleString("en-US") : display}
    </span>
  );
}
