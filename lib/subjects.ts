import "server-only";

import { z } from "zod";

import { sql } from "@/lib/db";
import type {
  SubjectFieldErrors,
  SubjectListItem,
  SubjectListResponse,
  SubjectStatusFilter,
  SubjectSummaryStats,
} from "@/types/subjects";

type SubjectSummaryRow = {
  totalSubjects: number | string;
  activeSubjects: number | string;
  inactiveSubjects: number | string;
  subjectsInSchedules: number | string;
};

type SubjectRow = {
  id: string;
  code: string;
  name: string;
  credits: number | string;
  isActive: boolean;
  scheduleCount: number | string;
};

type SubjectIdRow = {
  id: string;
};

type SubjectReferenceRow = {
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
      fieldErrors?: SubjectFieldErrors;
    };

type SubjectMutationInput = {
  code: string;
  name: string;
  credits: number;
  isActive: boolean;
};

export const subjectPayloadSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Kode mata kuliah wajib diisi.")
    .max(30, "Kode mata kuliah maksimal 30 karakter.")
    .transform((value) => value.toUpperCase()),
  name: z
    .string()
    .trim()
    .min(1, "Nama mata kuliah wajib diisi.")
    .max(150, "Nama mata kuliah maksimal 150 karakter."),
  credits: z
    .number()
    .int("Jumlah SKS harus berupa bilangan bulat.")
    .min(1, "Jumlah SKS minimal 1.")
    .max(12, "Jumlah SKS maksimal 12."),
  isActive: z.boolean(),
});

function toNumber(value: number | string | undefined) {
  return Number(value ?? 0);
}

function getStatusFilterValue(value?: string): SubjectStatusFilter {
  if (value === "ACTIVE" || value === "INACTIVE") {
    return value;
  }

  return "ALL";
}

function mapSubjectRow(row: SubjectRow): SubjectListItem {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    credits: toNumber(row.credits),
    isActive: row.isActive,
    scheduleCount: toNumber(row.scheduleCount),
  };
}

async function fetchSubjectById(subjectId: string) {
  const rows = (await sql`
    SELECT
      courses.id,
      courses.code,
      courses.name,
      courses.credits,
      courses.is_active AS "isActive",
      COUNT(class_schedules.id)::int AS "scheduleCount"
    FROM courses
    LEFT JOIN class_schedules
      ON class_schedules.course_id = courses.id
    WHERE courses.id = ${subjectId}
    GROUP BY courses.id, courses.code, courses.name, courses.credits, courses.is_active
    LIMIT 1
  `) as SubjectRow[];

  return rows[0] ? mapSubjectRow(rows[0]) : null;
}

async function findSubjectIdByCode(code: string, excludeSubjectId?: string | null) {
  const query = `
    SELECT id
    FROM courses
    WHERE code = $1
    ${excludeSubjectId ? "AND id <> $2" : ""}
    LIMIT 1
  `;
  const params = excludeSubjectId ? [code, excludeSubjectId] : [code];
  const rows = (await sql.query(query, params)) as SubjectIdRow[];

  return rows[0] ?? null;
}

async function findSubjectIdByName(name: string, excludeSubjectId?: string | null) {
  const query = `
    SELECT id
    FROM courses
    WHERE LOWER(name) = LOWER($1)
    ${excludeSubjectId ? "AND id <> $2" : ""}
    LIMIT 1
  `;
  const params = excludeSubjectId ? [name, excludeSubjectId] : [name];
  const rows = (await sql.query(query, params)) as SubjectIdRow[];

  return rows[0] ?? null;
}

async function countSubjectSchedules(subjectId: string) {
  const rows = (await sql`
    SELECT COUNT(*)::int AS "scheduleCount"
    FROM class_schedules
    WHERE course_id = ${subjectId}
  `) as SubjectReferenceRow[];

  return toNumber(rows[0]?.scheduleCount);
}

export async function listSubjects(input?: {
  search?: string;
  status?: string;
}): Promise<SubjectListResponse> {
  const search = input?.search?.trim() ?? "";
  const searchPattern = `%${search}%`;
  const status = getStatusFilterValue(input?.status);

  const summaryRows = (await sql`
    SELECT
      COUNT(*)::int AS "totalSubjects",
      COUNT(*) FILTER (WHERE is_active = TRUE)::int AS "activeSubjects",
      COUNT(*) FILTER (WHERE is_active = FALSE)::int AS "inactiveSubjects",
      COUNT(*) FILTER (
        WHERE EXISTS (
          SELECT 1
          FROM class_schedules
          WHERE class_schedules.course_id = courses.id
        )
      )::int AS "subjectsInSchedules"
    FROM courses
  `) as SubjectSummaryRow[];

  const summary: SubjectSummaryStats = {
    totalSubjects: toNumber(summaryRows[0]?.totalSubjects),
    activeSubjects: toNumber(summaryRows[0]?.activeSubjects),
    inactiveSubjects: toNumber(summaryRows[0]?.inactiveSubjects),
    subjectsInSchedules: toNumber(summaryRows[0]?.subjectsInSchedules),
  };

  const rows = (await sql`
    SELECT
      courses.id,
      courses.code,
      courses.name,
      courses.credits,
      courses.is_active AS "isActive",
      COUNT(class_schedules.id)::int AS "scheduleCount"
    FROM courses
    LEFT JOIN class_schedules
      ON class_schedules.course_id = courses.id
    WHERE
      (
        ${search} = ''
        OR courses.code ILIKE ${searchPattern}
        OR courses.name ILIKE ${searchPattern}
      )
      AND (
        ${status} = 'ALL'
        OR (${status} = 'ACTIVE' AND courses.is_active = TRUE)
        OR (${status} = 'INACTIVE' AND courses.is_active = FALSE)
      )
    GROUP BY courses.id, courses.code, courses.name, courses.credits, courses.is_active
    ORDER BY courses.is_active DESC, courses.name ASC, courses.code ASC
  `) as SubjectRow[];

  return {
    subjects: rows.map(mapSubjectRow),
    summary,
  };
}

export async function createSubject(
  input: SubjectMutationInput,
): Promise<MutationResult<SubjectListItem>> {
  const duplicatedCode = await findSubjectIdByCode(input.code);

  if (duplicatedCode) {
    return {
      ok: false,
      message: "Kode mata kuliah sudah digunakan.",
      fieldErrors: {
        code: "Gunakan kode lain karena data ini sudah terdaftar.",
      },
    };
  }

  const duplicatedName = await findSubjectIdByName(input.name);

  if (duplicatedName) {
    return {
      ok: false,
      message: "Nama mata kuliah sudah digunakan.",
      fieldErrors: {
        name: "Gunakan nama lain karena mata kuliah ini sudah terdaftar.",
      },
    };
  }

  const insertedRows = (await sql`
    INSERT INTO courses (
      code,
      name,
      credits,
      is_active
    )
    VALUES (
      ${input.code},
      ${input.name},
      ${input.credits},
      ${input.isActive}
    )
    RETURNING id
  `) as SubjectIdRow[];

  const subject = insertedRows[0] ? await fetchSubjectById(insertedRows[0].id) : null;

  if (!subject) {
    return {
      ok: false,
      message: "Mata kuliah gagal disimpan. Silakan coba lagi.",
    };
  }

  return {
    ok: true,
    data: subject,
    message: "Mata kuliah berhasil ditambahkan.",
  };
}

export async function updateSubject(
  subjectId: string,
  input: SubjectMutationInput,
): Promise<MutationResult<SubjectListItem>> {
  const existingSubject = await fetchSubjectById(subjectId);

  if (!existingSubject) {
    return {
      ok: false,
      message: "Data mata kuliah tidak ditemukan.",
    };
  }

  const duplicatedCode = await findSubjectIdByCode(input.code, subjectId);

  if (duplicatedCode) {
    return {
      ok: false,
      message: "Kode mata kuliah sudah digunakan.",
      fieldErrors: {
        code: "Gunakan kode lain karena data ini sudah terdaftar.",
      },
    };
  }

  const duplicatedName = await findSubjectIdByName(input.name, subjectId);

  if (duplicatedName) {
    return {
      ok: false,
      message: "Nama mata kuliah sudah digunakan.",
      fieldErrors: {
        name: "Gunakan nama lain karena mata kuliah ini sudah terdaftar.",
      },
    };
  }

  await sql`
    UPDATE courses
    SET
      code = ${input.code},
      name = ${input.name},
      credits = ${input.credits},
      is_active = ${input.isActive}
    WHERE id = ${subjectId}
  `;

  const updatedSubject = await fetchSubjectById(subjectId);

  if (!updatedSubject) {
    return {
      ok: false,
      message: "Perubahan mata kuliah gagal dimuat kembali.",
    };
  }

  return {
    ok: true,
    data: updatedSubject,
    message: "Data mata kuliah berhasil diperbarui.",
  };
}

export async function deleteSubject(
  subjectId: string,
): Promise<MutationResult<{ id: string }>> {
  const existingSubject = await fetchSubjectById(subjectId);

  if (!existingSubject) {
    return {
      ok: false,
      message: "Data mata kuliah tidak ditemukan.",
    };
  }

  const scheduleCount = await countSubjectSchedules(subjectId);

  if (scheduleCount > 0) {
    return {
      ok: false,
      message:
        "Mata kuliah tidak dapat dihapus karena masih digunakan pada jadwal kuliah.",
    };
  }

  await sql`
    DELETE FROM courses
    WHERE id = ${subjectId}
  `;

  return {
    ok: true,
    data: { id: subjectId },
    message: "Mata kuliah berhasil dihapus.",
  };
}
