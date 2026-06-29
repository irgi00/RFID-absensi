import { NextResponse } from "next/server";

import { getCurrentAdmin } from "@/lib/admins";
import { deactivateStudent } from "@/lib/students";

export async function POST(
  _request: Request,
  context: { params: Promise<{ studentId: string }> },
) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return NextResponse.json(
      { message: "Autentikasi admin diperlukan." },
      { status: 401 },
    );
  }

  const { studentId } = await context.params;
  const result = await deactivateStudent(studentId);

  if (!result.ok) {
    return NextResponse.json(
      { message: result.message },
      { status: result.message === "Data mahasiswa tidak ditemukan." ? 404 : 400 },
    );
  }

  return NextResponse.json({
    message: result.message,
    student: result.data,
  });
}
