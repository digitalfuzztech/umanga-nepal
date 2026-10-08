import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { brandingSlotSchema, settingsMetadataSchema } from "./general-settings";

export const getPublicSettingsServerFn = createServerFn({
  method: "GET",
}).handler(async () => {
  const settings = await import("@/server/general-settings");
  const item = await settings.getPublicSettings();
  if (!item || item.websiteUrl) return item;
  const { getRequestUrl } = await import("@tanstack/react-start/server");
  return { ...item, websiteUrl: `${getRequestUrl().origin}/` };
});
export const getAdminSettingsServerFn = createServerFn({
  method: "GET",
}).handler(async () => {
  const settings = await import("@/server/general-settings");
  try {
    return { success: true as const, item: await settings.getAdminSettings() };
  } catch (error) {
    return settings.settingsFailure(error);
  }
});
export const updateSettingsServerFn = createServerFn({ method: "POST" })
  .validator(settingsMetadataSchema)
  .handler(async ({ data }) => {
    const settings = await import("@/server/general-settings");
    try {
      return {
        success: true as const,
        item: await settings.updateSettings(data),
      };
    } catch (error) {
      return settings.settingsFailure(error);
    }
  });
export const replaceBrandAssetServerFn = createServerFn({ method: "POST" })
  .validator(
    z
      .object({
        slot: brandingSlotSchema,
        base64: z.string().max(11184812),
        mimeType: z.string(),
      })
      .strict(),
  )
  .handler(async ({ data }) => {
    const settings = await import("@/server/general-settings");
    try {
      return {
        success: true as const,
        ...(await settings.replaceBrandAsset({
          slot: data.slot,
          buffer: Buffer.from(data.base64, "base64"),
          mimeType: data.mimeType,
        })),
      };
    } catch (error) {
      return settings.settingsFailure(error);
    }
  });
