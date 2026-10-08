import "@tanstack/react-start/server-only";

import { randomUUID } from "node:crypto";
import { posix } from "node:path";
import { Readable } from "node:stream";

import { Client, FTPError } from "basic-ftp";

if (typeof window !== "undefined") {
  throw new Error("The media storage module can only be used on the server.");
}

export const MAX_IMAGE_SIZE_BYTES = 8 * 1024 * 1024;

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AllowedImageMimeType = (typeof ALLOWED_IMAGE_MIME_TYPES)[number];
export type MediaCategory =
  "gallery" | "our-work" | "stories" | "news" | "branding" | "_storage-test";

type MediaExtension = "jpg" | "png" | "webp" | "ico";

type MediaStorageConfig = {
  host: string;
  port: number;
  username: string;
  password: string;
  secure: true;
  root: string;
};

type UploadImageInput = {
  buffer: Buffer;
  mimeType: string;
  category: MediaCategory;
  onAllocated?: (media: Readonly<UploadedMedia>) => void;
};

export type UploadedMedia = {
  key: string;
  publicUrl: string | null;
};

export type DeleteMediaResult = "deleted" | "already_missing";

export class MediaStorageConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MediaStorageConfigurationError";
  }
}

export class MediaImageValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MediaImageValidationError";
  }
}

const MIME_EXTENSIONS: Record<AllowedImageMimeType, MediaExtension> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

const SAFE_KEY_SEGMENT = /^[A-Za-z0-9_][A-Za-z0-9._-]*$/;

function requiredEnvironmentValue(
  name: string,
  options: { preserveWhitespace?: boolean } = {},
): string {
  const rawValue = process.env[name];
  const value = options.preserveWhitespace ? rawValue : rawValue?.trim();

  if (!value) {
    throw new MediaStorageConfigurationError(
      `Media storage is not configured. Missing server environment variable: ${name}.`,
    );
  }

  return value;
}

function getMediaStorageConfig(): MediaStorageConfig {
  const portValue = requiredEnvironmentValue("MEDIA_FTP_PORT");
  const port = Number(portValue);

  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new MediaStorageConfigurationError(
      "Media storage is not configured. MEDIA_FTP_PORT must be an integer between 1 and 65535.",
    );
  }

  const secureValue = requiredEnvironmentValue("MEDIA_FTP_SECURE");
  if (secureValue.toLowerCase() !== "true") {
    throw new MediaStorageConfigurationError(
      "Media storage is not configured. MEDIA_FTP_SECURE must be true for explicit FTP over TLS.",
    );
  }

  const rootValue = requiredEnvironmentValue("MEDIA_FTP_ROOT");
  if (!posix.isAbsolute(rootValue) || rootValue.includes("\\")) {
    throw new MediaStorageConfigurationError(
      "Media storage is not configured. MEDIA_FTP_ROOT must be an absolute POSIX path.",
    );
  }

  return {
    host: requiredEnvironmentValue("MEDIA_FTP_HOST"),
    port,
    username: requiredEnvironmentValue("MEDIA_FTP_USERNAME"),
    password: requiredEnvironmentValue("MEDIA_FTP_PASSWORD", {
      preserveWhitespace: true,
    }),
    secure: true,
    root: posix.normalize(rootValue),
  };
}

export function assertSafeMediaKey(key: string): string {
  if (!key || key !== key.trim() || key.startsWith("/") || key.includes("\\")) {
    throw new Error("Invalid media storage key.");
  }

  const segments = key.split("/");
  if (
    segments.some(
      (segment) =>
        !segment ||
        segment === "." ||
        segment === ".." ||
        !SAFE_KEY_SEGMENT.test(segment),
    )
  ) {
    throw new Error("Invalid media storage key.");
  }

  return segments.join("/");
}

function isAllowedMimeType(value: string): value is AllowedImageMimeType {
  return ALLOWED_IMAGE_MIME_TYPES.some((mimeType) => mimeType === value);
}

function hasExpectedImageSignature(
  buffer: Buffer,
  mimeType: AllowedImageMimeType,
): boolean {
  if (mimeType === "image/jpeg") {
    return (
      buffer.length >= 3 &&
      buffer[0] === 0xff &&
      buffer[1] === 0xd8 &&
      buffer[2] === 0xff
    );
  }

  if (mimeType === "image/png") {
    const pngSignature = Buffer.from([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
    return (
      buffer.length >= pngSignature.length &&
      buffer.subarray(0, 8).equals(pngSignature)
    );
  }

  return (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  );
}

function validateImage(buffer: Buffer, mimeType: string): AllowedImageMimeType {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) {
    throw new MediaImageValidationError(
      "Image data must contain at least one byte.",
    );
  }

  if (buffer.length > MAX_IMAGE_SIZE_BYTES) {
    throw new MediaImageValidationError("Image exceeds the 8 MB upload limit.");
  }

  if (!isAllowedMimeType(mimeType)) {
    throw new MediaImageValidationError(
      "Unsupported image type. Use JPEG, PNG, or WebP.",
    );
  }

  if (!hasExpectedImageSignature(buffer, mimeType)) {
    throw new MediaImageValidationError(
      "Image data does not match its declared MIME type.",
    );
  }

  return mimeType;
}

export function createMediaKey({
  category,
  extension,
  now = new Date(),
}: {
  category: MediaCategory;
  extension: MediaExtension;
  now?: Date;
}): string {
  if (
    category !== "gallery" &&
    category !== "our-work" &&
    category !== "stories" &&
    category !== "news" &&
    category !== "branding" &&
    category !== "_storage-test"
  ) {
    throw new Error("Unsupported media category.");
  }

  if (
    !Object.values(MIME_EXTENSIONS).includes(extension) &&
    !(category === "branding" && extension === "ico")
  ) {
    throw new Error("Unsupported media extension.");
  }

  if (Number.isNaN(now.getTime())) {
    throw new Error("A valid date is required to create a media key.");
  }

  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return assertSafeMediaKey(
    `${category}/${year}/${month}/${randomUUID()}.${extension}`,
  );
}

export function getPublicMediaUrl(key: string): string | null {
  const safeKey = assertSafeMediaKey(key);
  const rawBaseUrl = process.env["MEDIA_PUBLIC_BASE_URL"]?.trim();

  if (!rawBaseUrl) {
    return null;
  }

  let baseUrl: URL;
  try {
    baseUrl = new URL(rawBaseUrl.endsWith("/") ? rawBaseUrl : `${rawBaseUrl}/`);
  } catch {
    throw new MediaStorageConfigurationError(
      "Media storage is not configured. MEDIA_PUBLIC_BASE_URL must be a valid HTTP(S) URL.",
    );
  }

  if (baseUrl.protocol !== "http:" && baseUrl.protocol !== "https:") {
    throw new MediaStorageConfigurationError(
      "Media storage is not configured. MEDIA_PUBLIC_BASE_URL must be a valid HTTP(S) URL.",
    );
  }

  return new URL(safeKey, baseUrl).toString();
}

async function withFtp<T>(
  operation: (client: Client, config: MediaStorageConfig) => Promise<T>,
): Promise<T> {
  const config = getMediaStorageConfig();
  const client = new Client();

  try {
    await client.access({
      host: config.host,
      port: config.port,
      user: config.username,
      password: config.password,
      secure: config.secure,
    });
    await client.cd(config.root);
    return await operation(client, config);
  } finally {
    client.close();
  }
}

async function ftpFileExists(client: Client, key: string): Promise<boolean> {
  const safeKey = assertSafeMediaKey(key);
  const directory = posix.dirname(safeKey);
  const filename = posix.basename(safeKey);

  try {
    const entries = await client.list(
      directory === "." ? undefined : directory,
    );
    return entries.some(
      (entry) => entry.name === filename && !entry.isDirectory,
    );
  } catch (error) {
    if (error instanceof FTPError && error.code === 550) {
      return false;
    }
    throw error;
  }
}

export async function uploadImage({
  buffer,
  mimeType,
  category,
  onAllocated,
}: UploadImageInput): Promise<UploadedMedia> {
  const isIcon =
    category === "branding" &&
    (mimeType === "image/x-icon" || mimeType === "image/vnd.microsoft.icon");
  if (isIcon) validateIcon(buffer);
  const extension = isIcon
    ? "ico"
    : MIME_EXTENSIONS[validateImage(buffer, mimeType)];
  const key = createMediaKey({
    category,
    extension,
  });
  const publicUrl = getPublicMediaUrl(key);
  onAllocated?.({ key, publicUrl });

  await withFtp(async (client) => {
    const safeKey = assertSafeMediaKey(key);
    const directory = posix.dirname(safeKey);
    if (directory !== ".") {
      await client.ensureDir(directory);
    }
    await client.uploadFrom(Readable.from(buffer), posix.basename(safeKey));
  });

  return { key, publicUrl };
}

function validateIcon(buffer: Buffer): void {
  if (
    !Buffer.isBuffer(buffer) ||
    buffer.length < 22 ||
    buffer.length > MAX_IMAGE_SIZE_BYTES ||
    buffer.readUInt16LE(0) !== 0 ||
    buffer.readUInt16LE(2) !== 1
  ) {
    throw new MediaImageValidationError(
      "Invalid ICO favicon or file exceeds 8 MB.",
    );
  }
  const count = buffer.readUInt16LE(4),
    directoryEnd = 6 + 16 * count;
  if (!count || directoryEnd > buffer.length)
    throw new MediaImageValidationError("Invalid ICO directory.");
  for (let index = 0; index < count; index++) {
    const entry = 6 + index * 16,
      size = buffer.readUInt32LE(entry + 8),
      offset = buffer.readUInt32LE(entry + 12);
    if (!size || offset < directoryEnd || offset + size > buffer.length)
      throw new MediaImageValidationError("Invalid ICO image data.");
    const image = buffer.subarray(offset, offset + size);
    const png = hasExpectedImageSignature(image, "image/png");
    if (
      !png &&
      (image.length < 40 ||
        image.readUInt32LE(0) !== 40 ||
        image.readInt32LE(4) <= 0 ||
        image.readInt32LE(8) <= 0 ||
        image.readUInt16LE(12) !== 1 ||
        ![1, 4, 8, 24, 32].includes(image.readUInt16LE(14)))
    )
      throw new MediaImageValidationError("Invalid ICO image signature.");
  }
}

export async function mediaExists(key: string): Promise<boolean> {
  const safeKey = assertSafeMediaKey(key);

  return withFtp((client) => ftpFileExists(client, safeKey));
}

export async function deleteMedia(key: string): Promise<DeleteMediaResult> {
  const safeKey = assertSafeMediaKey(key);

  return withFtp(async (client) => {
    if (!(await ftpFileExists(client, safeKey))) {
      return "already_missing";
    }

    await client.remove(safeKey);
    return "deleted";
  });
}
