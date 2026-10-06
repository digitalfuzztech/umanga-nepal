import { drizzle, type MySql2Database } from "drizzle-orm/mysql2";
import mysql, { type Pool } from "mysql2/promise";
import * as schema from "./schema";

if (typeof window !== "undefined") {
  throw new Error("The database module can only be used on the server.");
}

declare global {
  var __umangaMySqlPool: Pool | undefined;
}

type Database = MySql2Database<typeof schema>;

let database: Database | undefined;

function requireDatabaseUrl(): string {
  const databaseUrl = process.env["DATABASE_URL"];

  if (!databaseUrl) {
    throw new Error(
      "DATABASE_URL is not configured. Set a server-only MySQL connection URL before using the database.",
    );
  }

  return databaseUrl;
}

function getPool(): Pool {
  if (!globalThis.__umangaMySqlPool) {
    globalThis.__umangaMySqlPool = mysql.createPool({
      uri: requireDatabaseUrl(),
      connectionLimit: 5,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0,
    });
  }

  return globalThis.__umangaMySqlPool;
}

export function getDb(): Database {
  database ??= drizzle(getPool(), { schema, mode: "default" });
  return database;
}

export async function closeDb(): Promise<void> {
  if (!globalThis.__umangaMySqlPool) {
    return;
  }

  await globalThis.__umangaMySqlPool.end();
  globalThis.__umangaMySqlPool = undefined;
  database = undefined;
}

/**
 * Lazily resolves the shared Drizzle client so importing server modules does
 * not require DATABASE_URL until database functionality is actually used.
 */
export const db = new Proxy({} as Database, {
  get(_target, property) {
    const client = getDb();
    const value = Reflect.get(client, property, client);
    return typeof value === "function" ? value.bind(client) : value;
  },
});
