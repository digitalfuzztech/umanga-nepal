import "dotenv/config";

import {
  deleteMedia,
  mediaExists,
  uploadImage,
} from "../src/server/storage/index";

const REQUIRED_CONFIG = [
  "MEDIA_FTP_HOST",
  "MEDIA_FTP_PORT",
  "MEDIA_FTP_USERNAME",
  "MEDIA_FTP_PASSWORD",
  "MEDIA_FTP_SECURE",
  "MEDIA_FTP_ROOT",
  "MEDIA_PUBLIC_BASE_URL",
] as const;

// Valid 1x1 transparent PNG used only for the remote storage round trip.
const TEST_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
  "base64",
);

async function main() {
  const missing = REQUIRED_CONFIG.filter((name) => !process.env[name]?.trim());
  console.log(
    `FTPS configuration: ${missing.length === 0 ? "configured" : "not configured"}`,
  );

  if (missing.length > 0) {
    throw new Error(
      `Media storage verification cannot run. Missing: ${missing.join(", ")}.`,
    );
  }

  if (process.env["MEDIA_FTP_SECURE"]?.trim().toLowerCase() !== "true") {
    throw new Error(
      "Media storage verification requires MEDIA_FTP_SECURE=true.",
    );
  }

  let uploadedKey: string | undefined;

  try {
    const uploaded = await uploadImage({
      buffer: TEST_PNG,
      mimeType: "image/png",
      category: "_storage-test",
    });
    uploadedKey = uploaded.key;
    console.log("FTPS authentication: passed");
    console.log("Upload verification: passed");

    const existsAfterUpload = await mediaExists(uploaded.key);
    if (!existsAfterUpload) {
      throw new Error("Uploaded verification file was not found remotely.");
    }
    console.log("Remote existence verification: passed");

    if (uploaded.publicUrl) {
      const response = await fetch(uploaded.publicUrl);
      if (!response.ok) {
        throw new Error(
          `Public URL verification returned HTTP ${response.status}.`,
        );
      }
      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.toLowerCase().startsWith("image/")) {
        throw new Error(
          "Public URL verification returned a non-image response.",
        );
      }
      console.log("Public HTTPS retrieval: passed");
    } else {
      console.log("Public URL verification: pending hosting/domain setup");
    }

    const deleteResult = await deleteMedia(uploaded.key);
    if (deleteResult !== "deleted") {
      throw new Error("Verification file deletion could not be confirmed.");
    }
    console.log("Delete verification: passed");
    if (await mediaExists(uploaded.key)) {
      throw new Error("Verification file still exists after deletion.");
    }
    uploadedKey = undefined;
    console.log("Post-delete existence verification: passed");
    console.log("Leftover test files: none");
  } finally {
    if (uploadedKey) {
      await deleteMedia(uploadedKey).catch(() => undefined);
    }
  }
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : "Unknown storage error.";
  console.error(message);
  process.exitCode = 1;
});
