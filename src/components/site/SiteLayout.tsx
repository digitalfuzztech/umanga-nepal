import type { ReactNode } from "react";
import { Footer } from "./Footer";
import { Header } from "./Header";
import { GeneralSettingsProvider } from "./GeneralSettingsContext";
import type { PublicSettings } from "@/lib/general-settings";

export function SiteLayout({
  children,
  settings,
}: {
  children: ReactNode;
  settings: PublicSettings | null;
}) {
  return (
    <GeneralSettingsProvider settings={settings}>
      <div className="public-site flex min-h-screen flex-col bg-background">
        <Header />
        <main id="main" className="flex-1">
          {children}
        </main>
        <Footer />
      </div>
    </GeneralSettingsProvider>
  );
}
