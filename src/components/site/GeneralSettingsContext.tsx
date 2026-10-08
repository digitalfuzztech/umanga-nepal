import type { ReactNode } from "react";
import type { PublicSettings } from "@/lib/general-settings";
import { SettingsContext } from "@/lib/general-settings-context";
export function GeneralSettingsProvider({
  settings,
  children,
}: {
  settings: PublicSettings | null;
  children: ReactNode;
}) {
  return (
    <SettingsContext.Provider value={settings}>
      {children}
    </SettingsContext.Provider>
  );
}
