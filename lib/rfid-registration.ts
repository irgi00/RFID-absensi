import "server-only";

import { sql } from "@/lib/db";
import type {
  RfidRegistrationDevice,
  RfidRegistrationScan,
  RfidRegistrationStudent,
} from "@/types/rfid-registration";

type RegistrationStudentRow = {
  id: string;
  nim: string;
  fullName: string;
  isActive: boolean;
  classCode: string;
  className: string;
  studyProgram: string | null;
  cardStatus: RfidRegistrationStudent["cardStatus"];
  cardUid: string | null;
  cardLabel: string | null;
};

type RegistrationDeviceRow = {
  id: string;
  deviceCode: string;
  deviceName: string;
  roomName: string | null;
  roomCode: string | null;
  isActive: boolean;
  lastSeenAt: string | null;
};

type RegistrationScanRow = {
  id: string;
  uid: string;
  scannedAt: string;
  deviceCode: string;
  deviceName: string | null;
  roomName: string | null;
  roomCode: string | null;
  activeCardOwnerStudentId: string | null;
  activeCardOwnerStudentName: string | null;
  activeCardOwnerStudentNim: string | null;
};

function mapRegistrationDevice(row: RegistrationDeviceRow): RfidRegistrationDevice {
  return {
    id: row.id,
    deviceCode: row.deviceCode,
    deviceName: row.deviceName,
    roomName: row.roomName,
    roomCode: row.roomCode,
    isActive: row.isActive,
    lastSeenAt: row.lastSeenAt,
  };
}

export async function findRegistrationStudentByNim(nim: string) {
  const normalizedNim = nim.trim();

  if (!normalizedNim) {
    return null;
  }

  const rows = (await sql`
    WITH student_cards AS (
      SELECT
        students.id,
        students.nim,
        students.full_name AS "fullName",
        students.is_active AS "isActive",
        classes.code AS "classCode",
        classes.name AS "className",
        classes.study_program AS "studyProgram",
        COALESCE(active_card.uid, latest_card.uid) AS "cardUid",
        COALESCE(active_card.card_label, latest_card.card_label) AS "cardLabel",
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
        SELECT uid, card_label
        FROM rfid_cards
        WHERE student_id = students.id
          AND status = 'ACTIVE'
        ORDER BY issued_at DESC, created_at DESC
        LIMIT 1
      ) active_card
        ON TRUE
      LEFT JOIN LATERAL (
        SELECT uid, card_label, status
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
      "classCode",
      "className",
      "studyProgram",
      "cardStatus",
      "cardUid",
      "cardLabel"
    FROM student_cards
    WHERE LOWER(nim) = LOWER(${normalizedNim})
    LIMIT 1
  `) as RegistrationStudentRow[];

  const row = rows[0];

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    nim: row.nim,
    fullName: row.fullName,
    isActive: row.isActive,
    classCode: row.classCode,
    className: row.className,
    studyProgram: row.studyProgram,
    departmentName: null,
    cardStatus: row.cardStatus,
    cardUid: row.cardUid,
    cardLabel: row.cardLabel,
  } satisfies RfidRegistrationStudent;
}

export async function getPreferredRegistrationDevice(deviceCode?: string) {
  const preferredCode = deviceCode?.trim() ?? "";

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
    WHERE (${preferredCode} = '' OR devices.device_code = ${preferredCode})
    ORDER BY devices.is_active DESC, devices.last_seen_at DESC NULLS LAST, devices.name ASC
    LIMIT 1
  `) as RegistrationDeviceRow[];

  if (rows[0]) {
    return mapRegistrationDevice(rows[0]);
  }

  if (preferredCode) {
    return null;
  }

  return null;
}

export async function findLatestRegistrationScan(input?: {
  since?: string;
  deviceCode?: string;
}) {
  const deviceCode = input?.deviceCode?.trim() ?? "";
  const parsedSince = input?.since ? new Date(input.since) : null;
  const since =
    parsedSince && !Number.isNaN(parsedSince.getTime()) ? parsedSince.toISOString() : null;

  const rows = (await sql`
    SELECT
      logs.id,
      logs.uid,
      logs.scanned_at AS "scannedAt",
      logs.device_code AS "deviceCode",
      devices.name AS "deviceName",
      rooms.name AS "roomName",
      rooms.code AS "roomCode",
      active_owner.student_id AS "activeCardOwnerStudentId",
      active_owner.student_name AS "activeCardOwnerStudentName",
      active_owner.student_nim AS "activeCardOwnerStudentNim"
    FROM rfid_scan_logs logs
    LEFT JOIN devices
      ON devices.id = logs.device_id
    LEFT JOIN rooms
      ON rooms.id = logs.room_id
    LEFT JOIN LATERAL (
      SELECT
        rfid_cards.student_id,
        students.full_name AS student_name,
        students.nim AS student_nim
      FROM rfid_cards
      INNER JOIN students
        ON students.id = rfid_cards.student_id
      WHERE rfid_cards.uid = logs.uid
        AND rfid_cards.status = 'ACTIVE'
      LIMIT 1
    ) active_owner
      ON TRUE
    WHERE (${deviceCode} = '' OR logs.device_code = ${deviceCode})
      AND (${since} IS NULL OR logs.scanned_at >= ${since})
    ORDER BY logs.scanned_at DESC
    LIMIT 1
  `) as RegistrationScanRow[];

  const row = rows[0];

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    uid: row.uid,
    scannedAt: row.scannedAt,
    deviceCode: row.deviceCode,
    deviceName: row.deviceName,
    roomName: row.roomName,
    roomCode: row.roomCode,
    activeCardOwner: row.activeCardOwnerStudentId
      ? {
          studentId: row.activeCardOwnerStudentId,
          studentName: row.activeCardOwnerStudentName ?? "-",
          studentNim: row.activeCardOwnerStudentNim ?? "-",
        }
      : null,
  } satisfies RfidRegistrationScan;
}
