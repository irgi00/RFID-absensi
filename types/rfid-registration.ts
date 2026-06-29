import type { StudentCardState } from "@/types/students";

export type RfidRegistrationStudent = {
  id: string;
  nim: string;
  fullName: string;
  isActive: boolean;
  classCode: string;
  className: string;
  studyProgram: string | null;
  departmentName: string | null;
  cardStatus: StudentCardState;
  cardUid: string | null;
  cardLabel: string | null;
};

export type RfidRegistrationDevice = {
  id: string;
  deviceCode: string;
  deviceName: string;
  roomName: string | null;
  roomCode: string | null;
  isActive: boolean;
  lastSeenAt: string | null;
};

export type RfidRegistrationScanOwner = {
  studentId: string;
  studentName: string;
  studentNim: string;
};

export type RfidRegistrationScan = {
  id: string;
  uid: string;
  scannedAt: string;
  deviceCode: string;
  deviceName: string | null;
  roomName: string | null;
  roomCode: string | null;
  activeCardOwner: RfidRegistrationScanOwner | null;
};

export type RfidRegistrationStudentResponse = {
  student: RfidRegistrationStudent;
};

export type RfidRegistrationScanResponse = {
  device: RfidRegistrationDevice | null;
  scan: RfidRegistrationScan | null;
};
