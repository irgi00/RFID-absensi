export type StudentStatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

export type StudentCardFilter = "ALL" | "REGISTERED" | "UNREGISTERED";

export type StudentCardState =
  | "REGISTERED"
  | "UNREGISTERED"
  | "INACTIVE"
  | "LOST";

export type StudentClassOption = {
  id: string;
  code: string;
  name: string;
  studyProgram: string | null;
  cohortYear: number | null;
  isActive: boolean;
};

export type StudentSummaryStats = {
  totalStudents: number;
  activeStudents: number;
  inactiveStudents: number;
  studentsWithoutActiveCard: number;
};

export type StudentListItem = {
  id: string;
  nim: string;
  fullName: string;
  isActive: boolean;
  classId: string;
  classCode: string;
  className: string;
  classIsActive: boolean;
  studyProgram: string | null;
  cardStatus: StudentCardState;
  cardUid: string | null;
};

export type StudentPagination = {
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
};

export type StudentListResponse = {
  students: StudentListItem[];
  summary: StudentSummaryStats;
  pagination: StudentPagination;
};

export type StudentFieldErrors = Partial<
  Record<"nim" | "fullName" | "classId" | "uid" | "cardLabel", string>
>;
