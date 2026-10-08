import { z } from "zod";

const text = (maximum: number) => z.string().max(maximum).nullable();
const url = z
  .string()
  .max(2048)
  .url()
  .refine((value) => {
    const parsed = new URL(value);
    return parsed.protocol === "https:" && !parsed.username && !parsed.password;
  }, "Use an HTTPS URL without credentials.")
  .nullable();
export const settingsMetadataSchema = z
  .object({
    companyName: text(255),
    companyDescription: text(100000),
    address: text(5000),
    phone: text(100),
    email: z.string().max(320).email().nullable(),
    latitude: z.number().finite().min(-90).max(90).nullable(),
    longitude: z.number().finite().min(-180).max(180).nullable(),
    facebookUrl: url,
    instagramUrl: url,
    twitterUrl: url,
    youtubeUrl: url,
    tiktokUrl: url,
    linkedinUrl: url,
    websiteUrl: url,
    websiteTitle: text(255),
    seoTitle: text(255),
    seoDescription: text(5000),
    seoContent: text(100000),
    seoKeywords: text(5000),
    openGraphTitle: text(255),
    openGraphDescription: text(5000),
  })
  .strict();
export type SettingsMetadata = z.infer<typeof settingsMetadataSchema>;
export type SettingsAssets = {
  headerLogoUrl: string | null;
  footerLogoUrl: string | null;
  faviconUrl: string | null;
};
export type AdminSettings = SettingsMetadata & SettingsAssets;
export type PublicSettings = Omit<AdminSettings, "seoContent" | "seoKeywords">;
export type BrandingSlot = "headerLogo" | "footerLogo" | "favicon";
export const brandingSlotSchema = z.enum([
  "headerLogo",
  "footerLogo",
  "favicon",
]);
