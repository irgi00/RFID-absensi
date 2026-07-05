export type RoomStatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

export type RoomSummaryStats = {
  totalRooms: number;
  activeRooms: number;
  inactiveRooms: number;
  roomsInSchedules: number;
};

export type RoomListItem = {
  id: string;
  code: string;
  name: string;
  building: string | null;
  floor: string | null;
  capacity: number | null;
  isActive: boolean;
  scheduleCount: number;
};

export type RoomListResponse = {
  rooms: RoomListItem[];
  summary: RoomSummaryStats;
};

export type RoomFieldErrors = Partial<
  Record<"code" | "name" | "building" | "floor" | "capacity", string>
>;
