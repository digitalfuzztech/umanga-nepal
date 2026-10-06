import "dotenv/config";
import { defineConfig } from "drizzle-kit";

const databaseUrl = process.env["DATABASE_URL"];

export default defineConfig({
  dialect: "mysql",
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
  ...(databaseUrl ? { dbCredentials: { url: databaseUrl } } : {}),
});
