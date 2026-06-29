import { NextResponse } from "next/server";

import { processRfidScan, rfidScanPayloadSchema } from "@/lib/rfid";

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

  const parsedBody = rfidScanPayloadSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json(
      {
        success: false,
        message: parsedBody.error.issues[0]?.message ?? "Invalid request payload",
      },
      { status: 400 },
    );
  }

  const result = await processRfidScan(parsedBody.data);

  if (!result.ok) {
    return NextResponse.json(
      { success: false, message: result.message },
      { status: result.status },
    );
  }

  return NextResponse.json(
    {
      success: true,
      student: result.student,
      status: result.responseStatus,
    },
    { status: result.status },
  );
}
