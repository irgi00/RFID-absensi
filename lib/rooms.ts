import "server-only";

import { z } from "zod";

import { sql } from "@/lib/db";
import type {
  RoomFieldErrors,
  RoomListItem,
  RoomListResponse,
  RoomStatusFilter,
  RoomSummaryStats,
} from "@/types/rooms";

type RoomSummaryRow = {
  totalRooms: number | string;
  activeRooms: number | string;
  inactiveRooms: number | string;
  roomsInSchedules: number | string;
};

type RoomRow = {
  id: string;
  code: string;
  name: string;
  building: string | null;
  floor: string | null;
  capacity: number | string | null;
  isActive: boolean;
  scheduleCount: number | string;
};

type RoomIdRow = {
  id: string;
};

type RoomReferenceRow = {
  scheduleCount: number | string;
};

type RoomDeviceReferenceRow = {
  deviceCount: number | string;
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
      fieldErrors?: RoomFieldErrors;
    };

type RoomMutationInput = {
  code: string;
  name: string;
  building: string | null;
  floor: string | null;
  capacity: number | null;
  isActive: boolean;
};

export const roomPayloadSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, "Kode ruangan wajib diisi.")
    .max(30, "Kode ruangan maksimal 30 karakter.")
    .transform((value) => value.toUpperCase()),
  name: z
    .string()
    .trim()
    .min(1, "Nama ruangan wajib diisi.")
    .max(100, "Nama ruangan maksimal 100 karakter."),
  building: z
    .string()
    .trim()
    .max(120, "Nama gedung maksimal 120 karakter.")
    .transform((value) => (value ? value : null)),
  floor: z
    .string()
    .trim()
    .max(30, "Nama lantai maksimal 30 karakter.")
    .transform((value) => (value ? value : null)),
  capacity: z
    .number()
    .int("Kapasitas harus berupa bilangan bulat.")
    .min(1, "Kapasitas minimal 1.")
    .nullable(),
  isActive: z.boolean(),
});

function toNumber(value: number | string | null | undefined) {
  return Number(value ?? 0);
}

function getStatusFilterValue(value?: string): RoomStatusFilter {
  if (value === "ACTIVE" || value === "INACTIVE") {
    return value;
  }

  return "ALL";
}

function mapRoomRow(row: RoomRow): RoomListItem {
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    building: row.building,
    floor: row.floor,
    capacity: row.capacity === null ? null : toNumber(row.capacity),
    isActive: row.isActive,
    scheduleCount: toNumber(row.scheduleCount),
  };
}

async function fetchRoomById(roomId: string) {
  const rows = (await sql`
    SELECT
      rooms.id,
      rooms.code,
      rooms.name,
      rooms.building,
      rooms.floor,
      rooms.capacity,
      rooms.is_active AS "isActive",
      COUNT(class_schedules.id)::int AS "scheduleCount"
    FROM rooms
    LEFT JOIN class_schedules
      ON class_schedules.room_id = rooms.id
    WHERE rooms.id = ${roomId}
    GROUP BY
      rooms.id,
      rooms.code,
      rooms.name,
      rooms.building,
      rooms.floor,
      rooms.capacity,
      rooms.is_active
    LIMIT 1
  `) as RoomRow[];

  return rows[0] ? mapRoomRow(rows[0]) : null;
}

async function findRoomIdByCode(code: string, excludeRoomId?: string | null) {
  const query = `
    SELECT id
    FROM rooms
    WHERE code = $1
    ${excludeRoomId ? "AND id <> $2" : ""}
    LIMIT 1
  `;
  const params = excludeRoomId ? [code, excludeRoomId] : [code];
  const rows = (await sql.query(query, params)) as RoomIdRow[];

  return rows[0] ?? null;
}

async function countRoomSchedules(roomId: string) {
  const rows = (await sql`
    SELECT COUNT(*)::int AS "scheduleCount"
    FROM class_schedules
    WHERE room_id = ${roomId}
  `) as RoomReferenceRow[];

  return toNumber(rows[0]?.scheduleCount);
}

async function countRoomDevices(roomId: string) {
  const rows = (await sql`
    SELECT COUNT(*)::int AS "deviceCount"
    FROM devices
    WHERE room_id = ${roomId}
  `) as RoomDeviceReferenceRow[];

  return toNumber(rows[0]?.deviceCount);
}

export async function listRooms(input?: {
  search?: string;
  status?: string;
}): Promise<RoomListResponse> {
  const search = input?.search?.trim() ?? "";
  const searchPattern = `%${search}%`;
  const status = getStatusFilterValue(input?.status);

  const summaryRows = (await sql`
    SELECT
      COUNT(*)::int AS "totalRooms",
      COUNT(*) FILTER (WHERE is_active = TRUE)::int AS "activeRooms",
      COUNT(*) FILTER (WHERE is_active = FALSE)::int AS "inactiveRooms",
      COUNT(*) FILTER (
        WHERE EXISTS (
          SELECT 1
          FROM class_schedules
          WHERE class_schedules.room_id = rooms.id
        )
      )::int AS "roomsInSchedules"
    FROM rooms
  `) as RoomSummaryRow[];

  const summary: RoomSummaryStats = {
    totalRooms: toNumber(summaryRows[0]?.totalRooms),
    activeRooms: toNumber(summaryRows[0]?.activeRooms),
    inactiveRooms: toNumber(summaryRows[0]?.inactiveRooms),
    roomsInSchedules: toNumber(summaryRows[0]?.roomsInSchedules),
  };

  const rows = (await sql`
    SELECT
      rooms.id,
      rooms.code,
      rooms.name,
      rooms.building,
      rooms.floor,
      rooms.capacity,
      rooms.is_active AS "isActive",
      COUNT(class_schedules.id)::int AS "scheduleCount"
    FROM rooms
    LEFT JOIN class_schedules
      ON class_schedules.room_id = rooms.id
    WHERE
      (
        ${search} = ''
        OR rooms.code ILIKE ${searchPattern}
        OR rooms.name ILIKE ${searchPattern}
        OR COALESCE(rooms.building, '') ILIKE ${searchPattern}
        OR COALESCE(rooms.floor, '') ILIKE ${searchPattern}
      )
      AND (
        ${status} = 'ALL'
        OR (${status} = 'ACTIVE' AND rooms.is_active = TRUE)
        OR (${status} = 'INACTIVE' AND rooms.is_active = FALSE)
      )
    GROUP BY
      rooms.id,
      rooms.code,
      rooms.name,
      rooms.building,
      rooms.floor,
      rooms.capacity,
      rooms.is_active
    ORDER BY
      rooms.is_active DESC,
      rooms.building ASC NULLS LAST,
      rooms.floor ASC NULLS LAST,
      rooms.name ASC,
      rooms.code ASC
  `) as RoomRow[];

  return {
    rooms: rows.map(mapRoomRow),
    summary,
  };
}

export async function createRoom(
  input: RoomMutationInput,
): Promise<MutationResult<RoomListItem>> {
  const duplicatedCode = await findRoomIdByCode(input.code);

  if (duplicatedCode) {
    return {
      ok: false,
      message: "Kode ruangan sudah digunakan.",
      fieldErrors: {
        code: "Gunakan kode lain karena data ini sudah terdaftar.",
      },
    };
  }

  const insertedRows = (await sql`
    INSERT INTO rooms (
      code,
      name,
      building,
      floor,
      capacity,
      is_active
    )
    VALUES (
      ${input.code},
      ${input.name},
      ${input.building},
      ${input.floor},
      ${input.capacity},
      ${input.isActive}
    )
    RETURNING id
  `) as RoomIdRow[];

  const room = insertedRows[0] ? await fetchRoomById(insertedRows[0].id) : null;

  if (!room) {
    return {
      ok: false,
      message: "Ruangan gagal disimpan. Silakan coba lagi.",
    };
  }

  return {
    ok: true,
    data: room,
    message: "Ruangan berhasil ditambahkan.",
  };
}

export async function updateRoom(
  roomId: string,
  input: RoomMutationInput,
): Promise<MutationResult<RoomListItem>> {
  const existingRoom = await fetchRoomById(roomId);

  if (!existingRoom) {
    return {
      ok: false,
      message: "Data ruangan tidak ditemukan.",
    };
  }

  const duplicatedCode = await findRoomIdByCode(input.code, roomId);

  if (duplicatedCode) {
    return {
      ok: false,
      message: "Kode ruangan sudah digunakan.",
      fieldErrors: {
        code: "Gunakan kode lain karena data ini sudah terdaftar.",
      },
    };
  }

  await sql`
    UPDATE rooms
    SET
      code = ${input.code},
      name = ${input.name},
      building = ${input.building},
      floor = ${input.floor},
      capacity = ${input.capacity},
      is_active = ${input.isActive}
    WHERE id = ${roomId}
  `;

  const updatedRoom = await fetchRoomById(roomId);

  if (!updatedRoom) {
    return {
      ok: false,
      message: "Perubahan ruangan gagal dimuat kembali.",
    };
  }

  return {
    ok: true,
    data: updatedRoom,
    message: "Data ruangan berhasil diperbarui.",
  };
}

export async function deleteRoom(
  roomId: string,
): Promise<MutationResult<{ id: string }>> {
  const existingRoom = await fetchRoomById(roomId);

  if (!existingRoom) {
    return {
      ok: false,
      message: "Data ruangan tidak ditemukan.",
    };
  }

  const [scheduleCount, deviceCount] = await Promise.all([
    countRoomSchedules(roomId),
    countRoomDevices(roomId),
  ]);

  if (scheduleCount > 0 && deviceCount > 0) {
    return {
      ok: false,
      message:
        "Ruangan tidak dapat dihapus karena masih digunakan pada jadwal kuliah dan perangkat RFID.",
    };
  }

  if (scheduleCount > 0) {
    return {
      ok: false,
      message: "Ruangan tidak dapat dihapus karena masih digunakan pada jadwal kuliah.",
    };
  }

  if (deviceCount > 0) {
    return {
      ok: false,
      message: "Ruangan tidak dapat dihapus karena masih digunakan pada perangkat RFID.",
    };
  }

  await sql`
    DELETE FROM rooms
    WHERE id = ${roomId}
  `;

  return {
    ok: true,
    data: { id: roomId },
    message: "Ruangan berhasil dihapus.",
  };
}
