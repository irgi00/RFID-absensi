import { sql } from "@/lib/db";
import { verifyPassword } from "@/lib/password";
import { getAdminSession } from "@/lib/session";

type LoginAdminRow = {
  id: string;
  fullName: string;
  username: string;
  email: string;
  passwordHash: string;
  isActive: boolean;
  lastLoginAt: string | null;
};

export type AuthenticatedAdmin = {
  id: string;
  fullName: string;
  username: string;
  email: string;
  lastLoginAt: string | null;
};

function toAuthenticatedAdmin(
  row: Omit<LoginAdminRow, "passwordHash" | "isActive">,
) {
  return {
    id: row.id,
    fullName: row.fullName,
    username: row.username,
    email: row.email,
    lastLoginAt: row.lastLoginAt,
  } satisfies AuthenticatedAdmin;
}

export async function findAdminForLogin(identifier: string) {
  const rows = (await sql`
    SELECT
      id,
      full_name AS "fullName",
      username,
      email,
      password_hash AS "passwordHash",
      is_active AS "isActive",
      last_login_at AS "lastLoginAt"
    FROM admins
    WHERE username = ${identifier} OR email = ${identifier}
    LIMIT 1
  `) as LoginAdminRow[];

  return rows[0] ?? null;
}

export async function authenticateAdmin(
  identifier: string,
  password: string,
) {
  const admin = await findAdminForLogin(identifier);

  if (!admin) {
    return { ok: false as const, reason: "invalid_credentials" as const };
  }

  if (!admin.isActive) {
    return { ok: false as const, reason: "inactive_admin" as const };
  }

  const isPasswordValid = await verifyPassword(password, admin.passwordHash);

  if (!isPasswordValid) {
    return { ok: false as const, reason: "invalid_credentials" as const };
  }

  return {
    ok: true as const,
    admin: toAuthenticatedAdmin(admin),
  };
}

export async function updateAdminLastLogin(adminId: string) {
  await sql`
    UPDATE admins
    SET last_login_at = NOW()
    WHERE id = ${adminId}
  `;
}

export async function getCurrentAdmin() {
  const session = await getAdminSession();

  if (!session) {
    return null;
  }

  const rows = (await sql`
    SELECT
      id,
      full_name AS "fullName",
      username,
      email,
      last_login_at AS "lastLoginAt"
    FROM admins
    WHERE id = ${session.sub} AND is_active = TRUE
    LIMIT 1
  `) as AuthenticatedAdmin[];

  return rows[0] ?? null;
}
