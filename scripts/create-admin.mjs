import { neon } from "@neondatabase/serverless";
import bcrypt from "bcryptjs";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error(
    "DATABASE_URL belum diatur. Isi .env atau .env.local sebelum membuat akun admin.",
  );
  process.exit(1);
}

const sql = neon(databaseUrl);

function getRequiredText(value, fieldName) {
  if (!value.trim()) {
    throw new Error(`${fieldName} wajib diisi.`);
  }

  return value.trim();
}

async function promptText(rl, label, fallback = "") {
  const suffix = fallback ? ` [${fallback}]` : "";
  const answer = (await rl.question(`${label}${suffix}: `)).trim();

  return answer || fallback;
}

async function promptHidden(label) {
  return new Promise((resolve) => {
    let value = "";

    const handleData = (buffer) => {
      const char = buffer.toString("utf8");

      if (char === "\u0003") {
        output.write("\n");
        process.exit(130);
      }

      if (char === "\r" || char === "\n") {
        output.write("\n");
        input.setRawMode?.(false);
        input.pause();
        input.removeListener("data", handleData);
        resolve(value);
        return;
      }

      if (char === "\u0008" || char === "\u007f") {
        if (value.length > 0) {
          value = value.slice(0, -1);
          output.write("\b \b");
        }

        return;
      }

      if (char >= " ") {
        value += char;
        output.write("*");
      }
    };

    output.write(`${label}: `);
    input.resume();
    input.setRawMode?.(true);
    input.setEncoding("utf8");
    input.on("data", handleData);
  });
}

try {
  const rl = createInterface({ input, output });

  const fullName = getRequiredText(
    await promptText(rl, "Nama lengkap admin", process.env.ADMIN_FULL_NAME ?? ""),
    "Nama lengkap admin",
  );
  const username = getRequiredText(
    await promptText(rl, "Username admin", process.env.ADMIN_USERNAME ?? ""),
    "Username admin",
  );
  const email = getRequiredText(
    await promptText(rl, "Email admin", process.env.ADMIN_EMAIL ?? ""),
    "Email admin",
  );

  let password = (process.env.ADMIN_PASSWORD ?? "").trim();
  let confirmPassword = (process.env.ADMIN_PASSWORD_CONFIRM ?? "").trim();

  if (!password) {
    password = (await promptHidden("Password admin")).trim();
  }

  if (!confirmPassword) {
    confirmPassword = (await promptHidden("Konfirmasi password admin")).trim();
  }

  rl.close();

  if (!password) {
    throw new Error("Password admin wajib diisi.");
  }

  if (password.length < 8) {
    throw new Error("Password admin minimal 8 karakter.");
  }

  if (password !== confirmPassword) {
    throw new Error("Konfirmasi password tidak sama.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const existingAdmins = await sql`
    SELECT id, username, email
    FROM admins
    WHERE username = ${username} OR email = ${email}
  `;

  if (existingAdmins.length > 1) {
    throw new Error(
      "Ditemukan lebih dari satu akun admin dengan username atau email yang sama. Rapikan data admin terlebih dahulu.",
    );
  }

  let adminRow;
  let mode;

  if (existingAdmins.length === 1) {
    mode = "updated";
    adminRow = (
      await sql`
        UPDATE admins
        SET
          full_name = ${fullName},
          username = ${username},
          email = ${email},
          password_hash = ${passwordHash},
          is_active = TRUE,
          updated_at = NOW()
        WHERE id = ${existingAdmins[0].id}
        RETURNING id, full_name, username, email
      `
    )[0];
  } else {
    mode = "created";
    adminRow = (
      await sql`
        INSERT INTO admins (full_name, username, email, password_hash, is_active)
        VALUES (${fullName}, ${username}, ${email}, ${passwordHash}, TRUE)
        RETURNING id, full_name, username, email
      `
    )[0];
  }

  console.log("");
  console.log(
    mode === "created"
      ? "Akun admin awal berhasil dibuat."
      : "Akun admin berhasil diperbarui.",
  );
  console.log(`Nama    : ${adminRow.full_name}`);
  console.log(`Username: ${adminRow.username}`);
  console.log(`Email   : ${adminRow.email}`);
  console.log("Password tidak pernah disimpan dalam bentuk plaintext.");
} catch (error) {
  console.error("");
  console.error(
    error instanceof Error ? error.message : "Gagal membuat akun admin.",
  );
  process.exit(1);
}
