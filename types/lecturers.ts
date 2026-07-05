export type LecturerStatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

export type LecturerSummaryStats = {
  totalLecturers: number;
  activeLecturers: number;
  inactiveLecturers: number;
  lecturersInSchedules: number;
};

export type LecturerListItem = {
  id: string;
  code: string | null;
  fullName: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  scheduleCount: number;
};

export type LecturerListResponse = {
  lecturers: LecturerListItem[];
  summary: LecturerSummaryStats;
};

export type LecturerFieldErrors = Partial<
  Record<"code" | "fullName" | "email" | "phone", string>
>;
