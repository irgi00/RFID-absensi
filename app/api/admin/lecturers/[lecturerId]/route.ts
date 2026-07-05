import { NextResponse } from "next/server";

import { getCurrentAdmin } from "@/lib/admins";
import { deleteLecturer, lecturerPayloadSchema, updateLecturer } from "@/lib/lecturers";

function getBooleanValue(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value === "true";
  }

  return false;
}

function getStringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ lecturerId: string }> },
) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return NextResponse.json({ message: "Autentikasi admin diperlukan." }, { status: 401 });
  }

  const { lecturerId } = await context.params;
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ message: "Payload dosen tidak valid." }, { status: 400 });
  }

  const parsedBody = lecturerPayloadSchema.safeParse({
    ...(typeof body === "object" && body ? body : {}),
    code: getStringValue(
      typeof body === "object" && body ? (body as { code?: unknown }).code : "",
    ),
    fullName: getStringValue(
      typeof body === "object" && body ? (body as { fullName?: unknown }).fullName : "",
    ),
    email: getStringValue(
      typeof body === "object" && body ? (body as { email?: unknown }).email : "",
    ),
    phone: getStringValue(
      typeof body === "object" && body ? (body as { phone?: unknown }).phone : "",
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
        message: issue?.message ?? "Data dosen tidak valid.",
        fieldErrors:
          typeof field === "string" ? { [field]: issue?.message ?? "Data tidak valid." } : {},
      },
      { status: 400 },
    );
  }

  const result = await updateLecturer(lecturerId, parsedBody.data);

  if (!result.ok) {
    return NextResponse.json(
      { message: result.message, fieldErrors: result.fieldErrors ?? {} },
      { status: result.message === "Data dosen tidak ditemukan." ? 404 : 400 },
    );
  }

  return NextResponse.json({
    message: result.message,
    lecturer: result.data,
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ lecturerId: string }> },
) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return NextResponse.json({ message: "Autentikasi admin diperlukan." }, { status: 401 });
  }

  const { lecturerId } = await context.params;
  const result = await deleteLecturer(lecturerId);

  if (!result.ok) {
    return NextResponse.json(
      { message: result.message, fieldErrors: result.fieldErrors ?? {} },
      {
        status:
          result.message === "Data dosen tidak ditemukan."
            ? 404
            : result.message.includes("tidak dapat dihapus")
              ? 409
              : 400,
      },
    );
  }

  return NextResponse.json({
    message: result.message,
    lecturer: result.data,
  });
}
