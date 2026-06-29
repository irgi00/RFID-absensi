import { NextResponse } from "next/server";
import { z } from "zod";

import { authenticateAdmin, updateAdminLastLogin } from "@/lib/admins";
import { createAdminSession } from "@/lib/session";

const adminLoginSchema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "Username atau email wajib diisi."),
  password: z.string().min(1, "Password wajib diisi."),
});

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        message: "Permintaan login tidak valid.",
      },
      { status: 400 },
    );
  }

  const parsedBody = adminLoginSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json(
      {
        message: parsedBody.error.issues[0]?.message ?? "Data login tidak valid.",
      },
      { status: 400 },
    );
  }

  const result = await authenticateAdmin(
    parsedBody.data.identifier,
    parsedBody.data.password,
  );

  if (!result.ok) {
    const message =
      result.reason === "inactive_admin"
        ? "Akun admin sedang nonaktif."
        : "Username, email, atau password tidak sesuai.";

    return NextResponse.json({ message }, { status: 401 });
  }

  await updateAdminLastLogin(result.admin.id);
  await createAdminSession({
    adminId: result.admin.id,
    username: result.admin.username,
  });

  return NextResponse.json({
    message: "Login admin berhasil.",
    admin: {
      fullName: result.admin.fullName,
      username: result.admin.username,
    },
  });
}
