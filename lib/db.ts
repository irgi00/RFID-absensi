import { neon } from "@neondatabase/serverless";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL belum diatur. Salin .env.example menjadi .env.local lalu isi koneksi Neon PostgreSQL.",
  );
}

declare global {
  var __neonSql: ReturnType<typeof neon> | undefined;
}

export const sql = globalThis.__neonSql ?? neon(databaseUrl);

if (process.env.NODE_ENV !== "production") {
  globalThis.__neonSql = sql;
}
