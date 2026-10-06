import "dotenv/config";

import {
  sendAdminNotification,
  verifyMailTransport,
} from "../src/server/mail/index";

const REQUIRED_CONFIG = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_SECURE",
  "SMTP_USERNAME",
  "SMTP_PASSWORD",
  "MAIL_FROM_ADDRESS",
  "MAIL_FROM_NAME",
  "MAIL_ADMIN_ADDRESS",
] as const;

async function main() {
  const missing = REQUIRED_CONFIG.filter((name) => !process.env[name]?.trim());
  console.log(
    `SMTP configuration: ${missing.length === 0 ? "configured" : "not configured"}`,
  );
  if (missing.length > 0) {
    throw new Error(
      `Mail verification cannot run. Missing: ${missing.join(", ")}.`,
    );
  }

  await verifyMailTransport();
  console.log("SMTP transport verification: passed");

  const result = await sendAdminNotification({
    subject: "Umanga Nepal — SMTP Verification",
    text: "Umanga Nepal SMTP configuration is working correctly.",
    html: `
      <div style="font-family:Arial,sans-serif;color:#163743;line-height:1.6">
        <h1 style="font-size:24px;margin:0 0 16px;color:#127da0">Umanga Nepal</h1>
        <h2 style="font-size:18px;margin:0 0 12px">SMTP verification</h2>
        <p style="margin:0">Server-side email delivery is operational.</p>
      </div>
    `,
  });

  console.log(
    JSON.stringify({
      deliveryAccepted: result.accepted.length > 0,
      acceptedRecipientCount: result.accepted.length,
      rejectedRecipientCount: result.rejected.length,
      messageIdPresent: Boolean(result.messageId),
      responsePresent: Boolean(result.response),
    }),
  );
}

main().catch((error: unknown) => {
  const message =
    error instanceof Error ? error.message : "Mail verification failed.";
  console.error(message);
  process.exitCode = 1;
});
