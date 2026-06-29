import "server-only";

import { sql } from "@/lib/db";

export const attendancePageSize = 10;

export type AttendanceStatusFilter =
  | "ALL"
  | "SUCCESS"
  | "REJECTED"
  | "UNREGISTERED"
  | "DUPLICATE";

export type AttendanceFilters = {
  startDate: string | null;
  endDate: string | null;
  search: string | null;
  status: AttendanceStatusFilter;
  page: number;
  pageSize: number;
};

type AttendanceSummaryRow = {
  totalScansToday: number | string;
  successfulScansToday: number | string;
  rejectedScansToday: number | string;
  hasAnyScanData: boolean;
};

type AttendanceHistoryCountRow = {
  totalItems: number | string;
};

type AttendanceHistoryRow = {
  id: string;
  scannedAt: string;
  uid: string;
  studentName: string | null;
  studentNim: string | null;
  logStatus: string;
  responseCode: string;
  message: string;
  deviceCode: string;
  deviceName: string | null;
  attendanceRecordId: string | null;
};

type AttendanceQueryParts = {
  params: unknown[];
  whereClause: string;
};

export type AttendanceSummary = {
  totalScansToday: number;
  successfulScansToday: number;
  rejectedScansToday: number;
  hasAnyScanData: boolean;
};

export type AttendanceHistoryItem = {
  id: string;
  scannedAt: string;
  uid: string;
  studentName: string | null;
  studentNim: string | null;
  logStatus: string;
  responseCode: string;
  message: string;
  deviceCode: string;
  deviceName: string | null;
  attendanceRecordId: string | null;
};

export type AttendancePagination = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type AttendancePageData = {
  summary: AttendanceSummary;
  scans: AttendanceHistoryItem[];
  pagination: AttendancePagination;
};

export function parseAttendanceFilters(
  rawSearchParams: Record<string, string | string[] | undefined>,
): AttendanceFilters {
  const startDate = normalizeDateInput(rawSearchParams.startDate);
  const endDate = normalizeDateInput(rawSearchParams.endDate);
  const search = normalizeFilterText(rawSearchParams.search);
  const status = normalizeStatusFilter(rawSearchParams.status);
  const requestedPage = Number.parseInt(normalizeSingleValue(rawSearchParams.page), 10);
  const page = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;

  if (startDate && endDate && startDate > endDate) {
    return {
      startDate: endDate,
      endDate: startDate,
      search,
      status,
      page,
      pageSize: attendancePageSize,
    };
  }

  return {
    startDate,
    endDate,
    search,
    status,
    page,
    pageSize: attendancePageSize,
  };
}

export async function getAttendancePageData(filters: AttendanceFilters) {
  const summary = await getAttendanceSummary();
  const count = await getAttendanceHistoryCount(filters);
  const totalPages = Math.max(1, Math.ceil(count / filters.pageSize));
  const page = Math.min(filters.page, totalPages);
  const scans = await getAttendanceHistory({
    ...filters,
    page,
  });

  return {
    summary,
    scans,
    pagination: {
      page,
      pageSize: filters.pageSize,
      totalItems: count,
      totalPages,
    },
  } satisfies AttendancePageData;
}

async function getAttendanceSummary() {
  const rows = (await sql`
    SELECT
      (
        SELECT COUNT(*)::int
        FROM rfid_scan_logs
        WHERE scanned_at >= CURRENT_DATE
          AND scanned_at < CURRENT_DATE + INTERVAL '1 day'
      ) AS "totalScansToday",
      (
        SELECT COUNT(*)::int
        FROM rfid_scan_logs
        WHERE scanned_at >= CURRENT_DATE
          AND scanned_at < CURRENT_DATE + INTERVAL '1 day'
          AND log_status = 'SUCCESS'
      ) AS "successfulScansToday",
      (
        SELECT COUNT(*)::int
        FROM rfid_scan_logs
        WHERE scanned_at >= CURRENT_DATE
          AND scanned_at < CURRENT_DATE + INTERVAL '1 day'
          AND log_status <> 'SUCCESS'
      ) AS "rejectedScansToday",
      EXISTS(
        SELECT 1
        FROM rfid_scan_logs
      ) AS "hasAnyScanData"
  `) as AttendanceSummaryRow[];

  const row = rows[0];

  return {
    totalScansToday: Number(row?.totalScansToday ?? 0),
    successfulScansToday: Number(row?.successfulScansToday ?? 0),
    rejectedScansToday: Number(row?.rejectedScansToday ?? 0),
    hasAnyScanData: Boolean(row?.hasAnyScanData),
  } satisfies AttendanceSummary;
}

async function getAttendanceHistoryCount(filters: AttendanceFilters) {
  const queryParts = buildAttendanceQueryParts(filters);
  const rows = (await sql.query(
    `
      SELECT COUNT(*)::int AS "totalItems"
      FROM rfid_scan_logs logs
      LEFT JOIN students
        ON students.id = logs.student_id
      ${queryParts.whereClause}
    `,
    queryParts.params,
  )) as AttendanceHistoryCountRow[];

  return Number(rows[0]?.totalItems ?? 0);
}

async function getAttendanceHistory(filters: AttendanceFilters) {
  const queryParts = buildAttendanceQueryParts(filters);
  const params = [...queryParts.params, filters.pageSize, (filters.page - 1) * filters.pageSize];
  const limitParam = `$${params.length - 1}`;
  const offsetParam = `$${params.length}`;

  const rows = (await sql.query(
    `
      SELECT
        logs.id,
        logs.scanned_at AS "scannedAt",
        logs.uid,
        students.full_name AS "studentName",
        students.nim AS "studentNim",
        logs.log_status AS "logStatus",
        logs.response_code AS "responseCode",
        logs.message,
        logs.device_code AS "deviceCode",
        devices.name AS "deviceName",
        logs.attendance_record_id AS "attendanceRecordId"
      FROM rfid_scan_logs logs
      LEFT JOIN students
        ON students.id = logs.student_id
      LEFT JOIN devices
        ON devices.id = logs.device_id
      ${queryParts.whereClause}
      ORDER BY logs.scanned_at DESC
      LIMIT ${limitParam}
      OFFSET ${offsetParam}
    `,
    params,
  )) as AttendanceHistoryRow[];

  return rows.map((row) => ({
    id: row.id,
    scannedAt: row.scannedAt,
    uid: row.uid,
    studentName: row.studentName,
    studentNim: row.studentNim,
    logStatus: row.logStatus,
    responseCode: row.responseCode,
    message: row.message,
    deviceCode: row.deviceCode,
    deviceName: row.deviceName,
    attendanceRecordId: row.attendanceRecordId,
  })) satisfies AttendanceHistoryItem[];
}

function buildAttendanceQueryParts(filters: AttendanceFilters): AttendanceQueryParts {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.startDate) {
    params.push(filters.startDate);
    conditions.push(`logs.scanned_at >= $${params.length}::date`);
  }

  if (filters.endDate) {
    params.push(filters.endDate);
    conditions.push(`logs.scanned_at < ($${params.length}::date + INTERVAL '1 day')`);
  }

  if (filters.search) {
    params.push(`%${filters.search}%`);
    const searchParam = `$${params.length}`;
    conditions.push(`(
      logs.uid ILIKE ${searchParam}
      OR students.full_name ILIKE ${searchParam}
      OR students.nim ILIKE ${searchParam}
    )`);
  }

  const statusCondition = getAttendanceStatusCondition(filters.status);

  if (statusCondition) {
    conditions.push(statusCondition);
  }

  return {
    params,
    whereClause: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
  };
}

function getAttendanceStatusCondition(status: AttendanceStatusFilter) {
  switch (status) {
    case "SUCCESS":
      return `logs.log_status = 'SUCCESS'`;
    case "REJECTED":
      return `(
        (
          logs.log_status = 'REJECTED'
          OR (
            logs.log_status = 'ERROR'
            AND logs.response_code <> 'CARD_NOT_REGISTERED'
          )
        )
        AND logs.response_code <> 'ALREADY_ATTENDED'
        AND logs.response_code <> 'CARD_NOT_REGISTERED'
      )`;
    case "UNREGISTERED":
      return `(
        logs.log_status = 'UNREGISTERED'
        OR logs.response_code = 'CARD_NOT_REGISTERED'
      )`;
    case "DUPLICATE":
      return `(
        logs.log_status = 'DUPLICATE'
        OR logs.response_code = 'ALREADY_ATTENDED'
      )`;
    default:
      return null;
  }
}

function normalizeSingleValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return value[0] ?? "";
  }

  return value ?? "";
}

function normalizeFilterText(value: string | string[] | undefined) {
  const normalized = normalizeSingleValue(value).trim();

  return normalized ? normalized : null;
}

function normalizeDateInput(value: string | string[] | undefined) {
  const normalized = normalizeSingleValue(value).trim();

  return /^\d{4}-\d{2}-\d{2}$/.test(normalized) ? normalized : null;
}

function normalizeStatusFilter(
  value: string | string[] | undefined,
): AttendanceStatusFilter {
  const normalized = normalizeSingleValue(value).trim().toUpperCase();

  if (
    normalized === "SUCCESS" ||
    normalized === "REJECTED" ||
    normalized === "UNREGISTERED" ||
    normalized === "DUPLICATE"
  ) {
    return normalized;
  }

  return "ALL";
}
