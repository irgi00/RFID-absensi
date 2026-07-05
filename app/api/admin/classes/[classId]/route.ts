import { NextResponse } from "next/server";

import { getCurrentAdmin } from "@/lib/admins";
import { classPayloadSchema, deleteClass, updateClass } from "@/lib/classes";

function getBooleanValue(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value === "true";
  }

  return false;
}

function getNullableStringValue(value: unknown) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed ? trimmed : null;
}

function getNullableNumberValue(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();

    if (!trimmed) {
      return null;
    }

    return Number(trimmed);
  }

  return null;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ classId: string }> },
) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return NextResponse.json({ message: "Autentikasi admin diperlukan." }, { status: 401 });
  }

  const { classId } = await context.params;

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Payload kelas tidak valid." }, { status: 400 });
  }

  const parsedBody = classPayloadSchema.safeParse({
    ...(typeof body === "object" && body ? body : {}),
    studyProgram: getNullableStringValue(
      typeof body === "object" && body ? (body as { studyProgram?: unknown }).studyProgram : undefined,
    ),
    cohortYear: getNullableNumberValue(
      typeof body === "object" && body ? (body as { cohortYear?: unknown }).cohortYear : undefined,
    ),
    isActive: getBooleanValue(
      typeof body === "object" && body ? (body as { isActive?: unknown }).isActive : false,
    ),
  });

  if (!parsedBody.success) {
    const issue = parsedBody.error.issues[0];
    const field = issue?.path[0];

    return NextResponse.json(
      {
        message: issue?.message ?? "Data kelas tidak valid.",
        fieldErrors:
          typeof field === "string" ? { [field]: issue?.message ?? "Data tidak valid." } : {},
      },
      { status: 400 },
    );
  }

  const result = await updateClass(classId, parsedBody.data);

  if (!result.ok) {
    return NextResponse.json(
      { message: result.message, fieldErrors: result.fieldErrors ?? {} },
      { status: 400 },
    );
  }

  return NextResponse.json({
    message: result.message,
    class: result.data,
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ classId: string }> },
) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return NextResponse.json({ message: "Autentikasi admin diperlukan." }, { status: 401 });
  }

  const { classId } = await context.params;
  const result = await deleteClass(classId);

  if (!result.ok) {
    return NextResponse.json(
      { message: result.message, fieldErrors: result.fieldErrors ?? {} },
      { status: 400 },
    );
  }

  return NextResponse.json({
    message: result.message,
    class: result.data,
  });
}
