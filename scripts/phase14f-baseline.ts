import "dotenv/config";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, posix } from "node:path";
import mysql from "mysql2/promise";
import { Client } from "basic-ftp";

export const baselinePath = join(tmpdir(), "umanga-phase14f-baseline.json");
export const tables = [
  "news_items",
  "event_items",
  "gallery_items",
  "gallery_albums",
  "our_work_items",
  "story_items",
  "resource_items",
  "inbox_threads",
  "inbox_messages",
  "admin_sessions",
];
export const hash = (bytes: Buffer | string) =>
  createHash("sha256").update(bytes).digest("hex");
export function pool() {
  globalThis.__umangaMySqlPool ??= mysql.createPool({
    uri: process.env["DATABASE_URL"]!,
    connectionLimit: 1,
  });
  return globalThis.__umangaMySqlPool;
}
export async function inventory(category: string) {
  const client = new Client(20000),
    keys: string[] = [];
  try {
    await client.access({
      host: process.env["MEDIA_FTP_HOST"]!,
      port: Number(process.env["MEDIA_FTP_PORT"]),
      user: process.env["MEDIA_FTP_USERNAME"]!,
      password: process.env["MEDIA_FTP_PASSWORD"]!,
      secure: true,
    });
    async function walk(directory: string) {
      for (const file of await client.list(
        posix.join(process.env["MEDIA_FTP_ROOT"]!, directory),
      )) {
        const key = posix.join(directory, file.name);
        if (file.isDirectory) await walk(key);
        else keys.push(key);
      }
    }
    await walk(category);
    return keys.sort();
  } finally {
    client.close();
  }
}
export async function snapshot() {
  const rows: Record<string, mysql.RowDataPacket[]> = {};
  for (const table of tables) {
    const [result] = await pool().query<mysql.RowDataPacket[]>(
      `SELECT * FROM ${table} ORDER BY id`,
    );
    rows[table] = result;
  }
  assert.deepEqual(
    tables.slice(0, 9).map((t) => rows[t]!.length),
    [3, 4, 26, 1, 8, 5, 10, 3, 4],
  );
  const media = await inventory("gallery");
  assert.deepEqual(
    media,
    rows["gallery_items"]!.map((r) => String(r["image_storage_key"])).sort(),
  );
  const hashes: Record<string, string> = {};
  for (const photo of rows["gallery_items"]!) {
    const response = await fetch(String(photo["image_url"]));
    assert.equal(response.status, 200);
    hashes[String(photo["image_storage_key"])] = hash(
      Buffer.from(await response.arrayBuffer()),
    );
  }
  return { rows, media, hashes };
}
if (process.argv.includes("--capture")) {
  await writeFile(baselinePath, JSON.stringify(await snapshot()));
  console.log(
    "Baseline captured: 3/4/26/8/5/10/3/4; Gallery inventory and all 26 SHA-256 hashes.",
  );
  await pool().end();
}
if (process.argv.includes("--compare")) {
  assert.deepEqual(
    JSON.parse(JSON.stringify(await snapshot())),
    JSON.parse(await readFile(baselinePath, "utf8")),
  );
  console.log(
    "All existing rows, sessions, Gallery keys/URLs/bytes and inventory exactly unchanged.",
  );
  await pool().end();
}
