import { NextResponse } from "next/server";

import { getCurrentAdmin } from "@/lib/admins";
import { classPayloadSchema, createClass, listClasses } from "@/lib/classes";

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

export async function GET(request: Request) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return NextResponse.json({ message: "Autentikasi admin diperlukan." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const data = await listClasses({
    search: searchParams.get("search") ?? "",
    status: searchParams.get("status") ?? "ALL",
  });

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return NextResponse.json({ message: "Autentikasi admin diperlukan." }, { status: 401 });
  }

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

  const result = await createClass(parsedBody.data);

  if (!result.ok) {
    return NextResponse.json(
      { message: result.message, fieldErrors: result.fieldErrors ?? {} },
      { status: 400 },
    );
  }

  return NextResponse.json(
    {
      message: result.message,
      class: result.data,
    },
    { status: 201 },
  );
}
