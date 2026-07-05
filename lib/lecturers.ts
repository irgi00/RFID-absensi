import "server-only";

import { z } from "zod";

import { sql } from "@/lib/db";
import type {
  LecturerFieldErrors,
  LecturerListItem,
  LecturerListResponse,
  LecturerStatusFilter,
  LecturerSummaryStats,
} from "@/types/lecturers";

type LecturerSummaryRow = {
  totalLecturers: number | string;
  activeLecturers: number | string;
  inactiveLecturers: number | string;
  lecturersInSchedules: number | string;
};

type LecturerRow = {
  id: string;
  code: string | null;
  fullName: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  scheduleCount: number | string;
};

type LecturerIdRow = {
  id: string;
};

type LecturerReferenceRow = {
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
      fieldErrors?: LecturerFieldErrors;
    };

type LecturerMutationInput = {
  code: string | null;
  fullName: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
};

const emailSchema = z.string().email();

export const lecturerPayloadSchema = z.object({
  code: z
    .string()
    .trim()
    .max(30, "Kode dosen maksimal 30 karakter.")
    .transform((value) => (value ? value.toUpperCase() : null)),
  fullName: z
    .string()
    .trim()
    .min(1, "Nama dosen wajib diisi.")
    .max(150, "Nama dosen maksimal 150 karakter."),
  email: z
    .string()
    .trim()
    .max(150, "Email maksimal 150 karakter.")
    .refine((value) => !value || emailSchema.safeParse(value).success, {
      message: "Format email tidak valid.",
    })
    .transform((value) => (value ? value.toLowerCase() : null)),
  phone: z
    .string()
    .trim()
    .max(30, "Nomor telepon maksimal 30 karakter.")
    .transform((value) => (value ? value : null)),
  isActive: z.boolean(),
});

function toNumber(value: number | string | undefined) {
  return Number(value ?? 0);
}

function getStatusFilterValue(value?: string): LecturerStatusFilter {
  if (value === "ACTIVE" || value === "INACTIVE") {
    return value;
  }

  return "ALL";
}

function mapLecturerRow(row: LecturerRow): LecturerListItem {
  return {
    id: row.id,
    code: row.code,
    fullName: row.fullName,
    email: row.email,
    phone: row.phone,
    isActive: row.isActive,
    scheduleCount: toNumber(row.scheduleCount),
  };
}

async function fetchLecturerById(lecturerId: string) {
  const rows = (await sql`
    SELECT
      lecturers.id,
      lecturers.code,
      lecturers.full_name AS "fullName",
      lecturers.email,
      lecturers.phone,
      lecturers.is_active AS "isActive",
      COUNT(class_schedules.id)::int AS "scheduleCount"
    FROM lecturers
    LEFT JOIN class_schedules
      ON class_schedules.lecturer_id = lecturers.id
    WHERE lecturers.id = ${lecturerId}
    GROUP BY
      lecturers.id,
      lecturers.code,
      lecturers.full_name,
      lecturers.email,
      lecturers.phone,
      lecturers.is_active
    LIMIT 1
  `) as LecturerRow[];

  return rows[0] ? mapLecturerRow(rows[0]) : null;
}

async function findLecturerIdByCode(code: string, excludeLecturerId?: string | null) {
  const query = `
    SELECT id
    FROM lecturers
    WHERE code = $1
    ${excludeLecturerId ? "AND id <> $2" : ""}
    LIMIT 1
  `;
  const params = excludeLecturerId ? [code, excludeLecturerId] : [code];
  const rows = (await sql.query(query, params)) as LecturerIdRow[];

  return rows[0] ?? null;
}

async function findLecturerIdByEmail(email: string, excludeLecturerId?: string | null) {
  const query = `
    SELECT id
    FROM lecturers
    WHERE LOWER(email) = LOWER($1)
    ${excludeLecturerId ? "AND id <> $2" : ""}
    LIMIT 1
  `;
  const params = excludeLecturerId ? [email, excludeLecturerId] : [email];
  const rows = (await sql.query(query, params)) as LecturerIdRow[];

  return rows[0] ?? null;
}

async function findLecturerIdByFullName(
  fullName: string,
  excludeLecturerId?: string | null,
) {
  const query = `
    SELECT id
    FROM lecturers
    WHERE LOWER(full_name) = LOWER($1)
    ${excludeLecturerId ? "AND id <> $2" : ""}
    LIMIT 1
  `;
  const params = excludeLecturerId ? [fullName, excludeLecturerId] : [fullName];
  const rows = (await sql.query(query, params)) as LecturerIdRow[];

  return rows[0] ?? null;
}

async function countLecturerSchedules(lecturerId: string) {
  const rows = (await sql`
    SELECT COUNT(*)::int AS "scheduleCount"
    FROM class_schedules
    WHERE lecturer_id = ${lecturerId}
  `) as LecturerReferenceRow[];

  return toNumber(rows[0]?.scheduleCount);
}

export async function listLecturers(input?: {
  search?: string;
  status?: string;
}): Promise<LecturerListResponse> {
  const search = input?.search?.trim() ?? "";
  const searchPattern = `%${search}%`;
  const status = getStatusFilterValue(input?.status);

  const summaryRows = (await sql`
    SELECT
      COUNT(*)::int AS "totalLecturers",
      COUNT(*) FILTER (WHERE is_active = TRUE)::int AS "activeLecturers",
      COUNT(*) FILTER (WHERE is_active = FALSE)::int AS "inactiveLecturers",
      COUNT(*) FILTER (
        WHERE EXISTS (
          SELECT 1
          FROM class_schedules
          WHERE class_schedules.lecturer_id = lecturers.id
        )
      )::int AS "lecturersInSchedules"
    FROM lecturers
  `) as LecturerSummaryRow[];

  const summary: LecturerSummaryStats = {
    totalLecturers: toNumber(summaryRows[0]?.totalLecturers),
    activeLecturers: toNumber(summaryRows[0]?.activeLecturers),
    inactiveLecturers: toNumber(summaryRows[0]?.inactiveLecturers),
    lecturersInSchedules: toNumber(summaryRows[0]?.lecturersInSchedules),
  };

  const rows = (await sql`
    SELECT
      lecturers.id,
      lecturers.code,
      lecturers.full_name AS "fullName",
      lecturers.email,
      lecturers.phone,
      lecturers.is_active AS "isActive",
      COUNT(class_schedules.id)::int AS "scheduleCount"
    FROM lecturers
    LEFT JOIN class_schedules
      ON class_schedules.lecturer_id = lecturers.id
    WHERE
      (
        ${search} = ''
        OR COALESCE(lecturers.code, '') ILIKE ${searchPattern}
        OR lecturers.full_name ILIKE ${searchPattern}
        OR COALESCE(lecturers.email, '') ILIKE ${searchPattern}
        OR COALESCE(lecturers.phone, '') ILIKE ${searchPattern}
      )
      AND (
        ${status} = 'ALL'
        OR (${status} = 'ACTIVE' AND lecturers.is_active = TRUE)
        OR (${status} = 'INACTIVE' AND lecturers.is_active = FALSE)
      )
    GROUP BY
      lecturers.id,
      lecturers.code,
      lecturers.full_name,
      lecturers.email,
      lecturers.phone,
      lecturers.is_active
    ORDER BY lecturers.is_active DESC, lecturers.full_name ASC
  `) as LecturerRow[];

  return {
    lecturers: rows.map(mapLecturerRow),
    summary,
  };
}

export async function createLecturer(
  input: LecturerMutationInput,
): Promise<MutationResult<LecturerListItem>> {
  if (input.code) {
    const duplicatedCode = await findLecturerIdByCode(input.code);

    if (duplicatedCode) {
      return {
        ok: false,
        message: "Kode dosen sudah digunakan.",
        fieldErrors: {
          code: "Gunakan kode lain karena data ini sudah terdaftar.",
        },
      };
    }
  }

  const duplicatedName = await findLecturerIdByFullName(input.fullName);

  if (duplicatedName) {
    return {
      ok: false,
      message: "Nama dosen sudah digunakan.",
      fieldErrors: {
        fullName: "Gunakan nama lain karena dosen ini sudah terdaftar.",
      },
    };
  }

  if (input.email) {
    const duplicatedEmail = await findLecturerIdByEmail(input.email);

    if (duplicatedEmail) {
      return {
        ok: false,
        message: "Email dosen sudah digunakan.",
        fieldErrors: {
          email: "Gunakan email lain karena data ini sudah terdaftar.",
        },
      };
    }
  }

  const insertedRows = (await sql`
    INSERT INTO lecturers (
      code,
      full_name,
      email,
      phone,
      is_active
    )
    VALUES (
      ${input.code},
      ${input.fullName},
      ${input.email},
      ${input.phone},
      ${input.isActive}
    )
    RETURNING id
  `) as LecturerIdRow[];

  const lecturer = insertedRows[0] ? await fetchLecturerById(insertedRows[0].id) : null;

  if (!lecturer) {
    return {
      ok: false,
      message: "Dosen gagal disimpan. Silakan coba lagi.",
    };
  }

  return {
    ok: true,
    data: lecturer,
    message: "Dosen berhasil ditambahkan.",
  };
}

export async function updateLecturer(
  lecturerId: string,
  input: LecturerMutationInput,
): Promise<MutationResult<LecturerListItem>> {
  const existingLecturer = await fetchLecturerById(lecturerId);

  if (!existingLecturer) {
    return {
      ok: false,
      message: "Data dosen tidak ditemukan.",
    };
  }

  if (input.code) {
    const duplicatedCode = await findLecturerIdByCode(input.code, lecturerId);

    if (duplicatedCode) {
      return {
        ok: false,
        message: "Kode dosen sudah digunakan.",
        fieldErrors: {
          code: "Gunakan kode lain karena data ini sudah terdaftar.",
        },
      };
    }
  }

  const duplicatedName = await findLecturerIdByFullName(input.fullName, lecturerId);

  if (duplicatedName) {
    return {
      ok: false,
      message: "Nama dosen sudah digunakan.",
      fieldErrors: {
        fullName: "Gunakan nama lain karena dosen ini sudah terdaftar.",
      },
    };
  }

  if (input.email) {
    const duplicatedEmail = await findLecturerIdByEmail(input.email, lecturerId);

    if (duplicatedEmail) {
      return {
        ok: false,
        message: "Email dosen sudah digunakan.",
        fieldErrors: {
          email: "Gunakan email lain karena data ini sudah terdaftar.",
        },
      };
    }
  }

  await sql`
    UPDATE lecturers
    SET
      code = ${input.code},
      full_name = ${input.fullName},
      email = ${input.email},
      phone = ${input.phone},
      is_active = ${input.isActive}
    WHERE id = ${lecturerId}
  `;

  const updatedLecturer = await fetchLecturerById(lecturerId);

  if (!updatedLecturer) {
    return {
      ok: false,
      message: "Perubahan dosen gagal dimuat kembali.",
    };
  }

  return {
    ok: true,
    data: updatedLecturer,
    message: "Data dosen berhasil diperbarui.",
  };
}

export async function deleteLecturer(
  lecturerId: string,
): Promise<MutationResult<{ id: string }>> {
  const existingLecturer = await fetchLecturerById(lecturerId);

  if (!existingLecturer) {
    return {
      ok: false,
      message: "Data dosen tidak ditemukan.",
    };
  }

  const scheduleCount = await countLecturerSchedules(lecturerId);

  if (scheduleCount > 0) {
    return {
      ok: false,
      message: "Dosen tidak dapat dihapus karena masih digunakan pada jadwal kuliah.",
    };
  }

  await sql`
    DELETE FROM lecturers
    WHERE id = ${lecturerId}
  `;

  return {
    ok: true,
    data: { id: lecturerId },
    message: "Dosen berhasil dihapus.",
  };
}
