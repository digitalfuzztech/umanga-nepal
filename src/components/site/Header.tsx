import { Link, useRouterState } from "@tanstack/react-router";
import { ChevronDown, LifeBuoy, Menu, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { mainNav } from "@/data/site-config";
import { Logo } from "./Logo";

function DesktopDropdown({
  label,
  to,
  children,
}: {
  label: string;
  to: string;
  children: { label: string; to: string }[];
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div
      ref={wrapperRef}
      className="relative"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onBlur={(e) => {
        if (!wrapperRef.current?.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 rounded-md px-2 py-2 text-sm font-semibold text-ink transition-colors hover:text-brand-strong"
      >
        {label}
        <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
      </button>
      <div
        className={cn(
          "absolute left-0 top-full z-50 w-72 pt-2 transition-all",
          open ? "visible opacity-100" : "invisible opacity-0",
        )}
      >
        <ul className="rounded-2xl border border-border bg-popover p-2 shadow-lift">
          <li>
            <Link
              to={to}
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-2 text-sm font-semibold text-brand-strong hover:bg-brand-soft"
            >
              All {label.toLowerCase()}
            </Link>
          </li>
          {children.map((child) => (
            <li key={child.to}>
              <Link
                to={child.to}
                onClick={() => setOpen(false)}
                className="block rounded-xl px-3 py-2 text-sm text-ink hover:bg-brand-soft hover:text-brand-deep"
              >
                {child.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    setMobileOpen(false);
    setExpanded(null);
  }, [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setMobileOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen]);

  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:text-primary-foreground"
      >
        Skip to content
      </a>
      <header
        className={cn(
          "sticky top-0 z-50 border-b bg-background/95 backdrop-blur transition-shadow",
          scrolled ? "border-border shadow-soft" : "border-transparent",
        )}
      >
        <div className="container-page flex h-20 items-center justify-between gap-4">
          <Link to="/" aria-label="Umanga Nepal home">
            <Logo />
          </Link>

          <nav aria-label="Main" className="hidden xl:flex xl:items-center xl:gap-1">
            {mainNav.map((item) =>
              item.children ? (
                <DesktopDropdown key={item.to} label={item.label} to={item.to} children={item.children} />
              ) : (
                <Link
                  key={item.to}
                  to={item.to}
                  activeOptions={{ exact: item.to === "/" }}
                  className="rounded-md px-2 py-2 text-sm font-semibold text-ink transition-colors hover:text-brand-strong [&.active]:text-brand-strong"
                >
                  {item.label}
                </Link>
              ),
            )}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <Button asChild variant="ghost" size="sm">
              <Link to="/get-support">
                <LifeBuoy aria-hidden /> Need support?
              </Link>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link to="/contact">Reach out</Link>
            </Button>
            <Button asChild variant="warm" size="sm">
              <Link to="/support-us">Support our work</Link>
            </Button>
          </div>

          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-full border border-border text-ink xl:hidden"
            aria-label="Open menu"
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-5" />
          </button>
        </div>
      </header>

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 z-[60] xl:hidden",
          mobileOpen ? "pointer-events-auto" : "pointer-events-none",
        )}
        aria-hidden={!mobileOpen}
      >
        <div
          className={cn(
            "absolute inset-0 bg-ink-deep/40 transition-opacity",
            mobileOpen ? "opacity-100" : "opacity-0",
          )}
          onClick={() => setMobileOpen(false)}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Site menu"
          className={cn(
            "absolute right-0 top-0 flex h-full w-[min(22rem,90vw)] flex-col bg-background shadow-lift transition-transform duration-300",
            mobileOpen ? "translate-x-0" : "translate-x-full",
          )}
        >
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <Logo />
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setMobileOpen(false)}
              className="inline-flex size-10 items-center justify-center rounded-full border border-border"
            >
              <X className="size-5" />
            </button>
          </div>

          <nav aria-label="Mobile" className="flex-1 overflow-y-auto px-3 py-4">
            <ul className="flex flex-col gap-1">
              {mainNav.map((item) => (
                <li key={item.to}>
                  {item.children ? (
                    <>
                      <div className="flex items-center">
                        <Link
                          to={item.to}
                          className="flex-1 rounded-xl px-3 py-3 text-base font-semibold text-ink"
                        >
                          {item.label}
                        </Link>
                        <button
                          type="button"
                          aria-label={`Toggle ${item.label} submenu`}
                          aria-expanded={expanded === item.to}
                          onClick={() => setExpanded(expanded === item.to ? null : item.to)}
                          className="inline-flex size-10 items-center justify-center rounded-full text-muted-foreground"
                        >
                          <ChevronDown
                            className={cn(
                              "size-5 transition-transform",
                              expanded === item.to && "rotate-180",
                            )}
                          />
                        </button>
                      </div>
                      {expanded === item.to ? (
                        <ul className="ml-3 border-l border-border pl-3">
                          {item.children.map((child) => (
                            <li key={child.to}>
                              <Link
                                to={child.to}
                                className="block rounded-lg px-3 py-2.5 text-sm text-muted-foreground hover:text-brand-strong"
                              >
                                {child.label}
                              </Link>
                            </li>
                          ))}
                        </ul>
                      ) : null}
                    </>
                  ) : (
                    <Link
                      to={item.to}
                      className="block rounded-xl px-3 py-3 text-base font-semibold text-ink [&.active]:text-brand-strong"
                    >
                      {item.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          <div className="grid gap-2 border-t border-border px-5 py-5">
            <Button asChild variant="brand">
              <Link to="/get-support">
                <LifeBuoy aria-hidden /> Need support?
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/contact">Reach out</Link>
            </Button>
            <Button asChild variant="warm">
              <Link to="/support-us">Support our work</Link>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
