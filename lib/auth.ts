import { SignJWT, jwtVerify } from "jose";

export const ADMIN_SESSION_COOKIE_NAME = "admin_session";
const ADMIN_SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

export type AdminSessionPayload = {
  sub: string;
  username: string;
  role: "admin";
};

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error(
      "JWT_SECRET belum diatur. Isi variabel ini di .env atau .env.local sebelum memakai autentikasi admin.",
    );
  }

  if (secret.length < 32) {
    throw new Error("JWT_SECRET harus memiliki minimal 32 karakter.");
  }

  return new TextEncoder().encode(secret);
}

export function getAdminSessionExpiryDate() {
  return new Date(Date.now() + ADMIN_SESSION_DURATION_MS);
}

type AdminSessionCookieOverrides = {
  expires?: Date;
  maxAge?: number;
};

export function getAdminSessionCookieOptions(
  overrides: AdminSessionCookieOverrides = {},
) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    expires: overrides.expires ?? getAdminSessionExpiryDate(),
    ...(typeof overrides.maxAge === "number" ? { maxAge: overrides.maxAge } : {}),
  };
}

export async function signAdminSessionToken(input: {
  adminId: string;
  username: string;
}) {
  return new SignJWT({
    username: input.username,
    role: "admin",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(input.adminId)
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(getJwtSecret());
}

export async function verifyAdminSessionToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret(), {
      algorithms: ["HS256"],
    });

    if (
      typeof payload.sub !== "string" ||
      typeof payload.username !== "string" ||
      payload.role !== "admin"
    ) {
      return null;
    }

    return {
      sub: payload.sub,
      username: payload.username,
      role: "admin" as const,
    } satisfies AdminSessionPayload;
  } catch {
    return null;
  }
}
