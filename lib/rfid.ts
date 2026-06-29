import "server-only";

import { z } from "zod";

import { sql } from "@/lib/db";

export const rfidRegisterPayloadSchema = z.object({
  studentId: z.uuid("studentId harus berupa UUID yang valid."),
  uid: z
    .string({ message: "UID kartu RFID wajib diisi." })
    .trim()
    .min(1, "UID kartu RFID wajib diisi.")
    .max(64, "UID kartu RFID maksimal 64 karakter."),
});

export const rfidScanPayloadSchema = z.object({
  uid: z
    .string({ message: "UID kartu RFID wajib diisi." })
    .trim()
    .min(1, "UID kartu RFID wajib diisi.")
    .max(64, "UID kartu RFID maksimal 64 karakter."),
  deviceId: z
    .string({ message: "deviceId wajib diisi." })
    .trim()
    .min(1, "deviceId wajib diisi.")
    .max(50, "deviceId maksimal 50 karakter."),
});

type StudentRow = {
  id: string;
  nim: string;
  name: string;
  isActive: boolean;
  classId: string;
};

type ActiveCardRow = {
  id: string;
  uid: string;
  studentId: string;
};

type DeviceRow = {
  id: string;
  deviceCode: string;
  roomId: string;
  isActive: boolean;
};

type SessionRow = {
  sessionId: string;
  scheduleId: string;
  scheduleClassId: string;
  status: "UPCOMING" | "ACTIVE" | "CLOSED";
  onTimeDeadlineAt: string;
  lateDeadlineAt: string;
};

type AttendanceRecordRow = {
  id: string;
};

type ScanLogParams = {
  uid: string;
  deviceCode: string;
  deviceDbId?: string | null;
  roomId?: string | null;
  studentId?: string | null;
  cardId?: string | null;
  scheduleId?: string | null;
  attendanceSessionId?: string | null;
  attendanceRecordId?: string | null;
  logStatus: "SUCCESS" | "REJECTED" | "UNREGISTERED" | "DUPLICATE" | "ERROR";
  responseCode:
    | "PRESENT"
    | "LATE"
    | "ALREADY_ATTENDED"
    | "CARD_NOT_REGISTERED"
    | "CARD_INACTIVE"
    | "NO_ACTIVE_SCHEDULE"
    | "NOT_YOUR_CLASS"
    | "ATTENDANCE_CLOSED"
    | "DEVICE_NOT_REGISTERED"
    | "SERVER_ERROR";
  message: string;
  rawPayload: Record<string, unknown>;
};

type RegisterCardResult =
  | { ok: true; status: 200; message: string }
  | { ok: false; status: 404 | 409 | 500; message: string };

type ScanCardResult =
  | {
      ok: true;
      status: 200;
      student: { id: string; nim: string; name: string };
      responseStatus: "HADIR" | "TERLAMBAT";
    }
  | { ok: false; status: 404 | 409 | 422 | 500; message: string };

async function findStudentById(studentId: string) {
  const rows = (await sql`
    SELECT
      students.id,
      students.nim,
      students.full_name AS name,
      students.is_active AS "isActive",
      students.class_id AS "classId"
    FROM students
    WHERE students.id = ${studentId}
    LIMIT 1
  `) as StudentRow[];

  return rows[0] ?? null;
}

async function findActiveCardByUid(uid: string) {
  const rows = (await sql`
    SELECT
      rfid_cards.id,
      rfid_cards.uid,
      rfid_cards.student_id AS "studentId"
    FROM rfid_cards
    WHERE rfid_cards.uid = ${uid}
      AND rfid_cards.status = 'ACTIVE'
    LIMIT 1
  `) as ActiveCardRow[];

  return rows[0] ?? null;
}

async function findCurrentActiveCardForStudent(studentId: string) {
  const rows = (await sql`
    SELECT
      rfid_cards.id,
      rfid_cards.uid,
      rfid_cards.student_id AS "studentId"
    FROM rfid_cards
    WHERE rfid_cards.student_id = ${studentId}
      AND rfid_cards.status = 'ACTIVE'
    ORDER BY rfid_cards.issued_at DESC, rfid_cards.created_at DESC
    LIMIT 1
  `) as ActiveCardRow[];

  return rows[0] ?? null;
}

async function findDeviceByCode(deviceCode: string) {
  const rows = (await sql`
    SELECT
      devices.id,
      devices.device_code AS "deviceCode",
      devices.room_id AS "roomId",
      devices.is_active AS "isActive"
    FROM devices
    WHERE devices.device_code = ${deviceCode}
    LIMIT 1
  `) as DeviceRow[];

  return rows[0] ?? null;
}

async function findActiveSessionForDeviceRoom(device: DeviceRow, student: StudentRow) {
  const rows = (await sql`
    SELECT
      attendance_sessions.id AS "sessionId",
      attendance_sessions.schedule_id AS "scheduleId",
      class_schedules.class_id AS "scheduleClassId",
      attendance_sessions.status,
      attendance_sessions.on_time_deadline_at AS "onTimeDeadlineAt",
      attendance_sessions.late_deadline_at AS "lateDeadlineAt"
    FROM attendance_sessions
    INNER JOIN class_schedules
      ON class_schedules.id = attendance_sessions.schedule_id
    WHERE class_schedules.room_id = ${device.roomId}
      AND class_schedules.is_active = TRUE
      AND attendance_sessions.status = 'ACTIVE'
      AND attendance_sessions.start_at <= NOW()
      AND attendance_sessions.end_at >= NOW()
    ORDER BY attendance_sessions.start_at DESC
    LIMIT 1
  `) as SessionRow[];

  const session = rows[0] ?? null;

  if (!session) {
    return { session: null, reason: "NO_ACTIVE_SCHEDULE" as const };
  }

  if (session.scheduleClassId !== student.classId) {
    return { session, reason: "NOT_YOUR_CLASS" as const };
  }

  return { session, reason: null };
}

async function findAttendanceRecord(sessionId: string, studentId: string) {
  const rows = (await sql`
    SELECT attendance_records.id
    FROM attendance_records
    WHERE attendance_records.session_id = ${sessionId}
      AND attendance_records.student_id = ${studentId}
    LIMIT 1
  `) as AttendanceRecordRow[];

  return rows[0] ?? null;
}

async function insertScanLog(params: ScanLogParams) {
  await sql`
    INSERT INTO rfid_scan_logs (
      uid,
      device_code,
      device_id,
      room_id,
      student_id,
      card_id,
      schedule_id,
      attendance_session_id,
      attendance_record_id,
      log_status,
      response_code,
      message,
      raw_payload
    )
    VALUES (
      ${params.uid},
      ${params.deviceCode},
      ${params.deviceDbId ?? null},
      ${params.roomId ?? null},
      ${params.studentId ?? null},
      ${params.cardId ?? null},
      ${params.scheduleId ?? null},
      ${params.attendanceSessionId ?? null},
      ${params.attendanceRecordId ?? null},
      ${params.logStatus},
      ${params.responseCode},
      ${params.message},
      ${JSON.stringify(params.rawPayload)}::jsonb
    )
  `;
}

export async function registerRfidCard(
  input: z.infer<typeof rfidRegisterPayloadSchema>,
): Promise<RegisterCardResult> {
  try {
    const student = await findStudentById(input.studentId);

    if (!student) {
      return {
        ok: false,
        status: 404,
        message: "Student not found",
      };
    }

    const duplicatedActiveCard = await findActiveCardByUid(input.uid);

    if (duplicatedActiveCard && duplicatedActiveCard.studentId !== input.studentId) {
      return {
        ok: false,
        status: 409,
        message: "RFID UID already assigned to another student",
      };
    }

    const currentActiveCard = await findCurrentActiveCardForStudent(input.studentId);

    if (currentActiveCard?.uid === input.uid) {
      return {
        ok: true,
        status: 200,
        message: "RFID card registered successfully",
      };
    }

    const queries = [];

    if (currentActiveCard) {
      queries.push(sql`
        UPDATE rfid_cards
        SET
          status = 'INACTIVE',
          deactivated_at = COALESCE(deactivated_at, NOW())
        WHERE id = ${currentActiveCard.id}
      `);
    }

    queries.push(sql`
      INSERT INTO rfid_cards (
        student_id,
        uid,
        status
      )
      VALUES (
        ${input.studentId},
        ${input.uid},
        'ACTIVE'
      )
    `);

    await sql.transaction(queries);

    return {
      ok: true,
      status: 200,
      message: "RFID card registered successfully",
    };
  } catch (error) {
    console.error("Failed to register RFID card", error);

    return {
      ok: false,
      status: 500,
      message: "Failed to register RFID card",
    };
  }
}

export async function processRfidScan(
  input: z.infer<typeof rfidScanPayloadSchema>,
): Promise<ScanCardResult> {
  const rawPayload = {
    uid: input.uid,
    deviceId: input.deviceId,
  } satisfies Record<string, unknown>;

  try {
    const device = await findDeviceByCode(input.deviceId);

    if (!device || !device.isActive) {
      await insertScanLog({
        uid: input.uid,
        deviceCode: input.deviceId,
        logStatus: "ERROR",
        responseCode: "DEVICE_NOT_REGISTERED",
        message: "Device not registered",
        rawPayload,
      });

      return {
        ok: false,
        status: 404,
        message: "Device not registered",
      };
    }

    const card = await findActiveCardByUid(input.uid);

    if (!card) {
      await insertScanLog({
        uid: input.uid,
        deviceCode: device.deviceCode,
        deviceDbId: device.id,
        roomId: device.roomId,
        logStatus: "UNREGISTERED",
        responseCode: "CARD_NOT_REGISTERED",
        message: "RFID card not registered",
        rawPayload,
      });

      return {
        ok: false,
        status: 404,
        message: "RFID card not registered",
      };
    }

    const student = await findStudentById(card.studentId);

    if (!student || !student.isActive) {
      await insertScanLog({
        uid: input.uid,
        deviceCode: device.deviceCode,
        deviceDbId: device.id,
        roomId: device.roomId,
        studentId: student?.id ?? card.studentId,
        cardId: card.id,
        logStatus: "REJECTED",
        responseCode: "CARD_INACTIVE",
        message: "Student is not active",
        rawPayload,
      });

      return {
        ok: false,
        status: 422,
        message: "Student is not active",
      };
    }

    const sessionLookup = await findActiveSessionForDeviceRoom(device, student);

    if (!sessionLookup.session) {
      await insertScanLog({
        uid: input.uid,
        deviceCode: device.deviceCode,
        deviceDbId: device.id,
        roomId: device.roomId,
        studentId: student.id,
        cardId: card.id,
        logStatus: "REJECTED",
        responseCode: "NO_ACTIVE_SCHEDULE",
        message: "No active attendance session for this device",
        rawPayload,
      });

      return {
        ok: false,
        status: 422,
        message: "No active attendance session for this device",
      };
    }

    if (sessionLookup.reason === "NOT_YOUR_CLASS") {
      await insertScanLog({
        uid: input.uid,
        deviceCode: device.deviceCode,
        deviceDbId: device.id,
        roomId: device.roomId,
        studentId: student.id,
        cardId: card.id,
        scheduleId: sessionLookup.session.scheduleId,
        attendanceSessionId: sessionLookup.session.sessionId,
        logStatus: "REJECTED",
        responseCode: "NOT_YOUR_CLASS",
        message: "Student is not assigned to the active class",
        rawPayload,
      });

      return {
        ok: false,
        status: 409,
        message: "Student is not assigned to the active class",
      };
    }

    const session = sessionLookup.session;
    const now = new Date();
    const lateDeadlineAt = new Date(session.lateDeadlineAt);
    const onTimeDeadlineAt = new Date(session.onTimeDeadlineAt);

    if (now > lateDeadlineAt || session.status === "CLOSED") {
      await insertScanLog({
        uid: input.uid,
        deviceCode: device.deviceCode,
        deviceDbId: device.id,
        roomId: device.roomId,
        studentId: student.id,
        cardId: card.id,
        scheduleId: session.scheduleId,
        attendanceSessionId: session.sessionId,
        logStatus: "REJECTED",
        responseCode: "ATTENDANCE_CLOSED",
        message: "Attendance session is closed",
        rawPayload,
      });

      return {
        ok: false,
        status: 422,
        message: "Attendance session is closed",
      };
    }

    const existingRecord = await findAttendanceRecord(session.sessionId, student.id);

    if (existingRecord) {
      await insertScanLog({
        uid: input.uid,
        deviceCode: device.deviceCode,
        deviceDbId: device.id,
        roomId: device.roomId,
        studentId: student.id,
        cardId: card.id,
        scheduleId: session.scheduleId,
        attendanceSessionId: session.sessionId,
        attendanceRecordId: existingRecord.id,
        logStatus: "DUPLICATE",
        responseCode: "ALREADY_ATTENDED",
        message: "Attendance already recorded",
        rawPayload,
      });

      return {
        ok: false,
        status: 409,
        message: "Attendance already recorded",
      };
    }

    const attendanceStatus = now <= onTimeDeadlineAt ? "PRESENT" : "LATE";
    const responseStatus = attendanceStatus === "PRESENT" ? "HADIR" : "TERLAMBAT";

    const insertedRecordRows = (await sql`
      INSERT INTO attendance_records (
        session_id,
        student_id,
        status,
        scanned_at
      )
      VALUES (
        ${session.sessionId},
        ${student.id},
        ${attendanceStatus},
        NOW()
      )
      RETURNING id
    `) as AttendanceRecordRow[];

    await sql`
      UPDATE rfid_cards
      SET last_seen_at = NOW()
      WHERE id = ${card.id}
    `;

    const attendanceRecordId = insertedRecordRows[0]?.id ?? null;

    await insertScanLog({
      uid: input.uid,
      deviceCode: device.deviceCode,
      deviceDbId: device.id,
      roomId: device.roomId,
      studentId: student.id,
      cardId: card.id,
      scheduleId: session.scheduleId,
      attendanceSessionId: session.sessionId,
      attendanceRecordId,
      logStatus: "SUCCESS",
      responseCode: attendanceStatus,
      message: "Attendance recorded successfully",
      rawPayload,
    });

    return {
      ok: true,
      status: 200,
      student: {
        id: student.id,
        nim: student.nim,
        name: student.name,
      },
      responseStatus,
    };
  } catch (error) {
    console.error("Failed to process RFID scan", error);

    try {
      await insertScanLog({
        uid: input.uid,
        deviceCode: input.deviceId,
        logStatus: "ERROR",
        responseCode: "SERVER_ERROR",
        message: "Internal server error",
        rawPayload,
      });
    } catch (logError) {
      console.error("Failed to write RFID error log", logError);
    }

    return {
      ok: false,
      status: 500,
      message: "Internal server error",
    };
  }
}
