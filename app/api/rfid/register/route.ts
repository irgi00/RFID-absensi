import { NextResponse } from "next/server";

import { registerRfidCard, rfidRegisterPayloadSchema } from "@/lib/rfid";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, message: "Invalid request payload" },
      { status: 400 },
    );
  }

  const parsedBody = rfidRegisterPayloadSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json(
      {
        success: false,
        message: parsedBody.error.issues[0]?.message ?? "Invalid request payload",
      },
      { status: 400 },
    );
  }

  const result = await registerRfidCard(parsedBody.data);

  if (!result.ok) {
    return NextResponse.json(
      { success: false, message: result.message },
      { status: result.status },
    );
  }

  return NextResponse.json(
    {
      success: true,
      message: result.message,
    },
    { status: result.status },
  );
}
