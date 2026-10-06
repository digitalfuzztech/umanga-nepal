/**
 * Temporary Umanga Nepal logo placeholder.
 * Replace with the official asset at src/assets/umanga-logo.* when supplied —
 * keep the same proportions and never distort the mark.
 */

import umangaLogo from "@/assets/logo/umanga-2.jpg";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={`flex min-w-0 items-center ${className ?? ""}`}>
      <img
        src={umangaLogo}
        alt="Umanga Nepal"
        className="h-auto w-52 object-contain min-[360px]:w-56 sm:w-64 md:w-72 xl:w-80 2xl:w-100"
      />
    </span>
  );
}
