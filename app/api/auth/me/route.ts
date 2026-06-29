import { NextResponse } from "next/server";

import { getCurrentAdmin } from "@/lib/admins";

export async function GET() {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return NextResponse.json(
      {
        message: "Sesi admin tidak ditemukan.",
      },
      { status: 401 },
    );
  }

  return NextResponse.json({
    admin: {
      id: admin.id,
      fullName: admin.fullName,
      username: admin.username,
      email: admin.email,
      lastLoginAt: admin.lastLoginAt,
    },
  });
}
