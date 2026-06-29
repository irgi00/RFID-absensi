import { cookies } from "next/headers";

import {
  ADMIN_SESSION_COOKIE_NAME,
  getAdminSessionCookieOptions,
  signAdminSessionToken,
  verifyAdminSessionToken,
} from "@/lib/auth";

export async function createAdminSession(input: {
  adminId: string;
  username: string;
}) {
  const token = await signAdminSessionToken(input);
  const cookieStore = await cookies();

  cookieStore.set(
    ADMIN_SESSION_COOKIE_NAME,
    token,
    getAdminSessionCookieOptions(),
  );
}

export async function clearAdminSession() {
  const cookieStore = await cookies();

  cookieStore.set(ADMIN_SESSION_COOKIE_NAME, "", {
    ...getAdminSessionCookieOptions({
      expires: new Date(0),
      maxAge: 0,
    }),
  });
}

export async function getAdminSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  return verifyAdminSessionToken(token);
}
