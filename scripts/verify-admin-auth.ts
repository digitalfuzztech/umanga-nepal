import "dotenv/config";

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { count, eq } from "drizzle-orm";

import {
  ADMIN_SESSION_TTL_MS,
  InvalidAdminCredentialsError,
  authenticateAdmin,
  createAdminSession,
  deleteAdminSession,
  deleteExpiredAdminSessions,
  getAdminSession,
  getAdminSessionCookieOptions,
  hashAdminSessionToken,
} from "../src/server/auth";
import { closeDb, db } from "../src/server/db";
import { adminSessions, adminUsers } from "../src/server/db/schema";

const email = process.env["ADMIN_SEED_EMAIL"];
const password = process.env["ADMIN_SEED_PASSWORD"];

assert(
  email && password,
  "Seed credentials must be configured for auth verification.",
);

const trackedTokens: string[] = [];

async function expectCredentialRejection(
  candidateEmail: string,
  candidatePassword: string,
): Promise<boolean> {
  try {
    await authenticateAdmin(candidateEmail, candidatePassword);
    return false;
  } catch (error) {
    return (
      error instanceof InvalidAdminCredentialsError &&
      error.message === "Invalid email or password."
    );
  }
}

function makeWrongPassword(value: string): string {
  const finalCharacter = value.at(-1);
  return `${value.slice(0, -1)}${finalCharacter === "a" ? "b" : "a"}`;
}

async function verifyAuthEngine(): Promise<void> {
  const [{ value: initialSessionCount }] = await db
    .select({ value: count() })
    .from(adminSessions);
  assert.equal(
    initialSessionCount,
    0,
    "Auth tests require an empty session table.",
  );

  const admin = await authenticateAdmin(`  ${email.toUpperCase()}  `, password);
  assert.equal(admin.email, email.trim().toLowerCase());
  assert.deepEqual(Object.keys(admin).sort(), ["email", "id"]);

  const wrongPasswordRejected = await expectCredentialRejection(
    email,
    makeWrongPassword(password),
  );
  const unknownEmailRejected = await expectCredentialRejection(
    `missing-${randomUUID()}@example.invalid`,
    password,
  );
  assert(wrongPasswordRejected);
  assert(unknownEmailRejected);

  const createdAt = Date.now();
  const session = await createAdminSession(admin.id);
  trackedTokens.push(session.token);
  assert(
    session.expiresAt.getTime() >= createdAt + ADMIN_SESSION_TTL_MS - 1_000 &&
      session.expiresAt.getTime() <= Date.now() + ADMIN_SESSION_TTL_MS + 1_000,
  );

  const tokenHash = hashAdminSessionToken(session.token);
  const [storedSession] = await db
    .select({ tokenHash: adminSessions.tokenHash })
    .from(adminSessions)
    .where(eq(adminSessions.tokenHash, tokenHash))
    .limit(1);
  assert(storedSession?.tokenHash);
  assert.notEqual(storedSession.tokenHash, session.token);

  const [{ value: increasedSessionCount }] = await db
    .select({ value: count() })
    .from(adminSessions);
  assert.equal(increasedSessionCount, 1);

  const resolved = await getAdminSession(session.token);
  assert(resolved);
  assert.deepEqual(resolved.admin, admin);
  assert.equal("passwordHash" in resolved.admin, false);
  await deleteAdminSession(session.token);

  const expiredSession = await createAdminSession(admin.id);
  trackedTokens.push(expiredSession.token);
  await db
    .update(adminSessions)
    .set({ expiresAt: new Date(Date.now() - 60_000) })
    .where(
      eq(adminSessions.tokenHash, hashAdminSessionToken(expiredSession.token)),
    );
  assert.equal(await getAdminSession(expiredSession.token), null);

  const [expiredStored] = await db
    .select({ id: adminSessions.id })
    .from(adminSessions)
    .where(
      eq(adminSessions.tokenHash, hashAdminSessionToken(expiredSession.token)),
    )
    .limit(1);
  assert.equal(expiredStored, undefined);

  const logoutSession = await createAdminSession(admin.id);
  trackedTokens.push(logoutSession.token);
  await deleteAdminSession(logoutSession.token);
  assert.equal(await getAdminSession(logoutSession.token), null);

  const previousNodeEnv = process.env["NODE_ENV"];
  process.env["NODE_ENV"] = "production";
  const cookieOptions = getAdminSessionCookieOptions(session.expiresAt);

  if (previousNodeEnv === undefined) {
    delete process.env["NODE_ENV"];
  } else {
    process.env["NODE_ENV"] = previousNodeEnv;
  }

  assert.equal(cookieOptions.httpOnly, true);
  assert.equal(cookieOptions.sameSite, "lax");
  assert.equal(cookieOptions.secure, true);
  assert.equal(cookieOptions.path, "/");
  assert.equal(cookieOptions.expires, session.expiresAt);

  await deleteExpiredAdminSessions();

  const [{ value: adminCount }] = await db
    .select({ value: count() })
    .from(adminUsers);
  const [{ value: finalSessionCount }] = await db
    .select({ value: count() })
    .from(adminSessions);
  assert.equal(adminCount, 1);
  assert.equal(finalSessionCount, 0);

  console.log(
    JSON.stringify({
      correctPassword: "passed",
      wrongPassword: "rejected",
      unknownEmail: "rejected",
      sessionCreation: "passed",
      storedTokenHash: "passed",
      sessionLookup: "passed",
      expiration: "passed",
      logoutDeletion: "passed",
      cookieConfiguration: "passed",
      finalAdminUsers: adminCount,
      finalAdminSessions: finalSessionCount,
    }),
  );
}

verifyAuthEngine()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Auth verification failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    for (const token of trackedTokens) {
      await deleteAdminSession(token);
    }

    await closeDb();
  });
