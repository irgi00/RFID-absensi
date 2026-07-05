import { NextResponse } from "next/server";
import { type ZodIssue } from "zod";

import { getCurrentAdmin } from "@/lib/admins";
import {
  classSchedulePayloadSchema,
  deleteClassSchedule,
  updateClassSchedule,
} from "@/lib/class-schedules";
import type { ClassScheduleFieldErrors } from "@/types/class-schedules";

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

function buildFieldErrors(issues: ZodIssue[]): ClassScheduleFieldErrors {
  const fieldErrors: ClassScheduleFieldErrors = {};

  for (const issue of issues) {
    const field = issue.path[0];

    if (typeof field === "string" && !fieldErrors[field as keyof ClassScheduleFieldErrors]) {
      fieldErrors[field as keyof ClassScheduleFieldErrors] = issue.message;
    }
  }

  return fieldErrors;
}

async function parseSchedulePayload(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return {
      error: NextResponse.json({ message: "Payload jadwal kuliah tidak valid." }, { status: 400 }),
    };
  }

  const parsedBody = classSchedulePayloadSchema.safeParse({
    ...(typeof body === "object" && body ? body : {}),
    subjectId: getStringValue(
      typeof body === "object" && body ? (body as { subjectId?: unknown }).subjectId : "",
    ),
    classId: getStringValue(
      typeof body === "object" && body ? (body as { classId?: unknown }).classId : "",
    ),
    lecturerId: getStringValue(
      typeof body === "object" && body ? (body as { lecturerId?: unknown }).lecturerId : "",
    ),
    roomId: getStringValue(
      typeof body === "object" && body ? (body as { roomId?: unknown }).roomId : "",
    ),
    day: getStringValue(typeof body === "object" && body ? (body as { day?: unknown }).day : ""),
    startTime: getStringValue(
      typeof body === "object" && body ? (body as { startTime?: unknown }).startTime : "",
    ),
    endTime: getStringValue(
      typeof body === "object" && body ? (body as { endTime?: unknown }).endTime : "",
    ),
    onTimeCutoff: getStringValue(
      typeof body === "object" && body ? (body as { onTimeCutoff?: unknown }).onTimeCutoff : "",
    ),
    isActive: getBooleanValue(
      typeof body === "object" && body ? (body as { isActive?: unknown }).isActive : false,
    ),
  });

  if (!parsedBody.success) {
    const fieldErrors = buildFieldErrors(parsedBody.error.issues);
    const message = parsedBody.error.issues[0]?.message ?? "Data jadwal kuliah tidak valid.";

    return {
      error: NextResponse.json(
        {
          message,
          fieldErrors,
        },
        { status: 400 },
      ),
    };
  }

  return { data: parsedBody.data };
}



export async function PATCH(
  request: Request,
  context: { params: Promise<{ scheduleId: string }> },
) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return NextResponse.json({ message: "Autentikasi admin diperlukan." }, { status: 401 });
  }

  const { scheduleId } = await context.params;
  const parsed = await parseSchedulePayload(request);

  if ("error" in parsed) {
    return parsed.error;
  }

  const result = await updateClassSchedule(scheduleId, parsed.data);

  if (!result.ok) {
    return NextResponse.json(
      { message: result.message, fieldErrors: result.fieldErrors ?? {} },
      {
        status:
          result.message === "Data jadwal kuliah tidak ditemukan."
            ? 404
            : result.message.includes("bentrok")
              ? 409
              : 400,
      },
    );
  }

  return NextResponse.json({
    message: result.message,
    schedule: result.data,
  });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ scheduleId: string }> },
) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return NextResponse.json({ message: "Autentikasi admin diperlukan." }, { status: 401 });
  }

  const { scheduleId } = await context.params;
  const result = await deleteClassSchedule(scheduleId);

  if (!result.ok) {
    return NextResponse.json(
      { message: result.message, fieldErrors: result.fieldErrors ?? {} },
      {
        status:
          result.message === "Data jadwal kuliah tidak ditemukan."
            ? 404
            : result.message.includes("tidak dapat dihapus")
              ? 409
              : 400,
      },
    );
  }

  return NextResponse.json({
    message: result.message,
    schedule: result.data,
  });
}