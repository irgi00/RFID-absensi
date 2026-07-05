import { NextResponse } from "next/server";

import { getCurrentAdmin } from "@/lib/admins";
import { createRoom, listRooms, roomPayloadSchema } from "@/lib/rooms";

function getBooleanValue(value: unknown) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    return value === "true";
  }

  return false;
}

function getNullableNumberValue(value: unknown) {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "number") {
    return value;
  }

  if (typeof value === "string") {
    if (!value.trim()) {
      return null;
    }

    return Number(value);
  }

  return Number.NaN;
}

function getStringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

export async function GET(request: Request) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return NextResponse.json({ message: "Autentikasi admin diperlukan." }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const data = await listRooms({
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
    return NextResponse.json({ message: "Payload ruangan tidak valid." }, { status: 400 });
  }

  const parsedBody = roomPayloadSchema.safeParse({
    ...(typeof body === "object" && body ? body : {}),
    code: getStringValue(typeof body === "object" && body ? (body as { code?: unknown }).code : ""),
    name: getStringValue(typeof body === "object" && body ? (body as { name?: unknown }).name : ""),
    building: getStringValue(
      typeof body === "object" && body ? (body as { building?: unknown }).building : "",
    ),
    floor: getStringValue(typeof body === "object" && body ? (body as { floor?: unknown }).floor : ""),
    capacity: getNullableNumberValue(
      typeof body === "object" && body ? (body as { capacity?: unknown }).capacity : null,
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
        message: issue?.message ?? "Data ruangan tidak valid.",
        fieldErrors:
          typeof field === "string" ? { [field]: issue?.message ?? "Data tidak valid." } : {},
      },
      { status: 400 },
    );
  }

  const result = await createRoom(parsedBody.data);

  if (!result.ok) {
    return NextResponse.json(
      { message: result.message, fieldErrors: result.fieldErrors ?? {} },
      { status: 400 },
    );
  }

  return NextResponse.json(
    {
      message: result.message,
      room: result.data,
    },
    { status: 201 },
  );
}
