import { NextResponse } from "next/server";

import { getCurrentAdmin } from "@/lib/admins";
import {
  registerOrReplaceStudentCard,
  studentCardPayloadSchema,
} from "@/lib/students";

export async function POST(
  request: Request,
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
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { message: "Payload kartu RFID tidak valid." },
      { status: 400 },
    );
  }

  const parsedBody = studentCardPayloadSchema.safeParse(body);

  if (!parsedBody.success) {
    const issue = parsedBody.error.issues[0];
    const field = issue?.path[0];

    return NextResponse.json(
      {
        message: issue?.message ?? "Data kartu RFID tidak valid.",
        fieldErrors:
          typeof field === "string" ? { [field]: issue?.message ?? "Data tidak valid." } : {},
      },
      { status: 400 },
    );
  }

  const result = await registerOrReplaceStudentCard(studentId, parsedBody.data);

  if (!result.ok) {
    return NextResponse.json(
      {
        message: result.message,
        fieldErrors: result.fieldErrors ?? {},
      },
      { status: result.message === "Data mahasiswa tidak ditemukan." ? 404 : 400 },
    );
  }

  return NextResponse.json({
    message: result.message,
    student: result.data,
  });
}
