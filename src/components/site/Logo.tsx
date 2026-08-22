/**
 * Temporary Umanga Nepal logo placeholder.
 * Replace with the official asset at src/assets/umanga-logo.* when supplied —
 * keep the same proportions and never distort the mark.
 */

import umangaLogo from "@/assets/logo/umanga-2.jpg";
export function Logo({ className }: { className?: string }) {
  return (
    <span className={`flex items-center gap-2.5 ${className ?? ""}`}>

      <img src={umangaLogo} alt="umanga logo" className="w-60"/>

    </span>
  );
}
