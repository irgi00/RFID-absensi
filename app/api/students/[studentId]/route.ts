import { NextResponse } from "next/server";

import { getCurrentAdmin } from "@/lib/admins";
import { studentPayloadSchema, updateStudent } from "@/lib/students";

function getBooleanValue(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value === "true";
  }

  return false;
}

export async function PATCH(
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
      { message: "Payload mahasiswa tidak valid." },
      { status: 400 },
    );
  }

  const parsedBody = studentPayloadSchema.safeParse({
    ...(typeof body === "object" && body ? body : {}),
    isActive: getBooleanValue(
      typeof body === "object" && body ? (body as { isActive?: unknown }).isActive : false,
    ),
  });

  if (!parsedBody.success) {
    const issue = parsedBody.error.issues[0];
    const field = issue?.path[0];

    return NextResponse.json(
      {
        message: issue?.message ?? "Data mahasiswa tidak valid.",
        fieldErrors:
          typeof field === "string" ? { [field]: issue?.message ?? "Data tidak valid." } : {},
      },
      { status: 400 },
    );
  }

  const result = await updateStudent(studentId, parsedBody.data);

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
