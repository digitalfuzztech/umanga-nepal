// Manual SMTP test: one message per identity per invocation, no automatic retries.
import "dotenv/config";

import {
  getGeneralOutboundIdentity,
  leadMailboxes,
  sendGeneralMail,
  sendLeadNotification,
  type LeadChannel,
} from "../src/server/mail/channel-routing";
import { verifyMailTransport } from "../src/server/mail";

async function main() {
  const account = process.env["SMTP_USERNAME"]?.trim();
  console.log(
    `SMTP authenticated identity: ${account?.endsWith("@umanganepal.org") ? account : "configured server-only account"}`,
  );
  await verifyMailTransport();
  console.log(
    "SMTP transport verification: passed (certificate verification enabled)",
  );
  const channels = Object.keys(leadMailboxes) as LeadChannel[];
  for (const channel of [...channels, "info", "news"] as const) {
    const message = {
      subject: `[Umanga Mail Verification] ${channel}`,
      text: `Controlled Umanga Nepal mail identity verification for ${channel}. No public lead data is included.`,
    };
    try {
      const result =
        channel === "info" || channel === "news"
          ? await sendGeneralMail(channel, {
              ...message,
              to: getGeneralOutboundIdentity("info").address,
            })
          : await sendLeadNotification(channel, message);
      console.log(
        JSON.stringify({
          identity: channel,
          accepted: result.accepted,
          rejected: result.rejected,
          messageId: result.messageId,
        }),
      );
      if (result.accepted.length !== 1 || result.rejected.length !== 0) {
        throw new Error("IDENTITY_NOT_ACCEPTED");
      }
    } catch {
      throw new Error(
        `${channel.toUpperCase()} SENDER IDENTITY NOT AUTHORIZED OR DELIVERY FAILED`,
      );
    }
  }
  console.log(
    "SMTP accepted all 9 identities. Forwarded mailbox receipt requires manual confirmation.",
  );
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error
      ? error.message
      : "Mail routing verification failed.",
  );
  process.exitCode = 1;
});
