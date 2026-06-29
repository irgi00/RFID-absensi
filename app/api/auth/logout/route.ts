import { NextResponse } from "next/server";

import { clearAdminSession } from "@/lib/session";

export async function POST() {
  await clearAdminSession();

  return NextResponse.json(
    {
      success: true,
      message: "Sesi admin berhasil diakhiri.",
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
