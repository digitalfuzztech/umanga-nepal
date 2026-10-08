import { createContext, useContext } from "react";
import type { PublicSettings } from "./general-settings";
export const SettingsContext = createContext<PublicSettings | null>(null);
export function useGeneralSettings() {
  return useContext(SettingsContext);
}
