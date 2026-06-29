import { NextResponse } from "next/server";

import { getCurrentAdmin } from "@/lib/admins";
import {
  findLatestRegistrationScan,
  getPreferredRegistrationDevice,
} from "@/lib/rfid-registration";
import type { RfidRegistrationScanResponse } from "@/types/rfid-registration";

export async function GET(request: Request) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return NextResponse.json(
      { message: "Autentikasi admin diperlukan." },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(request.url);
  const since = searchParams.get("since") ?? "";
  const deviceCode = searchParams.get("deviceCode")?.trim() ?? "";

  if (since) {
    const parsedSince = new Date(since);

    if (Number.isNaN(parsedSince.getTime())) {
      return NextResponse.json(
        { message: "Parameter waktu scan tidak valid." },
        { status: 400 },
      );
    }
  }

  const device = await getPreferredRegistrationDevice(deviceCode || undefined);
  const scan = await findLatestRegistrationScan({
    since,
    deviceCode: device?.deviceCode ?? (deviceCode || undefined),
  });

  return NextResponse.json({
    device,
    scan,
  } satisfies RfidRegistrationScanResponse);
}
