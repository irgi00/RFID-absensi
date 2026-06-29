import { sql } from "@/lib/db";

type DashboardStatsRow = {
  totalStudents: number | string;
  totalActiveCards: number | string;
  totalActiveDevices: number | string;
  totalAttendancesToday: number | string;
};

type RecentScanActivityRow = {
  id: string;
  studentName: string | null;
  studentNim: string | null;
  uid: string;
  deviceCode: string;
  deviceName: string | null;
  roomName: string | null;
  roomCode: string | null;
  responseCode: string;
  message: string;
  scannedAt: string;
};

type DashboardDeviceStatusRow = {
  id: string;
  deviceCode: string;
  deviceName: string;
  roomName: string | null;
  roomCode: string | null;
  isActive: boolean;
  lastSeenAt: string | null;
};

export type DashboardStats = {
  totalStudents: number;
  totalActiveCards: number;
  totalActiveDevices: number;
  totalAttendancesToday: number;
};

export type RecentScanActivity = {
  id: string;
  studentName: string | null;
  studentNim: string | null;
  uid: string;
  deviceCode: string;
  deviceName: string | null;
  roomName: string | null;
  roomCode: string | null;
  responseCode: string;
  message: string;
  scannedAt: string;
};

export type DashboardDeviceStatus = {
  id: string;
  deviceCode: string;
  deviceName: string;
  roomName: string | null;
  roomCode: string | null;
  isActive: boolean;
  lastSeenAt: string | null;
};

export async function getDashboardStats() {
  const rows = (await sql`
    SELECT
      (SELECT COUNT(*)::int FROM students) AS "totalStudents",
      (
        SELECT COUNT(*)::int
        FROM rfid_cards
        WHERE status = 'ACTIVE'
      ) AS "totalActiveCards",
      (
        SELECT COUNT(*)::int
        FROM devices
        WHERE is_active = TRUE
      ) AS "totalActiveDevices",
      (
        SELECT COUNT(*)::int
        FROM attendance_records attendance
        INNER JOIN attendance_sessions sessions
          ON sessions.id = attendance.session_id
        WHERE sessions.session_date = CURRENT_DATE
      ) AS "totalAttendancesToday"
  `) as DashboardStatsRow[];

  const row = rows[0];

  return {
    totalStudents: Number(row?.totalStudents ?? 0),
    totalActiveCards: Number(row?.totalActiveCards ?? 0),
    totalActiveDevices: Number(row?.totalActiveDevices ?? 0),
    totalAttendancesToday: Number(row?.totalAttendancesToday ?? 0),
  } satisfies DashboardStats;
}

export async function getRecentScanActivities(limit = 6) {
  const rows = (await sql`
    SELECT
      logs.id,
      students.full_name AS "studentName",
      students.nim AS "studentNim",
      logs.uid,
      logs.device_code AS "deviceCode",
      devices.name AS "deviceName",
      rooms.name AS "roomName",
      rooms.code AS "roomCode",
      logs.response_code AS "responseCode",
      logs.message,
      logs.scanned_at AS "scannedAt"
    FROM rfid_scan_logs logs
    LEFT JOIN students
      ON students.id = logs.student_id
    LEFT JOIN devices
      ON devices.id = logs.device_id
    LEFT JOIN rooms
      ON rooms.id = logs.room_id
    ORDER BY logs.scanned_at DESC
    LIMIT ${limit}
  `) as RecentScanActivityRow[];

  return rows.map((row) => ({
    id: row.id,
    studentName: row.studentName,
    studentNim: row.studentNim,
    uid: row.uid,
    deviceCode: row.deviceCode,
    deviceName: row.deviceName,
    roomName: row.roomName,
    roomCode: row.roomCode,
    responseCode: row.responseCode,
    message: row.message,
    scannedAt: row.scannedAt,
  })) satisfies RecentScanActivity[];
}

export async function getDashboardDeviceStatuses(limit = 5) {
  const rows = (await sql`
    SELECT
      devices.id,
      devices.device_code AS "deviceCode",
      devices.name AS "deviceName",
      rooms.name AS "roomName",
      rooms.code AS "roomCode",
      devices.is_active AS "isActive",
      devices.last_seen_at AS "lastSeenAt"
    FROM devices
    LEFT JOIN rooms
      ON rooms.id = devices.room_id
    ORDER BY devices.is_active DESC, devices.name ASC
    LIMIT ${limit}
  `) as DashboardDeviceStatusRow[];

  return rows.map((row) => ({
    id: row.id,
    deviceCode: row.deviceCode,
    deviceName: row.deviceName,
    roomName: row.roomName,
    roomCode: row.roomCode,
    isActive: row.isActive,
    lastSeenAt: row.lastSeenAt,
  })) satisfies DashboardDeviceStatus[];
}
