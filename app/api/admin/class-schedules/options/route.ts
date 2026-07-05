import { NextResponse } from "next/server";

import { getCurrentAdmin } from "@/lib/admins";
import { listClassScheduleOptions } from "@/lib/class-schedules";

export async function GET() {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return NextResponse.json(
      { message: "Autentikasi admin diperlukan." },
      { status: 401 },
    );
  }

  const data = await listClassScheduleOptions();

  return NextResponse.json(data);
}
