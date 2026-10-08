// Local verification only: share one connection on the hosting test account.
import "dotenv/config";
import mysql from "mysql2/promise";
import { createServer } from "vite";

globalThis.__umangaMySqlPool = mysql.createPool({
  uri: process.env["DATABASE_URL"]!,
  connectionLimit: 1,
});
const server = await createServer({
  server: { host: "127.0.0.1", port: 5177, strictPort: true },
});
await server.listen();
server.printUrls();
