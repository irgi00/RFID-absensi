import { NextResponse } from "next/server";

import { getCurrentAdmin } from "@/lib/admins";
import {
  createStudent,
  listStudents,
  studentPayloadSchema,
} from "@/lib/students";

function getBooleanValue(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value === "true";
  }

  return false;
}

export async function GET(request: Request) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return NextResponse.json(
      { message: "Autentikasi admin diperlukan." },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const data = await listStudents({
    search: searchParams.get("search") ?? "",
    studentStatus: searchParams.get("studentStatus") ?? "ALL",
    cardStatus: searchParams.get("cardStatus") ?? "ALL",
    page: Number(searchParams.get("page") ?? "1"),
    pageSize: Number(searchParams.get("pageSize") ?? "10"),
  });

  return NextResponse.json(data);
}

export async function POST(request: Request) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return NextResponse.json(
      { message: "Autentikasi admin diperlukan." },
      { status: 401 },
    );
  }

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

  const result = await createStudent(parsedBody.data);

  if (!result.ok) {
    return NextResponse.json(
      {
        message: result.message,
        fieldErrors: result.fieldErrors ?? {},
      },
      { status: 400 },
    );
  }

  return NextResponse.json(
    {
      message: result.message,
      student: result.data,
    },
    { status: 201 },
  );
}
