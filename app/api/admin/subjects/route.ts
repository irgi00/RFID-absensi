import { NextResponse } from "next/server";

import { getCurrentAdmin } from "@/lib/admins";
import { createSubject, listSubjects, subjectPayloadSchema } from "@/lib/subjects";

function getBooleanValue(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value === "true";
  }

  return false;
}

function getNumberValue(value: unknown) {
  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    return Number(value);
  }

  return Number.NaN;
}

export async function GET(request: Request) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return NextResponse.json({ message: "Autentikasi admin diperlukan." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const data = await listSubjects({
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
    return NextResponse.json({ message: "Payload mata kuliah tidak valid." }, { status: 400 });
  }

  const parsedBody = subjectPayloadSchema.safeParse({
    ...(typeof body === "object" && body ? body : {}),
    credits: getNumberValue(
      typeof body === "object" && body ? (body as { credits?: unknown }).credits : undefined,
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
        message: issue?.message ?? "Data mata kuliah tidak valid.",
        fieldErrors:
          typeof field === "string" ? { [field]: issue?.message ?? "Data tidak valid." } : {},
      },
      { status: 400 },
    );
  }

  const result = await createSubject(parsedBody.data);

  if (!result.ok) {
    return NextResponse.json(
      { message: result.message, fieldErrors: result.fieldErrors ?? {} },
      { status: 400 },
    );
  }

  return NextResponse.json(
    {
      message: result.message,
      subject: result.data,
    },
    { status: 201 },
  );
}
