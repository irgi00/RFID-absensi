import { existsSync } from "node:fs";
import process from "node:process";

import { neon } from "@neondatabase/serverless";

const seedClasses = [
  {
    code: "15.5A.01",
    name: "Kelas 15.5A.01",
  },
  {
    code: "15.5B.01",
    name: "Kelas 15.5B.01",
  },
  {
    code: "15.5C.01",
    name: "Kelas 15.5C.01",
  },
];

function loadPreferredEnvFile() {
  if (process.env.DATABASE_URL) {
    return null;
  }

  for (const envFile of [".env.local", ".env"]) {
    if (!existsSync(envFile)) {
      continue;
    }

    process.loadEnvFile?.(envFile);
    return envFile;
  }

  return null;
}

const loadedEnvFile = loadPreferredEnvFile();
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error(
    "DATABASE_URL belum diatur. Isi .env.local atau .env sebelum menjalankan seed kelas.",
  );
  process.exit(1);
}

const sql = neon(databaseUrl);

try {
  for (const classItem of seedClasses) {
    await sql`
      INSERT INTO classes (code, name, study_program, cohort_year, is_active)
      VALUES (${classItem.code}, ${classItem.name}, ${null}, ${null}, TRUE)
      ON CONFLICT (code) DO UPDATE
      SET
        is_active = EXCLUDED.is_active,
        updated_at = NOW()
    `;
  }

  const rows = await sql`
    SELECT
      code,
      name,
      is_active AS "isActive"
    FROM classes
    WHERE code = ${seedClasses[0].code}
      OR code = ${seedClasses[1].code}
      OR code = ${seedClasses[2].code}
    ORDER BY code ASC
  `;

  console.log("");

  if (loadedEnvFile) {
    console.log(`Menggunakan konfigurasi database dari ${loadedEnvFile}.`);
  }

  console.log("Seed kelas selesai. Kelas contoh berikut sudah dipastikan tersedia:");

  for (const row of rows) {
    console.log(`- ${row.code} | ${row.name} | ${row.isActive ? "Aktif" : "Nonaktif"}`);
  }
} catch (error) {
  console.error("");
  console.error(
    error instanceof Error ? error.message : "Seed kelas gagal dijalankan.",
  );
  process.exit(1);
}
