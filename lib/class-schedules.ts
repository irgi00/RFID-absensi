import "server-only";

import { z } from "zod";

import { sql } from "@/lib/db";
import type {
  ClassScheduleFieldErrors,
  ClassScheduleListItem,
  ClassScheduleListResponse,
  ClassScheduleOptionItem,
  ClassScheduleOptionsResponse,
} from "@/types/class-schedules";

const dayValues = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
] as const;

type ClassScheduleRow = {
  id: string;
  subjectId: string;
  subject: string;
  classId: string;
  class: string;
  lecturerId: string;
  lecturer: string;
  roomId: string;
  room: string;
  day: string;
  startTime: string;
  endTime: string;
  onTimeCutoff: string;
  active: boolean;
};

type ClassScheduleOptionRow = {
  id: string;
  label: string;
  active: boolean;
};

type ClassScheduleIdRow = {
  id: string;
};

type ClassScheduleReferenceRow = {
  scheduleCount: number | string;
};

type ClassScheduleConflictRow = {
  id: string;
};

type MutationResult<T> =
  | {
      ok: true;
      data: T;
      message: string;
    }
  | {
      ok: false;
      message: string;
      fieldErrors?: ClassScheduleFieldErrors;
    };

export type ClassScheduleMutationInput = {
  subjectId: string;
  classId: string;
  lecturerId: string;
  roomId: string;
  day: (typeof dayValues)[number];
  startTime: string;
  endTime: string;
  onTimeCutoff: string;
  isActive: boolean;
};

const timeSchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Waktu harus berformat HH:mm.");

export const classSchedulePayloadSchema = z
  .object({
    subjectId: z.string().trim().min(1, "Mata kuliah wajib dipilih."),
    classId: z.string().trim().min(1, "Kelas wajib dipilih."),
    lecturerId: z.string().trim().min(1, "Dosen wajib dipilih."),
    roomId: z.string().trim().min(1, "Ruangan wajib dipilih."),
    day: z.enum(dayValues, {
      message: "Hari wajib dipilih.",
    }),
    startTime: timeSchema,
    endTime: timeSchema,
    onTimeCutoff: timeSchema,
    isActive: z.boolean(),
  })
  .superRefine((value, context) => {
    if (value.startTime >= value.endTime) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startTime"],
        message: "Jam mulai harus lebih awal dari jam selesai.",
      });
    }

    if (value.onTimeCutoff < value.startTime || value.onTimeCutoff > value.endTime) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["onTimeCutoff"],
        message: "Batas tepat waktu harus berada di antara jam mulai dan jam selesai.",
      });
    }
  });

function toNumber(value: number | string | undefined) {
  return Number(value ?? 0);
}

function mapScheduleRow(row: ClassScheduleRow): ClassScheduleListItem {
  return {
    id: row.id,
    subjectId: row.subjectId,
    subject: row.subject,
    classId: row.classId,
    class: row.class,
    lecturerId: row.lecturerId,
    lecturer: row.lecturer,
    roomId: row.roomId,
    room: row.room,
    day: row.day,
    startTime: row.startTime,
    endTime: row.endTime,
    onTimeCutoff: row.onTimeCutoff,
    active: row.active,
  };
}

function mapOptionRows(rows: ClassScheduleOptionRow[]): ClassScheduleOptionItem[] {
  return rows;
}

async function fetchScheduleById(scheduleId: string) {
  const rows = (await sql`
    SELECT
      class_schedules.id,
      class_schedules.course_id AS "subjectId",
      CONCAT(courses.code, ' - ', courses.name) AS subject,
      class_schedules.class_id AS "classId",
      CONCAT(classes.code, ' - ', classes.name) AS "class",
      class_schedules.lecturer_id AS "lecturerId",
      COALESCE(
        CASE
          WHEN lecturers.code IS NOT NULL AND length(trim(lecturers.code)) > 0
            THEN CONCAT(lecturers.code, ' - ', lecturers.full_name)
          ELSE lecturers.full_name
        END,
        lecturers.full_name
      ) AS lecturer,
      class_schedules.room_id AS "roomId",
      CONCAT(rooms.code, ' - ', rooms.name) AS room,
      class_schedules.day_of_week AS day,
      TO_CHAR(class_schedules.start_time, 'HH24:MI') AS "startTime",
      TO_CHAR(class_schedules.end_time, 'HH24:MI') AS "endTime",
      TO_CHAR(class_schedules.on_time_cutoff, 'HH24:MI') AS "onTimeCutoff",
      class_schedules.is_active AS active
    FROM class_schedules
    INNER JOIN classes
      ON classes.id = class_schedules.class_id
    INNER JOIN courses
      ON courses.id = class_schedules.course_id
    INNER JOIN lecturers
      ON lecturers.id = class_schedules.lecturer_id
    INNER JOIN rooms
      ON rooms.id = class_schedules.room_id
    WHERE class_schedules.id = ${scheduleId}
    LIMIT 1
  `) as ClassScheduleRow[];

  return rows[0] ? mapScheduleRow(rows[0]) : null;
}

async function findConflictingSchedule(
  input: ClassScheduleMutationInput,
  excludeScheduleId?: string,
) {
  const query = `
    SELECT id
    FROM class_schedules
    WHERE day_of_week = $1
      AND start_time < $3::time
      AND end_time > $2::time
      AND (
        class_id = $4
        OR lecturer_id = $5
        OR room_id = $6
      )
      ${excludeScheduleId ? "AND id <> $7" : ""}
    LIMIT 1
  `;

  const params = excludeScheduleId
    ? [
        input.day,
        input.startTime,
        input.endTime,
        input.classId,
        input.lecturerId,
        input.roomId,
        excludeScheduleId,
      ]
    : [input.day, input.startTime, input.endTime, input.classId, input.lecturerId, input.roomId];

  const rows = (await sql.query(query, params)) as ClassScheduleConflictRow[];

  return rows[0] ?? null;
}

async function findReferenceById(table: "courses" | "classes" | "lecturers" | "rooms", id: string) {
  const query = `
    SELECT id
    FROM ${table}
    WHERE id = $1
    LIMIT 1
  `;

  const rows = (await sql.query(query, [id])) as ClassScheduleIdRow[];

  return rows[0] ?? null;
}

async function getScheduleReferenceCount(scheduleId: string) {
  const rows = (await sql`
    SELECT COUNT(*)::int AS "scheduleCount"
    FROM attendance_sessions
    WHERE schedule_id = ${scheduleId}
  `) as ClassScheduleReferenceRow[];

  return toNumber(rows[0]?.scheduleCount);
}

export async function listClassSchedules(input?: { search?: string }): Promise<ClassScheduleListResponse> {
  const search = input?.search?.trim() ?? "";
  const searchPattern = `%${search}%`;

  const rows = (await sql`
    SELECT
      class_schedules.id,
      class_schedules.course_id AS "subjectId",
      CONCAT(courses.code, ' - ', courses.name) AS subject,
      class_schedules.class_id AS "classId",
      CONCAT(classes.code, ' - ', classes.name) AS "class",
      class_schedules.lecturer_id AS "lecturerId",
      COALESCE(
        CASE
          WHEN lecturers.code IS NOT NULL AND length(trim(lecturers.code)) > 0
            THEN CONCAT(lecturers.code, ' - ', lecturers.full_name)
          ELSE lecturers.full_name
        END,
        lecturers.full_name
      ) AS lecturer,
      class_schedules.room_id AS "roomId",
      CONCAT(rooms.code, ' - ', rooms.name) AS room,
      class_schedules.day_of_week AS day,
      TO_CHAR(class_schedules.start_time, 'HH24:MI') AS "startTime",
      TO_CHAR(class_schedules.end_time, 'HH24:MI') AS "endTime",
      TO_CHAR(class_schedules.on_time_cutoff, 'HH24:MI') AS "onTimeCutoff",
      class_schedules.is_active AS active
    FROM class_schedules
    INNER JOIN classes
      ON classes.id = class_schedules.class_id
    INNER JOIN courses
      ON courses.id = class_schedules.course_id
    INNER JOIN lecturers
      ON lecturers.id = class_schedules.lecturer_id
    INNER JOIN rooms
      ON rooms.id = class_schedules.room_id
    WHERE
      (
        ${search} = ''
        OR courses.code ILIKE ${searchPattern}
        OR courses.name ILIKE ${searchPattern}
        OR classes.code ILIKE ${searchPattern}
        OR classes.name ILIKE ${searchPattern}
        OR COALESCE(lecturers.code, '') ILIKE ${searchPattern}
        OR lecturers.full_name ILIKE ${searchPattern}
        OR rooms.code ILIKE ${searchPattern}
        OR rooms.name ILIKE ${searchPattern}
        OR class_schedules.day_of_week ILIKE ${searchPattern}
        OR CASE class_schedules.day_of_week
          WHEN 'MONDAY' THEN 'Senin'
          WHEN 'TUESDAY' THEN 'Selasa'
          WHEN 'WEDNESDAY' THEN 'Rabu'
          WHEN 'THURSDAY' THEN 'Kamis'
          WHEN 'FRIDAY' THEN 'Jumat'
          WHEN 'SATURDAY' THEN 'Sabtu'
          WHEN 'SUNDAY' THEN 'Minggu'
          ELSE class_schedules.day_of_week
        END ILIKE ${searchPattern}
      )
    ORDER BY
      CASE class_schedules.day_of_week
        WHEN 'MONDAY' THEN 1
        WHEN 'TUESDAY' THEN 2
        WHEN 'WEDNESDAY' THEN 3
        WHEN 'THURSDAY' THEN 4
        WHEN 'FRIDAY' THEN 5
        WHEN 'SATURDAY' THEN 6
        WHEN 'SUNDAY' THEN 7
        ELSE 8
      END,
      class_schedules.start_time ASC,
      courses.name ASC,
      classes.name ASC,
      lecturers.full_name ASC
  `) as ClassScheduleRow[];

  return {
    schedules: rows.map(mapScheduleRow),
  };
}

export async function listClassScheduleOptions(): Promise<ClassScheduleOptionsResponse> {
  const [subjects, classes, lecturers, rooms] = await Promise.all([
    sql`
      SELECT
        id,
        CONCAT(code, ' - ', name) AS label,
        is_active AS active
      FROM courses
      ORDER BY is_active DESC, name ASC, code ASC
    `,
    sql`
      SELECT
        id,
        CONCAT(code, ' - ', name) AS label,
        is_active AS active
      FROM classes
      ORDER BY is_active DESC, name ASC, code ASC
    `,
    sql`
      SELECT
        id,
        COALESCE(
          CASE
            WHEN code IS NOT NULL AND length(trim(code)) > 0 THEN CONCAT(code, ' - ', full_name)
            ELSE full_name
          END,
          full_name
        ) AS label,
        is_active AS active
      FROM lecturers
      ORDER BY is_active DESC, full_name ASC
    `,
    sql`
      SELECT
        id,
        CONCAT(code, ' - ', name) AS label,
        is_active AS active
      FROM rooms
      ORDER BY is_active DESC, name ASC, code ASC
    `,
  ]);

  return {
    subjects: mapOptionRows(subjects as ClassScheduleOptionRow[]),
    classes: mapOptionRows(classes as ClassScheduleOptionRow[]),
    lecturers: mapOptionRows(lecturers as ClassScheduleOptionRow[]),
    rooms: mapOptionRows(rooms as ClassScheduleOptionRow[]),
  };
}

export async function createClassSchedule(
  input: ClassScheduleMutationInput,
): Promise<MutationResult<ClassScheduleListItem>> {
  const [subject, classItem, lecturer, room] = await Promise.all([
    findReferenceById("courses", input.subjectId),
    findReferenceById("classes", input.classId),
    findReferenceById("lecturers", input.lecturerId),
    findReferenceById("rooms", input.roomId),
  ]);

  const fieldErrors: ClassScheduleFieldErrors = {};

  if (!subject) {
    fieldErrors.subjectId = "Mata kuliah yang dipilih tidak ditemukan.";
  }

  if (!classItem) {
    fieldErrors.classId = "Kelas yang dipilih tidak ditemukan.";
  }

  if (!lecturer) {
    fieldErrors.lecturerId = "Dosen yang dipilih tidak ditemukan.";
  }

  if (!room) {
    fieldErrors.roomId = "Ruangan yang dipilih tidak ditemukan.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      message: "Data referensi jadwal kuliah tidak valid.",
      fieldErrors,
    };
  }

  const conflict = await findConflictingSchedule(input);

  if (conflict) {
    return {
      ok: false,
      message:
        "Jadwal bentrok dengan data lain pada kelas, dosen, atau ruangan yang sama.",
      fieldErrors: {
        form: "Jadwal bentrok dengan data lain pada kelas, dosen, atau ruangan yang sama.",
      },
    };
  }

  const insertedRows = (await sql`
    INSERT INTO class_schedules (
      class_id,
      course_id,
      lecturer_id,
      room_id,
      day_of_week,
      start_time,
      end_time,
      on_time_cutoff,
      late_cutoff,
      is_active
    )
    VALUES (
      ${input.classId},
      ${input.subjectId},
      ${input.lecturerId},
      ${input.roomId},
      ${input.day},
      ${input.startTime},
      ${input.endTime},
      ${input.onTimeCutoff},
      ${input.endTime},
      ${input.isActive}
    )
    RETURNING id
  `) as ClassScheduleIdRow[];

  const schedule = insertedRows[0] ? await fetchScheduleById(insertedRows[0].id) : null;

  if (!schedule) {
    return {
      ok: false,
      message: "Jadwal kuliah gagal disimpan. Silakan coba lagi.",
    };
  }

  return {
    ok: true,
    data: schedule,
    message: "Jadwal kuliah berhasil ditambahkan.",
  };
}

export async function updateClassSchedule(
  scheduleId: string,
  input: ClassScheduleMutationInput,
): Promise<MutationResult<ClassScheduleListItem>> {
  const existingSchedule = await fetchScheduleById(scheduleId);

  if (!existingSchedule) {
    return {
      ok: false,
      message: "Data jadwal kuliah tidak ditemukan.",
    };
  }

  const [subject, classItem, lecturer, room] = await Promise.all([
    findReferenceById("courses", input.subjectId),
    findReferenceById("classes", input.classId),
    findReferenceById("lecturers", input.lecturerId),
    findReferenceById("rooms", input.roomId),
  ]);

  const fieldErrors: ClassScheduleFieldErrors = {};

  if (!subject) {
    fieldErrors.subjectId = "Mata kuliah yang dipilih tidak ditemukan.";
  }

  if (!classItem) {
    fieldErrors.classId = "Kelas yang dipilih tidak ditemukan.";
  }

  if (!lecturer) {
    fieldErrors.lecturerId = "Dosen yang dipilih tidak ditemukan.";
  }

  if (!room) {
    fieldErrors.roomId = "Ruangan yang dipilih tidak ditemukan.";
  }

  if (Object.keys(fieldErrors).length > 0) {
    return {
      ok: false,
      message: "Data referensi jadwal kuliah tidak valid.",
      fieldErrors,
    };
  }

  const conflict = await findConflictingSchedule(input, scheduleId);

  if (conflict) {
    return {
      ok: false,
      message:
        "Jadwal bentrok dengan data lain pada kelas, dosen, atau ruangan yang sama.",
      fieldErrors: {
        form: "Jadwal bentrok dengan data lain pada kelas, dosen, atau ruangan yang sama.",
      },
    };
  }

  const todaySessions = (await sql`
    SELECT id
    FROM attendance_sessions
    WHERE schedule_id = ${scheduleId}
      AND session_date = (NOW() AT TIME ZONE 'Asia/Jakarta')::date
    LIMIT 1
  `) as { id: string }[];

  if (todaySessions.length > 0) {
    const sessionId = todaySessions[0].id;
    
    const records = (await sql`
      SELECT COUNT(*)::int AS count
      FROM attendance_records
      WHERE session_id = ${sessionId}
    `) as { count: number | string }[];
    
    const recordsCount = toNumber(records[0]?.count);
    
    if (recordsCount > 0) {
      return {
        ok: false,
        message: "Jadwal tidak dapat diubah karena sesi absensi sudah memiliki data kehadiran.",
      };
    } else {
      await sql`
        DELETE FROM attendance_sessions
        WHERE id = ${sessionId}
      `;
    }
  }

  await sql`
    UPDATE class_schedules
    SET
      class_id = ${input.classId},
      course_id = ${input.subjectId},
      lecturer_id = ${input.lecturerId},
      room_id = ${input.roomId},
      day_of_week = ${input.day},
      start_time = ${input.startTime},
      end_time = ${input.endTime},
      on_time_cutoff = ${input.onTimeCutoff},
      late_cutoff = ${input.endTime},
      is_active = ${input.isActive}
    WHERE id = ${scheduleId}
  `;

  const updatedSchedule = await fetchScheduleById(scheduleId);

  if (!updatedSchedule) {
    return {
      ok: false,
      message: "Perubahan jadwal kuliah gagal dimuat kembali.",
    };
  }

  return {
    ok: true,
    data: updatedSchedule,
    message: "Data jadwal kuliah berhasil diperbarui.",
  };
}

export async function deleteClassSchedule(
  scheduleId: string,
): Promise<MutationResult<{ id: string }>> {
  const existingSchedule = await fetchScheduleById(scheduleId);

  if (!existingSchedule) {
    return {
      ok: false,
      message: "Data jadwal kuliah tidak ditemukan.",
    };
  }

  const scheduleCount = await getScheduleReferenceCount(scheduleId);

  if (scheduleCount > 0) {
    return {
      ok: false,
      message:
        "Jadwal kuliah tidak dapat dihapus karena masih digunakan pada sesi absensi.",
    };
  }

  await sql`
    DELETE FROM class_schedules
    WHERE id = ${scheduleId}
  `;

  return {
    ok: true,
    data: { id: scheduleId },
    message: "Jadwal kuliah berhasil dihapus.",
  };
}
