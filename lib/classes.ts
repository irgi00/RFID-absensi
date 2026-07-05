import "server-only";

import { z } from "zod";

import { sql } from "@/lib/db";
import type {
  ClassFieldErrors,
  ClassListItem,
  ClassListResponse,
  ClassStatusFilter,
  ClassSummaryStats,
} from "@/types/classes";

type ClassSummaryRow = {
  totalClasses: number | string;
  activeClasses: number | string;
  inactiveClasses: number | string;
  classesInSchedules: number | string;
};

type ClassRow = {
  id: string;
  code: string;
  name: string;
  studyProgram: string | null;
  cohortYear: number | string | null;
  isActive: boolean;
  studentCount: number | string;
  scheduleCount: number | string;
};

type ClassIdRow = {
  id: string;
};

type ClassReferenceRow = {
  studentCount: number | string;
  scheduleCount: number | string;
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
      fieldErrors?: ClassFieldErrors;
    };

type ClassMutationInput = {
  code: string;
  name: string;
  studyProgram: string | null;
  cohortYear: number | null;
  isActive: boolean;
};

export const classPayloadSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Kode kelas wajib diisi.")
    .max(50, "Kode kelas maksimal 50 karakter.")
    .transform((value) => value.toUpperCase()),
  name: z
    .string()
    .trim()
    .min(1, "Nama kelas wajib diisi.")
    .max(100, "Nama kelas maksimal 100 karakter."),
  studyProgram: z.string().trim().max(120).nullable(),
  cohortYear: z
    .number()
    .int("Angkatan harus berupa bilangan bulat.")
    .min(2000, "Angkatan minimal 2000.")
    .max(2100, "Angkatan maksimal 2100.")
    .nullable(),
  isActive: z.boolean(),
});

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return null;
  }

  return Number(value);
}

function toCount(value: number | string | undefined) {
  return Number(value ?? 0);
}

function getStatusFilterValue(value?: string): ClassStatusFilter {
  if (value === "ACTIVE" || value === "INACTIVE") {
    return value;
  }

  return "ALL";
}

function mapClassRow(row: ClassRow): ClassListItem {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    studyProgram: row.studyProgram,
    cohortYear: toNumber(row.cohortYear),
    isActive: row.isActive,
    studentCount: toCount(row.studentCount),
    scheduleCount: toCount(row.scheduleCount),
  };
}

async function fetchClassById(classId: string) {
  const rows = (await sql`
    SELECT
      classes.id,
      classes.code,
      classes.name,
      classes.study_program AS "studyProgram",
      classes.cohort_year AS "cohortYear",
      classes.is_active AS "isActive",
      (
        SELECT COUNT(*)::int
        FROM students
        WHERE students.class_id = classes.id
      ) AS "studentCount",
      (
        SELECT COUNT(*)::int
        FROM class_schedules
        WHERE class_schedules.class_id = classes.id
      ) AS "scheduleCount"
    FROM classes
    WHERE classes.id = ${classId}
    LIMIT 1
  `) as ClassRow[];

  return rows[0] ? mapClassRow(rows[0]) : null;
}

async function findClassIdByCode(code: string, excludeClassId?: string | null) {
  const query = `
    SELECT id
    FROM classes
    WHERE code = $1
    ${excludeClassId ? "AND id <> $2" : ""}
    LIMIT 1
  `;
  const params = excludeClassId ? [code, excludeClassId] : [code];
  const rows = (await sql.query(query, params)) as ClassIdRow[];

  return rows[0] ?? null;
}

async function countClassReferences(classId: string) {
  const rows = (await sql`
    SELECT
      (
        SELECT COUNT(*)::int
        FROM students
        WHERE students.class_id = classes.id
      ) AS "studentCount",
      (
        SELECT COUNT(*)::int
        FROM class_schedules
        WHERE class_schedules.class_id = classes.id
      ) AS "scheduleCount"
    FROM classes
    WHERE classes.id = ${classId}
    LIMIT 1
  `) as ClassReferenceRow[];

  return {
    studentCount: toCount(rows[0]?.studentCount),
    scheduleCount: toCount(rows[0]?.scheduleCount),
  };
}

export async function listClasses(input?: {
  search?: string;
  status?: string;
}): Promise<ClassListResponse> {
  const search = input?.search?.trim() ?? "";
  const searchPattern = `%${search}%`;
  const status = getStatusFilterValue(input?.status);

  const summaryRows = (await sql`
    SELECT
      COUNT(*)::int AS "totalClasses",
      COUNT(*) FILTER (WHERE is_active = TRUE)::int AS "activeClasses",
      COUNT(*) FILTER (WHERE is_active = FALSE)::int AS "inactiveClasses",
      COUNT(*) FILTER (
        WHERE EXISTS (
          SELECT 1
          FROM class_schedules
          WHERE class_schedules.class_id = classes.id
        )
      )::int AS "classesInSchedules"
    FROM classes
  `) as ClassSummaryRow[];

  const summary: ClassSummaryStats = {
    totalClasses: toCount(summaryRows[0]?.totalClasses),
    activeClasses: toCount(summaryRows[0]?.activeClasses),
    inactiveClasses: toCount(summaryRows[0]?.inactiveClasses),
    classesInSchedules: toCount(summaryRows[0]?.classesInSchedules),
  };

  const rows = (await sql`
    SELECT
      classes.id,
      classes.code,
      classes.name,
      classes.study_program AS "studyProgram",
      classes.cohort_year AS "cohortYear",
      classes.is_active AS "isActive",
      (
        SELECT COUNT(*)::int
        FROM students
        WHERE students.class_id = classes.id
      ) AS "studentCount",
      (
        SELECT COUNT(*)::int
        FROM class_schedules
        WHERE class_schedules.class_id = classes.id
      ) AS "scheduleCount"
    FROM classes
    WHERE
      (
        ${search} = ''
        OR classes.code ILIKE ${searchPattern}
        OR classes.name ILIKE ${searchPattern}
        OR COALESCE(classes.study_program, '') ILIKE ${searchPattern}
        OR COALESCE(classes.cohort_year::text, '') ILIKE ${searchPattern}
      )
      AND (
        ${status} = 'ALL'
        OR (${status} = 'ACTIVE' AND classes.is_active = TRUE)
        OR (${status} = 'INACTIVE' AND classes.is_active = FALSE)
      )
    ORDER BY classes.is_active DESC, classes.name ASC, classes.code ASC
  `) as ClassRow[];

  return {
    classes: rows.map(mapClassRow),
    summary,
  };
}

export async function createClass(
  input: ClassMutationInput,
): Promise<MutationResult<ClassListItem>> {
  const duplicatedCode = await findClassIdByCode(input.code);

  if (duplicatedCode) {
    return {
      ok: false,
      message: "Kode kelas sudah digunakan.",
      fieldErrors: {
        code: "Gunakan kode lain karena data ini sudah terdaftar.",
      },
    };
  }

  const insertedRows = (await sql`
    INSERT INTO classes (
      code,
      name,
      study_program,
      cohort_year,
      is_active
    )
    VALUES (
      ${input.code},
      ${input.name},
      ${input.studyProgram},
      ${input.cohortYear},
      ${input.isActive}
    )
    RETURNING id
  `) as ClassIdRow[];

  const classItem = insertedRows[0] ? await fetchClassById(insertedRows[0].id) : null;

  if (!classItem) {
    return {
      ok: false,
      message: "Kelas gagal disimpan. Silakan coba lagi.",
    };
  }

  return {
    ok: true,
    data: classItem,
    message: "Kelas berhasil ditambahkan.",
  };
}

export async function updateClass(
  classId: string,
  input: ClassMutationInput,
): Promise<MutationResult<ClassListItem>> {
  const existingClass = await fetchClassById(classId);

  if (!existingClass) {
    return {
      ok: false,
      message: "Data kelas tidak ditemukan.",
    };
  }

  const duplicatedCode = await findClassIdByCode(input.code, classId);

  if (duplicatedCode) {
    return {
      ok: false,
      message: "Kode kelas sudah digunakan.",
      fieldErrors: {
        code: "Gunakan kode lain karena data ini sudah terdaftar.",
      },
    };
  }

  await sql`
    UPDATE classes
    SET
      code = ${input.code},
      name = ${input.name},
      study_program = ${input.studyProgram},
      cohort_year = ${input.cohortYear},
      is_active = ${input.isActive}
    WHERE id = ${classId}
  `;

  const updatedClass = await fetchClassById(classId);

  if (!updatedClass) {
    return {
      ok: false,
      message: "Perubahan kelas gagal dimuat kembali.",
    };
  }

  return {
    ok: true,
    data: updatedClass,
    message: "Data kelas berhasil diperbarui.",
  };
}

export async function deleteClass(classId: string): Promise<MutationResult<{ id: string }>> {
  const existingClass = await fetchClassById(classId);

  if (!existingClass) {
    return {
      ok: false,
      message: "Data kelas tidak ditemukan.",
    };
  }

  const references = await countClassReferences(classId);

  if (references.studentCount > 0 || references.scheduleCount > 0) {
    const blockers: string[] = [];

    if (references.studentCount > 0) {
      blockers.push("mahasiswa");
    }

    if (references.scheduleCount > 0) {
      blockers.push("jadwal kuliah");
    }

    return {
      ok: false,
      message: `Kelas tidak dapat dihapus karena masih digunakan oleh ${blockers.join(" dan ")}.`,
    };
  }

  await sql`
    DELETE FROM classes
    WHERE id = ${classId}
  `;

  return {
    ok: true,
    data: { id: classId },
    message: "Kelas berhasil dihapus.",
  };
}
