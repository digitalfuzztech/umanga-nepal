/**
 * Temporary Umanga Nepal logo placeholder.
 * Replace with the official asset at src/assets/umanga-logo.* when supplied —
 * keep the same proportions and never distort the mark.
 */

import umangaLogo from "@/assets/logo/umanga-2.png";

export function Logo({ className }: { className?: string }) {
  return (
    <span className={`flex min-w-0 items-center ${className ?? ""}`}>
      <img
        src={umangaLogo}
        alt="Umanga Nepal"
        className="h-auto w-48 object-contain min-[360px]:w-52 sm:w-58 md:w-64 xl:w-72 2xl:w-80"
      />
    </span>
  );
}
