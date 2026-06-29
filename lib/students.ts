import "server-only";

import { z } from "zod";

import { sql } from "@/lib/db";
import type {
  StudentCardFilter,
  StudentClassOption,
  StudentFieldErrors,
  StudentListItem,
  StudentListResponse,
  StudentStatusFilter,
  StudentSummaryStats,
} from "@/types/students";

const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 25;

type StudentSummaryRow = {
  totalStudents: number | string;
  activeStudents: number | string;
  inactiveStudents: number | string;
  studentsWithoutActiveCard: number | string;
};

type StudentCountRow = {
  totalItems: number | string;
};

type StudentListRow = {
  id: string;
  nim: string;
  fullName: string;
  isActive: boolean;
  classId: string;
  classCode: string;
  className: string;
  classIsActive: boolean;
  studyProgram: string | null;
  cardStatus: string;
  cardUid: string | null;
};

type StudentClassRow = {
  id: string;
  code: string;
  name: string;
  studyProgram: string | null;
  cohortYear: number | null;
  isActive: boolean;
};

type StudentIdRow = {
  id: string;
};

type ExistingCardRow = {
  id: string;
  uid: string;
  studentId: string;
  studentName: string;
  studentNim: string;
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
      fieldErrors?: StudentFieldErrors;
    };

type StudentMutationInput = {
  nim: string;
  fullName: string;
  classId: string;
  isActive: boolean;
};

type StudentCardMutationInput = {
  uid: string;
  cardLabel: string | null;
};

export const studentPayloadSchema = z.object({
  nim: z
    .string()
    .trim()
    .min(1, "NIM wajib diisi.")
    .max(30, "NIM maksimal 30 karakter."),
  fullName: z
    .string()
    .trim()
    .min(1, "Nama mahasiswa wajib diisi.")
    .max(160, "Nama mahasiswa terlalu panjang."),
  classId: z.string().uuid("Kelas yang dipilih tidak valid."),
  isActive: z.boolean(),
});

export const studentCardPayloadSchema = z.object({
  uid: z
    .string()
    .trim()
    .min(1, "UID kartu RFID wajib diisi.")
    .max(64, "UID kartu RFID maksimal 64 karakter.")
    .transform((value) => value.toUpperCase()),
  cardLabel: z
    .string()
    .trim()
    .max(100, "Label kartu maksimal 100 karakter.")
    .optional()
    .transform((value) => {
      if (!value) {
        return null;
      }

      return value;
    }),
});

function toNumber(value: number | string | undefined) {
  return Number(value ?? 0);
}

function mapStudentRow(row: StudentListRow): StudentListItem {
  return {
    id: row.id,
    nim: row.nim,
    fullName: row.fullName,
    isActive: row.isActive,
    classId: row.classId,
    classCode: row.classCode,
    className: row.className,
    classIsActive: row.classIsActive,
    studyProgram: row.studyProgram,
    cardStatus: row.cardStatus as StudentListItem["cardStatus"],
    cardUid: row.cardUid,
  };
}

function normalizePage(value?: number) {
  if (!value || Number.isNaN(value) || value < 1) {
    return 1;
  }

  return Math.floor(value);
}

function normalizePageSize(value?: number) {
  if (!value || Number.isNaN(value) || value < 1) {
    return DEFAULT_PAGE_SIZE;
  }

  return Math.min(Math.floor(value), MAX_PAGE_SIZE);
}

function getCardFilterValue(value?: string): StudentCardFilter {
  if (value === "REGISTERED" || value === "UNREGISTERED") {
    return value;
  }

  return "ALL";
}

function getStatusFilterValue(value?: string): StudentStatusFilter {
  if (value === "ACTIVE" || value === "INACTIVE") {
    return value;
  }

  return "ALL";
}

async function ensureClassExists(classId: string) {
  const rows = (await sql`
    SELECT id
    FROM classes
    WHERE id = ${classId}
    LIMIT 1
  `) as StudentIdRow[];

  return rows[0] ?? null;

}

function isValidUuid(value?: string | null): value is string {
  return z.string().uuid().safeParse(value).success;
}

async function findStudentIdByNim(nim: string, excludeStudentId?: string | null) {
  const hasExcludeStudentId = isValidUuid(excludeStudentId);
  const query = `
    SELECT id
    FROM students
    WHERE nim = $1
    ${hasExcludeStudentId ? "AND id <> $2" : ""}
    LIMIT 1
  `;
  const params = hasExcludeStudentId ? [nim, excludeStudentId] : [nim];
  const rows = (await sql.query(query, params)) as StudentIdRow[];

  return rows[0] ?? null;
}

async function fetchStudentById(studentId: string) {
  const rows = (await sql`
    WITH student_cards AS (
      SELECT
        students.id,
        students.nim,
        students.full_name AS "fullName",
        students.is_active AS "isActive",
        classes.id AS "classId",
        classes.code AS "classCode",
        classes.name AS "className",
        classes.is_active AS "classIsActive",
        classes.study_program AS "studyProgram",
        COALESCE(active_card.uid, latest_card.uid) AS "cardUid",
        CASE
          WHEN active_card.uid IS NOT NULL THEN 'REGISTERED'
          WHEN latest_card.status = 'LOST' THEN 'LOST'
          WHEN latest_card.uid IS NOT NULL THEN 'INACTIVE'
          ELSE 'UNREGISTERED'
        END AS "cardStatus"
      FROM students
      INNER JOIN classes
        ON classes.id = students.class_id
      LEFT JOIN LATERAL (
        SELECT uid
        FROM rfid_cards
        WHERE student_id = students.id
          AND status = 'ACTIVE'
        ORDER BY issued_at DESC, created_at DESC
        LIMIT 1
      ) active_card
        ON TRUE
      LEFT JOIN LATERAL (
        SELECT uid, status
        FROM rfid_cards
        WHERE student_id = students.id
        ORDER BY issued_at DESC, created_at DESC
        LIMIT 1
      ) latest_card
        ON TRUE
    )
    SELECT
      id,
      nim,
      "fullName",
      "isActive",
      "classId",
      "classCode",
      "className",
      "classIsActive",
      "studyProgram",
      "cardUid",
      "cardStatus"
    FROM student_cards
    WHERE id = ${studentId}
    LIMIT 1
  `) as StudentListRow[];

  return rows[0] ? mapStudentRow(rows[0]) : null;
}

export async function listStudents(input?: {
  search?: string;
  studentStatus?: string;
  cardStatus?: string;
  page?: number;
  pageSize?: number;
}) {
  const search = input?.search?.trim() ?? "";
  const searchPattern = `%${search}%`;
  const studentStatus = getStatusFilterValue(input?.studentStatus);
  const cardStatus = getCardFilterValue(input?.cardStatus);
  const pageSize = normalizePageSize(input?.pageSize);
  const requestedPage = normalizePage(input?.page);

  const summaryRows = (await sql`
    SELECT
      COUNT(*)::int AS "totalStudents",
      COUNT(*) FILTER (WHERE students.is_active = TRUE)::int AS "activeStudents",
      COUNT(*) FILTER (WHERE students.is_active = FALSE)::int AS "inactiveStudents",
      COUNT(*) FILTER (WHERE active_card.uid IS NULL)::int AS "studentsWithoutActiveCard"
    FROM students
    LEFT JOIN LATERAL (
      SELECT uid
      FROM rfid_cards
      WHERE student_id = students.id
        AND status = 'ACTIVE'
      LIMIT 1
    ) active_card
      ON TRUE
  `) as StudentSummaryRow[];

  const summary: StudentSummaryStats = {
    totalStudents: toNumber(summaryRows[0]?.totalStudents),
    activeStudents: toNumber(summaryRows[0]?.activeStudents),
    inactiveStudents: toNumber(summaryRows[0]?.inactiveStudents),
    studentsWithoutActiveCard: toNumber(summaryRows[0]?.studentsWithoutActiveCard),
  };

  const countRows = (await sql`
    WITH student_cards AS (
      SELECT
        students.id,
        students.nim,
        students.full_name AS "fullName",
        students.is_active AS "isActive",
        CASE
          WHEN active_card.uid IS NOT NULL THEN 'REGISTERED'
          WHEN latest_card.status = 'LOST' THEN 'LOST'
          WHEN latest_card.uid IS NOT NULL THEN 'INACTIVE'
          ELSE 'UNREGISTERED'
        END AS "cardStatus"
      FROM students
      LEFT JOIN LATERAL (
        SELECT uid
        FROM rfid_cards
        WHERE student_id = students.id
          AND status = 'ACTIVE'
        ORDER BY issued_at DESC, created_at DESC
        LIMIT 1
      ) active_card
        ON TRUE
      LEFT JOIN LATERAL (
        SELECT uid, status
        FROM rfid_cards
        WHERE student_id = students.id
        ORDER BY issued_at DESC, created_at DESC
        LIMIT 1
      ) latest_card
        ON TRUE
    )
    SELECT COUNT(*)::int AS "totalItems"
    FROM student_cards
    WHERE
      (${search} = '' OR "fullName" ILIKE ${searchPattern} OR nim ILIKE ${searchPattern})
      AND (
        ${studentStatus} = 'ALL'
        OR (${studentStatus} = 'ACTIVE' AND "isActive" = TRUE)
        OR (${studentStatus} = 'INACTIVE' AND "isActive" = FALSE)
      )
      AND (
        ${cardStatus} = 'ALL'
        OR (${cardStatus} = 'REGISTERED' AND "cardStatus" = 'REGISTERED')
        OR (${cardStatus} = 'UNREGISTERED' AND "cardStatus" <> 'REGISTERED')
      )
  `) as StudentCountRow[];

  const totalItems = toNumber(countRows[0]?.totalItems);
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const page = Math.min(requestedPage, totalPages);
  const offset = (page - 1) * pageSize;

  const studentRows = (await sql`
    WITH student_cards AS (
      SELECT
        students.id,
        students.nim,
        students.full_name AS "fullName",
        students.is_active AS "isActive",
        classes.id AS "classId",
        classes.code AS "classCode",
        classes.name AS "className",
        classes.is_active AS "classIsActive",
        classes.study_program AS "studyProgram",
        COALESCE(active_card.uid, latest_card.uid) AS "cardUid",
        CASE
          WHEN active_card.uid IS NOT NULL THEN 'REGISTERED'
          WHEN latest_card.status = 'LOST' THEN 'LOST'
          WHEN latest_card.uid IS NOT NULL THEN 'INACTIVE'
          ELSE 'UNREGISTERED'
        END AS "cardStatus"
      FROM students
      INNER JOIN classes
        ON classes.id = students.class_id
      LEFT JOIN LATERAL (
        SELECT uid
        FROM rfid_cards
        WHERE student_id = students.id
          AND status = 'ACTIVE'
        ORDER BY issued_at DESC, created_at DESC
        LIMIT 1
      ) active_card
        ON TRUE
      LEFT JOIN LATERAL (
        SELECT uid, status
        FROM rfid_cards
        WHERE student_id = students.id
        ORDER BY issued_at DESC, created_at DESC
        LIMIT 1
      ) latest_card
        ON TRUE
    )
    SELECT
      id,
      nim,
      "fullName",
      "isActive",
      "classId",
      "classCode",
      "className",
      "classIsActive",
      "studyProgram",
      "cardStatus",
      "cardUid"
    FROM student_cards
    WHERE
      (${search} = '' OR "fullName" ILIKE ${searchPattern} OR nim ILIKE ${searchPattern})
      AND (
        ${studentStatus} = 'ALL'
        OR (${studentStatus} = 'ACTIVE' AND "isActive" = TRUE)
        OR (${studentStatus} = 'INACTIVE' AND "isActive" = FALSE)
      )
      AND (
        ${cardStatus} = 'ALL'
        OR (${cardStatus} = 'REGISTERED' AND "cardStatus" = 'REGISTERED')
        OR (${cardStatus} = 'UNREGISTERED' AND "cardStatus" <> 'REGISTERED')
      )
    ORDER BY "isActive" DESC, "fullName" ASC
    LIMIT ${pageSize}
    OFFSET ${offset}
  `) as StudentListRow[];

  return {
    students: studentRows.map(mapStudentRow),
    summary,
    pagination: {
      page,
      pageSize,
      totalItems,
      totalPages,
    },
  } satisfies StudentListResponse;
}

export async function listStudentClassOptions() {
  const rows = (await sql`
    SELECT
      id,
      code,
      name,
      study_program AS "studyProgram",
      cohort_year AS "cohortYear",
      is_active AS "isActive"
    FROM classes
    ORDER BY is_active DESC, name ASC, code ASC
  `) as StudentClassRow[];

  return rows satisfies StudentClassOption[];
}

export async function createStudent(
  input: StudentMutationInput,
): Promise<MutationResult<StudentListItem>> {
  const existingClass = await ensureClassExists(input.classId);

  if (!existingClass) {
    return {
      ok: false,
      message: "Kelas yang dipilih tidak ditemukan.",
      fieldErrors: {
        classId: "Pilih kelas yang tersedia sebelum menyimpan mahasiswa.",
      },
    };
  }

  const existingStudent = await findStudentIdByNim(input.nim);

  if (existingStudent) {
    return {
      ok: false,
      message: "NIM sudah digunakan oleh mahasiswa lain.",
      fieldErrors: {
        nim: "Gunakan NIM lain karena data ini sudah terdaftar.",
      },
    };
  }

  const insertedRows = (await sql`
    INSERT INTO students (
      class_id,
      nim,
      full_name,
      is_active
    )
    VALUES (
      ${input.classId},
      ${input.nim},
      ${input.fullName},
      ${input.isActive}
    )
    RETURNING id
  `) as StudentIdRow[];

  const student = insertedRows[0]
    ? await fetchStudentById(insertedRows[0].id)
    : null;

  if (!student) {
    return {
      ok: false,
      message: "Mahasiswa gagal disimpan. Silakan coba lagi.",
    };
  }

  return {
    ok: true,
    data: student,
    message: "Mahasiswa berhasil ditambahkan.",
  };
}

export async function updateStudent(
  studentId: string,
  input: StudentMutationInput,
): Promise<MutationResult<StudentListItem>> {
  const student = await fetchStudentById(studentId);

  if (!student) {
    return {
      ok: false,
      message: "Data mahasiswa tidak ditemukan.",
    };
  }

  const existingClass = await ensureClassExists(input.classId);

  if (!existingClass) {
    return {
      ok: false,
      message: "Kelas yang dipilih tidak ditemukan.",
      fieldErrors: {
        classId: "Pilih kelas yang tersedia sebelum menyimpan perubahan.",
      },
    };
  }

  const existingStudent = await findStudentIdByNim(input.nim, studentId);

  if (existingStudent) {
    return {
      ok: false,
      message: "NIM sudah digunakan oleh mahasiswa lain.",
      fieldErrors: {
        nim: "Gunakan NIM lain karena data ini sudah terdaftar.",
      },
    };
  }

  await sql`
    UPDATE students
    SET
      class_id = ${input.classId},
      nim = ${input.nim},
      full_name = ${input.fullName},
      is_active = ${input.isActive}
    WHERE id = ${studentId}
  `;

  const updatedStudent = await fetchStudentById(studentId);

  if (!updatedStudent) {
    return {
      ok: false,
      message: "Perubahan mahasiswa gagal dimuat kembali.",
    };
  }

  return {
    ok: true,
    data: updatedStudent,
    message: "Data mahasiswa berhasil diperbarui.",
  };
}

export async function deactivateStudent(
  studentId: string,
): Promise<MutationResult<StudentListItem>> {
  const student = await fetchStudentById(studentId);

  if (!student) {
    return {
      ok: false,
      message: "Data mahasiswa tidak ditemukan.",
    };
  }

  await sql`
    UPDATE students
    SET is_active = FALSE
    WHERE id = ${studentId}
  `;

  const updatedStudent = await fetchStudentById(studentId);

  if (!updatedStudent) {
    return {
      ok: false,
      message: "Status mahasiswa gagal diperbarui.",
    };
  }

  return {
    ok: true,
    data: updatedStudent,
    message: "Mahasiswa berhasil dinonaktifkan.",
  };
}

export async function registerOrReplaceStudentCard(
  studentId: string,
  input: StudentCardMutationInput,
): Promise<MutationResult<StudentListItem>> {
  const student = await fetchStudentById(studentId);

  if (!student) {
    return {
      ok: false,
      message: "Data mahasiswa tidak ditemukan.",
    };
  }

  const currentActiveCardRows = (await sql`
    SELECT
      rfid_cards.id,
      rfid_cards.uid,
      rfid_cards.student_id AS "studentId",
      students.full_name AS "studentName",
      students.nim AS "studentNim"
    FROM rfid_cards
    INNER JOIN students
      ON students.id = rfid_cards.student_id
    WHERE rfid_cards.student_id = ${studentId}
      AND rfid_cards.status = 'ACTIVE'
    ORDER BY rfid_cards.issued_at DESC, rfid_cards.created_at DESC
    LIMIT 1
  `) as ExistingCardRow[];

  const currentActiveCard = currentActiveCardRows[0] ?? null;

  const duplicatedActiveCardRows = (await sql`
    SELECT
      rfid_cards.id,
      rfid_cards.uid,
      rfid_cards.student_id AS "studentId",
      students.full_name AS "studentName",
      students.nim AS "studentNim"
    FROM rfid_cards
    INNER JOIN students
      ON students.id = rfid_cards.student_id
    WHERE rfid_cards.uid = ${input.uid}
      AND rfid_cards.status = 'ACTIVE'
    LIMIT 1
  `) as ExistingCardRow[];

  const duplicatedActiveCard = duplicatedActiveCardRows[0] ?? null;

  if (duplicatedActiveCard && duplicatedActiveCard.studentId !== studentId) {
    return {
      ok: false,
      message: `UID kartu sudah dipakai oleh ${duplicatedActiveCard.studentName} (${duplicatedActiveCard.studentNim}).`,
      fieldErrors: {
        uid: "Gunakan UID lain karena kartu aktif ini sudah terhubung ke mahasiswa lain.",
      },
    };
  }

  if (currentActiveCard && currentActiveCard.uid === input.uid) {
    await sql`
      UPDATE rfid_cards
      SET card_label = ${input.cardLabel}
      WHERE id = ${currentActiveCard.id}
    `;

    const updatedStudent = await fetchStudentById(studentId);

    if (!updatedStudent) {
      return {
        ok: false,
        message: "Perubahan kartu RFID gagal dimuat kembali.",
      };
    }

    return {
      ok: true,
      data: updatedStudent,
      message: "Informasi kartu RFID aktif berhasil diperbarui.",
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
      card_label,
      status
    )
    VALUES (
      ${studentId},
      ${input.uid},
      ${input.cardLabel},
      'ACTIVE'
    )
  `);

  await sql.transaction(queries);

  const updatedStudent = await fetchStudentById(studentId);

  if (!updatedStudent) {
    return {
      ok: false,
      message: "Kartu RFID gagal dimuat kembali setelah disimpan.",
    };
  }

  return {
    ok: true,
    data: updatedStudent,
    message: currentActiveCard
      ? "Kartu RFID mahasiswa berhasil diganti."
      : "Kartu RFID mahasiswa berhasil didaftarkan.",
  };
}
