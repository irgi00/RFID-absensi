export type ClassStatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

export type ClassSummaryStats = {
  totalClasses: number;
  activeClasses: number;
  inactiveClasses: number;
  classesInSchedules: number;
};

export type ClassListItem = {
  id: string;
  code: string;
  name: string;
  studyProgram: string | null;
  cohortYear: number | null;
  isActive: boolean;
  studentCount: number;
  scheduleCount: number;
};

export type ClassListResponse = {
  classes: ClassListItem[];
  summary: ClassSummaryStats;
};

export type ClassFieldErrors = Partial<
  Record<"code" | "name" | "studyProgram" | "cohortYear", string>
>;
