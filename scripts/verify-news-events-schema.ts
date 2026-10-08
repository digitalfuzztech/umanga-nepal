import "dotenv/config";
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import mysql, { type RowDataPacket } from "mysql2/promise";

// Manual foundation verification only. Test inserts always roll back.
const baselinePath = join(tmpdir(), "umanga-phase-13a-baseline.json");
const existingTables = [
  "gallery_items",
  "our_work_items",
  "story_items",
  "inbox_threads",
  "inbox_messages",
];
const databaseUrl = process.env["DATABASE_URL"];
if (!databaseUrl) throw new Error("DATABASE_URL is not configured.");
const connection = await mysql.createConnection({
  uri: databaseUrl,
  charset: "utf8mb4",
  dateStrings: true,
});

async function snapshot() {
  const result: Record<string, { count: number; sha256: string }> = {};
  for (const table of existingTables) {
    const [rows] = await connection.query<RowDataPacket[]>(
      `SELECT * FROM \`${table}\` ORDER BY id`,
    );
    result[table] = {
      count: rows.length,
      sha256: createHash("sha256").update(JSON.stringify(rows)).digest("hex"),
    };
  }
  return result;
}

try {
  if (process.argv.includes("--before")) {
    const baseline = await snapshot();
    await writeFile(baselinePath, JSON.stringify(baseline));
    console.log("Existing data baseline:", baseline);
  } else {
    const baseline: unknown = JSON.parse(await readFile(baselinePath, "utf8"));
    const before = await snapshot();
    assert.deepEqual(before, baseline);
    for (const table of ["news_items", "event_items"]) {
      const [ddl] = await connection.query<RowDataPacket[]>(
        `SHOW CREATE TABLE \`${table}\``,
      );
      const sql = String(ddl[0]?.["Create Table"]);
      assert.match(sql, /CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci/);
      assert.match(sql, /UNIQUE KEY.*slug_unique/);
      console.log(sql);
      const [count] = await connection.query<RowDataPacket[]>(
        `SELECT COUNT(*) AS total FROM \`${table}\``,
      );
      assert.equal(count[0]?.["total"], 0);
    }

    await connection.beginTransaction();
    try {
      const title = "मानसिक स्वास्थ्य सम्बन्धी समाचार 🌿";
      const excerpt = "उमङ्ग नेपालको परीक्षण समाचार।";
      const content = "पहिलो अनुच्छेद।\n\nदोस्रो अनुच्छेद।";
      const location = "काठमाडौं";
      const newsId = randomUUID();
      const eventId = randomUUID();
      await connection.execute(
        "INSERT INTO news_items (id,slug,title,excerpt,content,category,news_date,image_url,image_storage_key) VALUES (?,?,?,?,?,?,?,?,?)",
        [
          newsId,
          "phase-13a-news-test",
          title,
          excerpt,
          content,
          "परीक्षण",
          "2025-10-10",
          "https://example.invalid/schema-test.png",
          "schema-test-only",
        ],
      );
      await connection.execute(
        "INSERT INTO event_items (id,slug,title,summary,category,event_start,location,registration_open) VALUES (?,?,?,?,?,?,?,?)",
        [
          eventId,
          "phase-13a-event-test",
          title,
          content,
          "परीक्षण",
          "2026-10-10",
          location,
          true,
        ],
      );
      const [news] = await connection.execute<RowDataPacket[]>(
        "SELECT * FROM news_items WHERE id=?",
        [newsId],
      );
      const [events] = await connection.execute<RowDataPacket[]>(
        "SELECT * FROM event_items WHERE id=?",
        [eventId],
      );
      assert.equal(news[0]?.["title"], title);
      assert.equal(news[0]?.["excerpt"], excerpt);
      assert.equal(news[0]?.["content"], content);
      assert.equal(news[0]?.["news_date"], "2025-10-10");
      assert.equal(news[0]?.["location"], null);
      assert.equal(events[0]?.["title"], title);
      assert.equal(events[0]?.["summary"], content);
      assert.equal(events[0]?.["location"], location);
      assert.equal(events[0]?.["event_start"], "2026-10-10");
      assert.equal(events[0]?.["registration_open"], 1);
      for (const [table, id] of [
        ["news_items", newsId],
        ["event_items", eventId],
      ] as const) {
        await assert.rejects(
          connection.execute(
            `INSERT INTO \`${table}\` SELECT ?, ${table === "news_items" ? "slug,title,excerpt,content,category,news_date,image_url,image_storage_key,location,demo_content,published,sort_order,created_at,updated_at" : "slug,title,summary,category,event_start,location,registration_open,demo_content,published,sort_order,created_at,updated_at"} FROM \`${table}\` WHERE id=?`,
            [randomUUID(), id],
          ),
          (error: unknown) =>
            error instanceof Error &&
            "code" in error &&
            error.code === "ER_DUP_ENTRY",
        );
      }
      console.log(
        "Unicode/emoji, paragraphs, dates, NULL and duplicate slugs: PASS",
      );
    } finally {
      await connection.rollback();
    }

    for (const table of ["news_items", "event_items"]) {
      const [rows] = await connection.query<RowDataPacket[]>(
        `SELECT COUNT(*) AS total FROM \`${table}\``,
      );
      assert.equal(rows[0]?.["total"], 0);
    }
    assert.deepEqual(await snapshot(), baseline);
    console.log(
      "Final new table counts: 0/0; existing CMS/Inbox unchanged:",
      before,
    );
  }
} finally {
  await connection.end();
}
