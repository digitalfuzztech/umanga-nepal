import "@tanstack/react-start/server-only";

import { createHash, randomBytes, randomUUID } from "node:crypto";
import {
  deleteCookie,
  getCookie,
  setCookie,
} from "@tanstack/react-start/server";
import bcrypt from "bcryptjs";
import { eq, lte } from "drizzle-orm";

import { db } from "../db";
import { adminSessions, adminUsers } from "../db/schema";
import { adminLoginSchema } from "@/lib/admin-auth-input";

export const ADMIN_SESSION_COOKIE_NAME = "umanga_admin_session";
export const ADMIN_SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1_000;

export type SafeAdmin = {
  id: string;
  email: string;
};

export type AdminSessionResult = {
  admin: SafeAdmin;
  session: {
    id: string;
    expiresAt: Date;
  };
};

export class InvalidAdminCredentialsError extends Error {
  constructor() {
    super("Invalid email or password.");
    this.name = "InvalidAdminCredentialsError";
  }
}

export async function authenticateAdmin(
  email: string,
  password: string,
): Promise<SafeAdmin> {
  const parsed = adminLoginSchema.safeParse({ email, password });

  if (!parsed.success) {
    throw new InvalidAdminCredentialsError();
  }

  const [admin] = await db
    .select({
      id: adminUsers.id,
      email: adminUsers.email,
      passwordHash: adminUsers.passwordHash,
    })
    .from(adminUsers)
    .where(eq(adminUsers.email, parsed.data.email))
    .limit(1);

  if (!admin) {
    throw new InvalidAdminCredentialsError();
  }

  const passwordMatches = await bcrypt.compare(
    parsed.data.password,
    admin.passwordHash,
  );

  if (!passwordMatches) {
    throw new InvalidAdminCredentialsError();
  }

  return { id: admin.id, email: admin.email };
}

export function hashAdminSessionToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

export async function createAdminSession(
  userId: string,
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashAdminSessionToken(token);
  const expiresAt = new Date(Date.now() + ADMIN_SESSION_TTL_MS);

  await db.insert(adminSessions).values({
    id: randomUUID(),
    userId,
    tokenHash,
    expiresAt,
  });

  return { token, expiresAt };
}

export async function getAdminSession(
  rawToken: string,
): Promise<AdminSessionResult | null> {
  if (!rawToken.trim()) {
    return null;
  }

  const tokenHash = hashAdminSessionToken(rawToken);
  const [result] = await db
    .select({
      sessionId: adminSessions.id,
      expiresAt: adminSessions.expiresAt,
      adminId: adminUsers.id,
      adminEmail: adminUsers.email,
    })
    .from(adminSessions)
    .innerJoin(adminUsers, eq(adminSessions.userId, adminUsers.id))
    .where(eq(adminSessions.tokenHash, tokenHash))
    .limit(1);

  if (!result) {
    return null;
  }

  if (result.expiresAt.getTime() <= Date.now()) {
    await db
      .delete(adminSessions)
      .where(eq(adminSessions.id, result.sessionId));
    return null;
  }

  return {
    admin: { id: result.adminId, email: result.adminEmail },
    session: { id: result.sessionId, expiresAt: result.expiresAt },
  };
}

export async function deleteAdminSession(rawToken: string): Promise<void> {
  if (!rawToken.trim()) {
    return;
  }

  await db
    .delete(adminSessions)
    .where(eq(adminSessions.tokenHash, hashAdminSessionToken(rawToken)));
}

export async function deleteExpiredAdminSessions(
  now = new Date(),
): Promise<void> {
  await db.delete(adminSessions).where(lte(adminSessions.expiresAt, now));
}

export function getAdminSessionCookieOptions(expiresAt: Date) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env["NODE_ENV"] === "production",
    path: "/",
    expires: expiresAt,
  };
}

export async function getCurrentAdmin(): Promise<SafeAdmin | null> {
  const rawToken = getCookie(ADMIN_SESSION_COOKIE_NAME);

  if (!rawToken) {
    return null;
  }

  const result = await getAdminSession(rawToken);
  return result?.admin ?? null;
}

export async function loginAdmin(
  email: string,
  password: string,
): Promise<SafeAdmin> {
  const admin = await authenticateAdmin(email, password);
  const session = await createAdminSession(admin.id);

  try {
    setCookie(
      ADMIN_SESSION_COOKIE_NAME,
      session.token,
      getAdminSessionCookieOptions(session.expiresAt),
    );
  } catch (error) {
    await deleteAdminSession(session.token);
    throw error;
  }

  return admin;
}

export async function logoutAdmin(): Promise<void> {
  const rawToken = getCookie(ADMIN_SESSION_COOKIE_NAME);

  if (rawToken) {
    await deleteAdminSession(rawToken);
  }

  deleteCookie(ADMIN_SESSION_COOKIE_NAME, {
    path: "/",
    sameSite: "lax",
    secure: process.env["NODE_ENV"] === "production",
  });
}
