export type SubjectStatusFilter = "ALL" | "ACTIVE" | "INACTIVE";

export type SubjectSummaryStats = {
  totalSubjects: number;
  activeSubjects: number;
  inactiveSubjects: number;
  subjectsInSchedules: number;
};

export type SubjectListItem = {
  id: string;
  code: string;
  name: string;
  credits: number;
  isActive: boolean;
  scheduleCount: number;
};

export type SubjectListResponse = {
  subjects: SubjectListItem[];
  summary: SubjectSummaryStats;
};

export type SubjectFieldErrors = Partial<Record<"code" | "name" | "credits", string>>;
