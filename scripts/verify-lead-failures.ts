// Manual rollback/notification-failure checks. This utility never sends email.
import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createConnection } from "node:net";
import { eq } from "drizzle-orm";
import { closeDb, db } from "../src/server/db";
import { inboxMessages, inboxThreads } from "../src/server/db/schema";
import {
  createLeadSubmissionService,
  mapLead,
  persistLead,
} from "../src/server/inbox/submit-lead";
import { buildLeadNotification } from "../src/server/inbox/notification";
import { leadInputSchema } from "../src/lib/lead-input";

async function requireTunnel() {
  const configured = new URL(process.env["DATABASE_URL"] ?? "");
  if (configured.hostname !== "127.0.0.1" || configured.port !== "3307") return;
  await new Promise<void>((resolve, reject) => {
    const socket = createConnection({ host: "127.0.0.1", port: 3307 });
    const fail = () => {
      socket.destroy();
      reject(new Error("DATABASE TUNNEL NOT AVAILABLE"));
    };
    socket.once("error", fail);
    socket.setTimeout(3000, fail);
    socket.once("connect", () => {
      socket.destroy();
      resolve();
    });
  });
}

async function main() {
  await requireTunnel();
  const run = randomUUID();
  const emails = {
    smtp: `info+phase12b-${run}-smtp@umanganepal.org`,
    database: `info+phase12b-${run}-db@umanganepal.org`,
  };
  const beforeThreads = await db.select().from(inboxThreads);
  const beforeMessages = await db.select().from(inboxMessages);
  let createdId: string | undefined;
  const request = {
    channel: "contact",
    consent: true,
    fields: {
      name: "Phase 12B failure verification आशिष 🌿",
      email: emails.smtp.toUpperCase(),
      phone: "+977 980 000 0000",
      subject: "General enquiry",
      message:
        "नमस्ते उमङ्ग नेपाल।\n\nPhase 12B failure verification. Safe to delete. 🌿",
    },
  };
  try {
    const mailFailure = createLeadSubmissionService({
      persist: async (lead) => {
        assert(!beforeThreads.some((thread) => thread.id === lead.id));
        createdId = lead.id;
        await persistLead(lead);
      },
      notify: async () => {
        throw new Error("SIMULATED_PRIVATE_SMTP_DETAIL");
      },
    });
    assert.deepEqual(await mailFailure(request), { success: true });
    assert(createdId);
    const [thread] = await db
      .select()
      .from(inboxThreads)
      .where(eq(inboxThreads.id, createdId));
    const [message] = await db
      .select()
      .from(inboxMessages)
      .where(eq(inboxMessages.threadId, createdId));
    assert(thread && message);
    assert.equal(thread.leadEmail, emails.smtp);
    assert.equal(message.body, request.fields.message);
    assert.equal(thread.readAt, null);
    assert.deepEqual(thread.metadata["notification"], {
      status: "failed",
      errorCode: "MAIL_NOTIFICATION_FAILED",
    });
    console.log(
      "SMTP-boundary failure: lead and inbound message retained; safe captured-success response; failed notification metadata recorded; Unicode and paragraph text preserved; email lowercased.",
    );
    let notifications = 0;
    const databaseFailure = createLeadSubmissionService({
      persist: async (lead) => {
        await db.transaction(async (tx) => {
          await tx.insert(inboxThreads).values({
            id: lead.id,
            channel: lead.channel,
            mailbox: lead.mailbox,
            leadEmail: lead.email,
            metadata: lead.metadata,
          });
          // A nonexistent parent deliberately rejects the second insert inside this transaction.
          await tx.insert(inboxMessages).values({
            id: randomUUID(),
            threadId: randomUUID(),
            direction: "inbound",
            senderType: "lead",
            fromAddress: lead.email,
            toAddress: lead.mailbox,
            body: lead.body,
          });
        });
      },
      notify: async () => {
        notifications++;
        throw new Error("MUST_NOT_SEND");
      },
    });
    const result = await databaseFailure({
      ...request,
      fields: { ...request.fields, email: emails.database },
    });
    assert.equal(result.success, false);
    assert.equal(notifications, 0);
    assert(!JSON.stringify(result).includes("SQL"));
    assert.equal(
      (
        await db
          .select()
          .from(inboxThreads)
          .where(eq(inboxThreads.leadEmail, emails.database))
      ).length,
      0,
    );
    console.log(
      "Second-insert database failure: complete rollback, no partial pair, zero notification attempts, safe public error.",
    );
    const injection = mapLead(
      leadInputSchema.parse({
        ...request,
        fields: {
          ...request.fields,
          message: '<script>alert("test")</script>\n\nनेपाली 🌿',
        },
      }),
    );
    assert(!buildLeadNotification(injection).html.includes("<script>"));
    assert(
      buildLeadNotification(injection).text.includes(
        '<script>alert("test")</script>',
      ),
    );
    console.log("Plain-text preservation and HTML template escaping passed.");
  } finally {
    if (createdId) {
      await db.delete(inboxThreads).where(eq(inboxThreads.id, createdId));
      assert.equal(
        (
          await db
            .select()
            .from(inboxMessages)
            .where(eq(inboxMessages.threadId, createdId))
        ).length,
        0,
      );
    }
    assert.deepEqual(await db.select().from(inboxThreads), beforeThreads);
    assert.deepEqual(await db.select().from(inboxMessages), beforeMessages);
    console.log(
      `Only failure-test thread cleaned by cascade; final counts match starting state (${beforeThreads.length} threads / ${beforeMessages.length} messages).`,
    );
  }
}

main()
  .catch(() => {
    console.error("Lead failure verification failed; review test cleanup.");
    process.exitCode = 1;
  })
  .finally(closeDb);
