import { NextResponse } from "next/server";

import { buildAttendanceQueryParts, parseAttendanceFilters } from "@/lib/attendance";
import { sql } from "@/lib/db";

const ATTENDANCE_STATUS_MAP: Record<string, string> = {
  PRESENT: "Hadir",
  LATE: "Terlambat",
  ABSENT: "Alpa",
};

const SCAN_STATUS_MAP: Record<string, string> = {
  SUCCESS: "Berhasil",
  REJECTED: "Ditolak",
  UNREGISTERED: "Kartu Tidak Terdaftar",
  DUPLICATE: "Duplikat",
  ERROR: "Error",
};

function escapeCSV(val: string | null | undefined): string {
  if (!val) return "-";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

type ExportRow = {
  scan_time: string;
  nim: string | null;
  student_name: string | null;
  uid: string;
  subject_name: string | null;
  lecturer_name: string | null;
  class_name: string | null;
  room_name: string | null;
  attendance_status: string | null;
  scan_status: string;
  device_name: string | null;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const rawParams = Object.fromEntries(searchParams.entries());
    const filters = parseAttendanceFilters(rawParams);

    const queryParts = buildAttendanceQueryParts(filters);

    const rows = await sql.query(
      `
        SELECT
          TO_CHAR(logs.scanned_at AT TIME ZONE 'Asia/Jakarta', 'YYYY-MM-DD HH24:MI:SS') AS scan_time,
          students.nim,
          students.full_name AS student_name,
          logs.uid,
          courses.name AS subject_name,
          lecturers.full_name AS lecturer_name,
          classes.name AS class_name,
          rooms.name AS room_name,
          attendance_records.status AS attendance_status,
          logs.log_status AS scan_status,
          devices.name AS device_name
        FROM rfid_scan_logs logs
        LEFT JOIN students ON students.id = logs.student_id
        LEFT JOIN classes ON classes.id = students.class_id
        LEFT JOIN class_schedules ON class_schedules.id = logs.schedule_id
        LEFT JOIN courses ON courses.id = class_schedules.course_id
        LEFT JOIN lecturers ON lecturers.id = class_schedules.lecturer_id
        LEFT JOIN rooms ON rooms.id = logs.room_id
        LEFT JOIN devices ON devices.id = logs.device_id
        LEFT JOIN attendance_records ON attendance_records.id = logs.attendance_record_id
        ${queryParts.whereClause}
        ORDER BY logs.scanned_at DESC
      `,
      queryParts.params
    );

    const header = [
      "Waktu Scan",
      "NIM",
      "Nama Mahasiswa",
      "UID RFID",
      "Mata Kuliah",
      "Dosen",
      "Kelas",
      "Ruangan",
      "Status Absensi",
      "Status Scan",
      "Perangkat",
    ];

    const csvRows = [header.map(escapeCSV).join(",")];

    for (const row of rows as ExportRow[]) {
      csvRows.push(
        [
          row.scan_time,
          row.nim,
          row.student_name,
          row.uid,
          row.subject_name,
          row.lecturer_name,
          row.class_name,
          row.room_name,
          row.attendance_status ? (ATTENDANCE_STATUS_MAP[row.attendance_status] || row.attendance_status) : "-",
          SCAN_STATUS_MAP[row.scan_status] || row.scan_status,
          row.device_name,
        ]
          .map(escapeCSV)
          .join(",")
      );
    }

    const csvContent = "\uFEFF" + csvRows.join("\n"); // Add BOM for Excel UTF-8 compatibility
    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `attendance-${dateStr}.csv`;

    return new NextResponse(csvContent, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("[ATTENDANCE_EXPORT_ERROR]", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
