export type DashboardIconName =
  | "dashboard"
  | "classes"
  | "students"
  | "rfid-card"
  | "rooms"
  | "devices"
  | "courses"
  | "lecturers"
  | "schedules"
  | "attendance"
  | "reports"
  | "shield"
  | "logout"
  | "bell";

export type SidebarItem = {
  href: string;
  label: string;
  description: string;
  icon: DashboardIconName;
};

export type SummaryCardTone = "primary" | "success" | "warning" | "neutral";

export type SummaryCard = {
  label: string;
  value: string;
  hint: string;
  badge?: string;
  icon: DashboardIconName;
  tone: SummaryCardTone;
};

export type ModulePlaceholderContent = {
  title: string;
  eyebrow: string;
  description: string;
  focusItems: string[];
};
