import "server-only";

import { sql } from "@/lib/db";
import { SessionRow } from "@/lib/rfid";

type ActiveScheduleRow = {
  id: string;
  start_time: string;
  end_time: string;
  on_time_cutoff: string;
  late_cutoff: string;
  scheduleClassId: string;
};

export async function ensureCurrentAttendanceSession(roomId: string): Promise<SessionRow | null> {
  // 1. Cari jadwal kelas (class_schedules) yang sedang berlangsung saat ini (WIB)
  const activeSchedules = (await sql`
    SELECT
      id,
      start_time,
      end_time,
      on_time_cutoff,
      late_cutoff,
      class_id AS "scheduleClassId"
    FROM class_schedules
    WHERE room_id = ${roomId}
      AND is_active = TRUE
      AND day_of_week = UPPER(TO_CHAR(NOW() AT TIME ZONE 'Asia/Jakarta', 'FMDay'))
      AND (NOW() AT TIME ZONE 'Asia/Jakarta')::time BETWEEN start_time AND end_time
    LIMIT 1
  `) as ActiveScheduleRow[];

  if (activeSchedules.length === 0) {
    return null; // Tidak ada jadwal aktif saat ini di ruangan tersebut
  }

  const schedule = activeSchedules[0];

  // 2. Cari apakah attendance_sessions untuk jadwal tersebut hari ini sudah ada
  const existingSession = (await sql`
    SELECT
      attendance_sessions.id AS "sessionId",
      attendance_sessions.schedule_id AS "scheduleId",
      ${schedule.scheduleClassId} AS "scheduleClassId",
      attendance_sessions.status,
      attendance_sessions.on_time_deadline_at AS "onTimeDeadlineAt",
      attendance_sessions.late_deadline_at AS "lateDeadlineAt"
    FROM attendance_sessions
    WHERE schedule_id = ${schedule.id}
      AND session_date = (NOW() AT TIME ZONE 'Asia/Jakarta')::date
    LIMIT 1
  `) as SessionRow[];

  if (existingSession.length > 0) {
    return existingSession[0];
  }

  // 3. Jika belum ada, buat secara otomatis dengan kalkulasi timezone Asia/Jakarta
  await sql`
    INSERT INTO attendance_sessions (
      schedule_id,
      session_date,
      start_at,
      end_at,
      on_time_deadline_at,
      late_deadline_at,
      status
    )
    VALUES (
      ${schedule.id},
      (NOW() AT TIME ZONE 'Asia/Jakarta')::date,
      ((NOW() AT TIME ZONE 'Asia/Jakarta')::date + ${schedule.start_time}::time) AT TIME ZONE 'Asia/Jakarta',
      ((NOW() AT TIME ZONE 'Asia/Jakarta')::date + ${schedule.end_time}::time) AT TIME ZONE 'Asia/Jakarta',
      ((NOW() AT TIME ZONE 'Asia/Jakarta')::date + ${schedule.on_time_cutoff}::time) AT TIME ZONE 'Asia/Jakarta',
      ((NOW() AT TIME ZONE 'Asia/Jakarta')::date + ${schedule.late_cutoff}::time) AT TIME ZONE 'Asia/Jakarta',
      'ACTIVE'
    )
    ON CONFLICT (schedule_id, session_date) DO NOTHING
  `;

  // 4. Kembalikan session yang baru dibuat (atau yang mungkin baru saja dimasukkan oleh request yang konkuren)
  const finalSession = (await sql`
    SELECT
      attendance_sessions.id AS "sessionId",
      attendance_sessions.schedule_id AS "scheduleId",
      ${schedule.scheduleClassId} AS "scheduleClassId",
      attendance_sessions.status,
      attendance_sessions.on_time_deadline_at AS "onTimeDeadlineAt",
      attendance_sessions.late_deadline_at AS "lateDeadlineAt"
    FROM attendance_sessions
    WHERE schedule_id = ${schedule.id}
      AND session_date = (NOW() AT TIME ZONE 'Asia/Jakarta')::date
    LIMIT 1
  `) as SessionRow[];

  return finalSession[0] ?? null;
}
