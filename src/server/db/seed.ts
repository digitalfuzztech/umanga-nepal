import "dotenv/config";

import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { closeDb, db } from "./index";
import { adminUsers } from "./schema";

const BCRYPT_ROUNDS = 12;

function readSeedCredentials(): { email: string; password: string } {
  const email = process.env["ADMIN_SEED_EMAIL"]?.trim().toLowerCase();
  const password = process.env["ADMIN_SEED_PASSWORD"];

  if (!email || !password) {
    throw new Error("Missing ADMIN_SEED_EMAIL or ADMIN_SEED_PASSWORD.");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("ADMIN_SEED_EMAIL must be a valid email address.");
  }

  if (password.length < 8) {
    throw new Error("ADMIN_SEED_PASSWORD must be at least 8 characters long.");
  }

  return { email, password };
}

async function seedAdmin(): Promise<void> {
  const { email, password } = readSeedCredentials();
  const existingAdmin = await db
    .select({ id: adminUsers.id })
    .from(adminUsers)
    .where(eq(adminUsers.email, email))
    .limit(1);

  if (existingAdmin.length > 0) {
    console.log("Admin user already exists. Seed skipped.");
    return;
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  await db.insert(adminUsers).values({
    id: randomUUID(),
    email,
    passwordHash,
  });

  console.log("Admin user created successfully.");
}

seedAdmin()
  .catch((error: unknown) => {
    const message =
      error instanceof Error ? error.message : "Unknown seed error.";
    console.error(`Admin seed failed: ${message}`);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });
