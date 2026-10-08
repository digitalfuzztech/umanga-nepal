import "@tanstack/react-start/server-only";
import { eq, or } from "drizzle-orm";
import { getCurrentAdmin } from "@/server/auth";
import { db } from "@/server/db";
import {
  generalSettings,
  galleryItems,
  ourWorkItems,
  storyItems,
  newsItems,
} from "@/server/db/schema";
import {
  brandingSlotSchema,
  settingsMetadataSchema,
  type AdminSettings,
  type BrandingSlot,
  type PublicSettings,
  type SettingsMetadata,
} from "@/lib/general-settings";
import {
  deleteMedia,
  mediaExists,
  uploadImage,
  MAX_IMAGE_SIZE_BYTES,
  type UploadedMedia,
} from "@/server/storage";

export class SettingsApplicationError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly cleanupWarning = false,
  ) {
    super(message);
    this.name = "SettingsApplicationError";
  }
}
export function settingsFailure(error: unknown) {
  if (error instanceof SettingsApplicationError)
    return {
      success: false as const,
      code: error.code,
      error: error.message,
      cleanupWarning: error.cleanupWarning,
    };
  console.error("[general-settings] Operation failed.");
  return {
    success: false as const,
    code: "SAVE_FAILED",
    error: "Unable to save settings.",
    cleanupWarning: false,
  };
}
async function requireAdmin() {
  if (!(await getCurrentAdmin()))
    throw new SettingsApplicationError("UNAUTHORIZED", "Unauthorized.");
}
function project(row: typeof generalSettings.$inferSelect): AdminSettings {
  const metadata = settingsMetadataSchema.parse(
    Object.fromEntries(
      Object.keys(settingsMetadataSchema.shape).map((key) => [
        key,
        row[key as keyof typeof row],
      ]),
    ),
  );
  return {
    ...metadata,
    headerLogoUrl: row.headerLogoUrl,
    footerLogoUrl: row.footerLogoUrl,
    faviconUrl: row.faviconUrl,
  };
}
export async function getPublicSettings(): Promise<PublicSettings | null> {
  try {
    const [row] = await db
      .select()
      .from(generalSettings)
      .where(eq(generalSettings.id, 1))
      .limit(1);
    if (!row) return null;
    const {
      seoContent: _content,
      seoKeywords: _keywords,
      ...publicSettings
    } = project(row);
    return publicSettings;
  } catch {
    throw new SettingsApplicationError(
      "UNABLE_TO_LOAD",
      "Unable to load site settings.",
    );
  }
}
export async function getAdminSettings(): Promise<AdminSettings | null> {
  await requireAdmin();
  const [row] = await db
    .select()
    .from(generalSettings)
    .where(eq(generalSettings.id, 1))
    .limit(1);
  return row ? project(row) : null;
}
export async function updateSettings(
  input: SettingsMetadata,
): Promise<AdminSettings> {
  await requireAdmin();
  const parsed = settingsMetadataSchema.safeParse(input);
  // Internal mailboxes must never become public organization identities.
  if (
    !parsed.success ||
    JSON.stringify(parsed.data).toLowerCase().includes("admin@umanganepal.org")
  )
    throw new SettingsApplicationError(
      "INVALID_SETTINGS",
      "Please check the settings values.",
    );
  try {
    return await db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(generalSettings)
        .where(eq(generalSettings.id, 1))
        .for("update");
      if (!row)
        throw new SettingsApplicationError(
          "NOT_FOUND",
          "General Settings has not been initialized.",
        );
      await tx
        .update(generalSettings)
        .set(parsed.data)
        .where(eq(generalSettings.id, 1));
      const [saved] = await tx
        .select()
        .from(generalSettings)
        .where(eq(generalSettings.id, 1));
      return project(saved!);
    });
  } catch (error) {
    if (error instanceof SettingsApplicationError) throw error;
    throw new SettingsApplicationError(
      "SAVE_FAILED",
      "Unable to save settings.",
    );
  }
}
export async function cleanupBrandAsset(key: string): Promise<boolean> {
  try {
    const [settings] = await db
      .select({ id: generalSettings.id })
      .from(generalSettings)
      .where(
        or(
          eq(generalSettings.headerLogoStorageKey, key),
          eq(generalSettings.footerLogoStorageKey, key),
          eq(generalSettings.faviconStorageKey, key),
        ),
      )
      .limit(1);
    if (settings) return true;
    for (const table of [galleryItems, ourWorkItems, storyItems, newsItems]) {
      const [reference] = await db
        .select({ id: table.id })
        .from(table)
        .where(eq(table.imageStorageKey, key))
        .limit(1);
      if (reference) return true;
    }
    await deleteMedia(key);
    return true;
  } catch {
    console.warn("[general-settings] Media cleanup could not be completed.");
    return false;
  }
}
export async function uploadBrandAsset(
  slot: BrandingSlot,
  buffer: Buffer,
  mimeType: string,
) {
  brandingSlotSchema.parse(slot);
  if (
    buffer.length > MAX_IMAGE_SIZE_BYTES ||
    (slot === "favicon"
      ? !["image/png", "image/x-icon", "image/vnd.microsoft.icon"].includes(
          mimeType,
        )
      : !["image/png", "image/jpeg", "image/webp"].includes(mimeType))
  )
    throw new SettingsApplicationError(
      "INVALID_IMAGE",
      "Choose a valid image within the 8 MB limit.",
    );
  let allocated: UploadedMedia | undefined;
  try {
    const media = await uploadImage({
      buffer,
      mimeType,
      category: "branding",
      onAllocated: (value) => {
        allocated = value;
      },
    });
    if (
      !media.publicUrl ||
      !media.publicUrl.startsWith("https://") ||
      !(await mediaExists(media.key))
    )
      throw new Error("Media unavailable.");
    const response = await fetch(media.publicUrl, {
      signal: AbortSignal.timeout(20000),
    });
    const bytes = Buffer.from(await response.arrayBuffer());
    if (
      response.status !== 200 ||
      !response.headers.get("content-type")?.startsWith("image/") ||
      !bytes.equals(buffer)
    )
      throw new Error("Media verification failed.");
    return { key: media.key, publicUrl: media.publicUrl };
  } catch {
    // This UUID key has not been offered to any DB writer yet; cleanup must
    // still work if the database is unavailable during an interrupted upload.
    let cleaned = true;
    if (allocated) {
      try {
        await deleteMedia(allocated.key);
      } catch {
        cleaned = false;
        console.warn(
          "[general-settings] Allocated upload cleanup could not be completed.",
        );
      }
    }
    throw new SettingsApplicationError(
      "IMAGE_UPLOAD_FAILED",
      "Unable to upload or verify the branding image.",
      !cleaned,
    );
  }
}
export async function replaceBrandAsset(input: {
  slot: BrandingSlot;
  buffer: Buffer;
  mimeType: string;
}) {
  await requireAdmin();
  const slot = brandingSlotSchema.safeParse(input.slot);
  if (!slot.success)
    throw new SettingsApplicationError(
      "INVALID_SETTINGS",
      "Invalid branding field.",
    );
  if (!(await getAdminSettings()))
    throw new SettingsApplicationError(
      "NOT_FOUND",
      "General Settings has not been initialized.",
    );
  const media = await uploadBrandAsset(slot.data, input.buffer, input.mimeType);
  let previous: string | null;
  try {
    previous = await db.transaction(async (tx) => {
      const [row] = await tx
        .select()
        .from(generalSettings)
        .where(eq(generalSettings.id, 1))
        .for("update");
      if (!row) throw new Error("Settings unavailable.");
      const values =
        slot.data === "headerLogo"
          ? { headerLogoUrl: media.publicUrl, headerLogoStorageKey: media.key }
          : slot.data === "footerLogo"
            ? {
                footerLogoUrl: media.publicUrl,
                footerLogoStorageKey: media.key,
              }
            : { faviconUrl: media.publicUrl, faviconStorageKey: media.key };
      await tx
        .update(generalSettings)
        .set(values)
        .where(eq(generalSettings.id, 1));
      return row[`${slot.data}StorageKey`];
    });
  } catch {
    const cleaned = await cleanupBrandAsset(media.key);
    throw new SettingsApplicationError(
      "SAVE_FAILED",
      "Unable to save the branding image.",
      !cleaned,
    );
  }
  return {
    item: (await getAdminSettings())!,
    cleanupWarning: previous ? !(await cleanupBrandAsset(previous)) : false,
  };
}
