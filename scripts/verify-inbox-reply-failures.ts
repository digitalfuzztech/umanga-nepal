// Manual server-only fault checks. No real SMTP message is sent.
import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createConnection } from "node:net";
import { eq } from "drizzle-orm";
import { db, closeDb } from "../src/server/db";
import { inboxThreads, inboxMessages } from "../src/server/db/schema";
import {
  createInboxReplyService,
  resolveInboxReply,
  buildInboxReplyMail,
} from "../src/server/inbox/reply";

async function main() {
  const url = new URL(process.env["DATABASE_URL"] ?? "");
  if (url.hostname === "127.0.0.1" && url.port === "3307")
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
  const threadId = randomUUID();
  const beforeThreads = await db.select().from(inboxThreads);
  const beforeMessages = await db.select().from(inboxMessages);
  const authenticate = async () => ({
    id: randomUUID(),
    email: "Verification staff",
  });
  const request = () => ({
    threadId,
    requestId: randomUUID(),
    replyBody: "नमस्ते 🌿\n\nPhase 12D fault verification. Safe to delete.",
  });
  let sends = 0;
  try {
    await db.insert(inboxThreads).values({
      id: threadId,
      channel: "contact",
      mailbox: "contact@umanganepal.org",
      leadEmail: "info@umanganepal.org",
      subject: "Re: Re: Verification",
      metadata: { source: "manual-failure-verification" },
    });
    const service = createInboxReplyService({
      authenticate,
      send: async () => {
        sends++;
        throw new Error("SIMULATED_PRIVATE_SMTP_DETAIL");
      },
    });
    const failedRequest = request();
    const failure = await service(failedRequest);
    assert(!failure.success && failure.code === "SEND_FAILED");
    const [failed] = await db
      .select()
      .from(inboxMessages)
      .where(eq(inboxMessages.id, failedRequest.requestId));
    assert(failed);
    assert.equal(failed.deliveryStatus, "failed");
    assert.equal(failed.smtpMessageId, null);
    assert.equal(failed.deliveryErrorCode, "REPLY_SEND_FAILED");
    assert.equal(failed.body, failedRequest.replyBody);
    assert.equal(failed.subject, "Re: Verification");
    assert.equal((await service(failedRequest)).success, false);
    assert.equal(sends, 1);
    const mail = buildInboxReplyMail(
      "Re: Test",
      '<script>alert("test")</script>\n\nनेपाली 🌿',
    );
    assert(!mail.html.includes("<script>"));
    assert(mail.text.includes("<script>"));
    assert.throws(() =>
      Reflect.apply(resolveInboxReply, undefined, [
        { channel: "random", leadEmail: "info@umanganepal.org", subject: null },
      ]),
    );
    const corrupt = createInboxReplyService({
      authenticate,
      prepare: async () => {
        Reflect.apply(resolveInboxReply, undefined, [
          {
            channel: "random",
            leadEmail: "info@umanganepal.org",
            subject: null,
          },
        ]);
        return null;
      },
      send: async () => {
        throw new Error("MUST_NOT_SEND");
      },
    });
    assert.equal((await corrupt(request())).success, false);
    const dbFailure = createInboxReplyService({
      authenticate,
      prepare: async () => {
        throw new Error("SIMULATED_DB_FAILURE");
      },
      send: async () => {
        throw new Error("MUST_NOT_SEND");
      },
    });
    assert.equal((await dbFailure(request())).success, false);
    const acceptedRequest = request();
    let acceptedSends = 0;
    const accepted = createInboxReplyService({
      authenticate,
      send: async () => {
        acceptedSends++;
        return {
          messageId: "<simulated-phase12d@umanganepal.org>",
          accepted: ["info@umanganepal.org"],
          rejected: [],
          response: "simulated",
        };
      },
      finish: async () => {
        throw new Error("SIMULATED_POST_SMTP_DB_FAILURE");
      },
    });
    const acceptedResult = await accepted(acceptedRequest);
    assert(acceptedResult.success && acceptedResult.warning);
    assert.equal(
      (
        await db
          .select()
          .from(inboxMessages)
          .where(eq(inboxMessages.id, acceptedRequest.requestId))
      )[0]!.deliveryStatus,
      "pending",
    );
    assert.equal((await accepted(acceptedRequest)).success, false);
    assert.equal(acceptedSends, 1);
    let concurrentSends = 0;
    const concurrent = createInboxReplyService({
      authenticate,
      send: async () => {
        concurrentSends++;
        await new Promise((resolve) => setTimeout(resolve, 100));
        return {
          messageId: "<simulated-concurrent@umanganepal.org>",
          accepted: ["info@umanganepal.org"],
          rejected: [],
          response: "simulated",
        };
      },
    });
    const repeated = request();
    await Promise.all([concurrent(repeated), concurrent(repeated)]);
    assert.equal(concurrentSends, 1);
    assert((await concurrent(repeated)).success);
    assert.equal(concurrentSends, 1);
    const messagesBeforeInvalid = await db.select().from(inboxMessages);
    for (const extra of [
      { replyBody: "   " },
      { fromAddress: "attacker@example.com" },
      { toAddress: "attacker@example.com" },
      { channel: "info" },
      { replyTo: "attacker@example.com" },
    ])
      assert(!(await service({ ...request(), ...extra })).success);
    assert.deepEqual(
      await db.select().from(inboxMessages),
      messagesBeforeInvalid,
    );
    assert(
      !(
        await createInboxReplyService({ authenticate: async () => null })(
          request(),
        )
      ).success,
    );
    console.log(
      "PASS: failed attempt retained; safe error; Unicode/paragraphs; escaped HTML; one Re prefix; corrupt channel/invalid input/auth/DB failure rejected; concurrent request sends once; post-SMTP DB failure stays pending without retry.",
    );
  } finally {
    await db.delete(inboxThreads).where(eq(inboxThreads.id, threadId));
    assert.deepEqual(await db.select().from(inboxThreads), beforeThreads);
    assert.deepEqual(await db.select().from(inboxMessages), beforeMessages);
    console.log(
      "Only fault-test thread removed by cascade; starting Inbox state preserved.",
    );
  }
}
main()
  .catch(() => {
    console.error(
      "Inbox reply fault verification failed; inspect controlled cleanup.",
    );
    process.exitCode = 1;
  })
  .finally(closeDb);
