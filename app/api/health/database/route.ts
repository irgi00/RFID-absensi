import { NextResponse } from "next/server";

import { sql } from "@/lib/db";

export async function GET() {
  try {
    await sql`SELECT 1 AS ok`;

    return NextResponse.json({
      status: "ok",
      message: "Koneksi database aktif.",
      checkedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      {
        status: "error",
        message: "Koneksi database gagal diperiksa.",
        checkedAt: new Date().toISOString(),
      },
      { status: 503 },
    );
  }
}
