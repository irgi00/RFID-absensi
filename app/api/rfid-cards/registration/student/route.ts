import { NextResponse } from "next/server";

import { getCurrentAdmin } from "@/lib/admins";
import { findRegistrationStudentByNim } from "@/lib/rfid-registration";
import type { RfidRegistrationStudentResponse } from "@/types/rfid-registration";

export async function GET(request: Request) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return NextResponse.json(
      { message: "Autentikasi admin diperlukan." },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const nim = searchParams.get("nim")?.trim() ?? "";

  if (!nim) {
    return NextResponse.json(
      { message: "Masukkan NIM mahasiswa terlebih dahulu." },
      { status: 400 },
    );
  }

  const student = await findRegistrationStudentByNim(nim);

  if (!student) {
    return NextResponse.json(
      { message: "Mahasiswa dengan NIM tersebut tidak ditemukan." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    student,
  } satisfies RfidRegistrationStudentResponse);
}
