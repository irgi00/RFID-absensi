import type { ModulePlaceholderContent, SidebarItem } from "@/types";

const dashboardNavigationItems: SidebarItem[] = [
  {
    href: "/dashboard",
    label: "Dashboard",
    description: "Pantau statistik utama, aktivitas scan terbaru, dan status perangkat.",
    icon: "dashboard",
  },
  {
    href: "/dashboard/classes",
    label: "Kelas",
    description: "Kelola daftar kelas yang digunakan dalam proses absensi.",
    icon: "classes",
  },
  {
    href: "/dashboard/students",
    label: "Mahasiswa",
    description: "Kelola identitas mahasiswa dan status data aktif.",
    icon: "students",
  },
  {
    href: "/dashboard/rfid-cards",
    label: "Kartu RFID",
    description: "Kelola kartu RFID yang terhubung ke data mahasiswa.",
    icon: "rfid-card",
  },
  {
    href: "/dashboard/rooms",
    label: "Ruangan",
    description: "Kelola ruangan yang dipakai sebagai titik absensi.",
    icon: "rooms",
  },
  {
    href: "/dashboard/devices",
    label: "Perangkat RFID",
    description: "Pantau perangkat RFID yang terdaftar beserta penempatannya.",
    icon: "devices",
  },
  {
    href: "/dashboard/courses",
    label: "Mata Kuliah",
    description: "Kelola daftar mata kuliah yang dipakai dalam jadwal kuliah.",
    icon: "courses",
  },
  {
    href: "/dashboard/class-schedules",
    label: "Jadwal Kuliah",
    description: "Kelola jadwal perkuliahan yang digunakan oleh sistem absensi RFID.",
    icon: "schedules",
  },
  {
    href: "/dashboard/lecturers",
    label: "Dosen",
    description: "Kelola data dosen pengampu untuk kebutuhan akademik.",
    icon: "lecturers",
  },
  {
    href: "/dashboard/attendance",
    label: "Absensi",
    description: "Tinjau riwayat kehadiran dan aktivitas scan mahasiswa.",
    icon: "attendance",
  },
  {
    href: "/dashboard/reports",
    label: "Laporan",
    description: "Lihat ringkasan dan rekap data absensi.",
    icon: "reports",
  },
];

const mvpSidebarMenu = new Set([
  "/dashboard",
  "/dashboard/students",
  "/dashboard/rfid-cards",
  "/dashboard/rooms",
  "/dashboard/courses",
  "/dashboard/lecturers",
  "/dashboard/classes",
  "/dashboard/class-schedules",
  "/dashboard/attendance",
]);

export const adminNavigation: SidebarItem[] = dashboardNavigationItems.filter((item) =>
  mvpSidebarMenu.has(item.href),
);

export function isDashboardNavigationActive(href: string, pathname: string) {
  if (href === "/dashboard") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function getDashboardNavigationItem(pathname: string) {
  return dashboardNavigationItems.find((item) =>
    isDashboardNavigationActive(item.href, pathname),
  );
}

export const modulePlaceholders: Record<string, ModulePlaceholderContent> = {
  classes: {
    title: "Kelas",
    eyebrow: "Modul",
    description: "Kelola daftar kelas yang digunakan dalam proses absensi.",
    focusItems: [],
  },
  students: {
    title: "Mahasiswa",
    eyebrow: "Modul",
    description: "Kelola identitas mahasiswa, NIM, dan status data aktif.",
    focusItems: [],
  },
  "rfid-cards": {
    title: "Kartu RFID",
    eyebrow: "Modul",
    description: "Kelola kartu RFID yang terhubung ke data mahasiswa.",
    focusItems: [],
  },
  rooms: {
    title: "Ruangan",
    eyebrow: "Modul",
    description: "Kelola ruangan yang digunakan sebagai titik absensi.",
    focusItems: [],
  },
  devices: {
    title: "Perangkat RFID",
    eyebrow: "Modul",
    description: "Pantau perangkat RFID yang terdaftar beserta penempatannya.",
    focusItems: [],
  },
  courses: {
    title: "Mata Kuliah",
    eyebrow: "Modul",
    description: "Kelola daftar mata kuliah yang digunakan dalam jadwal kuliah.",
    focusItems: [],
  },
  lecturers: {
    title: "Dosen",
    eyebrow: "Modul",
    description: "Kelola data dosen pengampu untuk kebutuhan akademik.",
    focusItems: [],
  },
  schedules: {
    title: "Jadwal Kuliah",
    eyebrow: "Modul",
    description: "Kelola jadwal kuliah dan waktu absensi setiap sesi.",
    focusItems: [],
  },
  attendance: {
    title: "Absensi",
    eyebrow: "Modul",
    description: "Tinjau riwayat kehadiran dan aktivitas scan mahasiswa.",
    focusItems: [],
  },
  reports: {
    title: "Laporan",
    eyebrow: "Modul",
    description: "Lihat ringkasan dan rekap data absensi.",
    focusItems: [],
  },
};




