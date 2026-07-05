export type ClassScheduleListItem = {
  id: string;
  subjectId: string;
  subject: string;
  classId: string;
  class: string;
  lecturerId: string;
  lecturer: string;
  roomId: string;
  room: string;
  day: string;
  startTime: string;
  endTime: string;
  onTimeCutoff: string;
  active: boolean;
};

export type ClassScheduleListResponse = {
  schedules: ClassScheduleListItem[];
};

export type ClassScheduleOptionItem = {
  id: string;
  label: string;
  active: boolean;
};

export type ClassScheduleOptionsResponse = {
  subjects: ClassScheduleOptionItem[];
  classes: ClassScheduleOptionItem[];
  lecturers: ClassScheduleOptionItem[];
  rooms: ClassScheduleOptionItem[];
};

export type ClassScheduleFieldErrors = Partial<
  Record<
    | "subjectId"
    | "classId"
    | "lecturerId"
    | "roomId"
    | "day"
    | "startTime"
    | "endTime"
    | "onTimeCutoff"
    | "form",
    string
  >
>;
