import Link from "next/link";

import type { SummaryCard as SummaryCardType } from "@/types";

import { DeviceStatusPanel } from "@/components/dashboard/device-status-panel";
import { DashboardIcon } from "@/components/dashboard/dashboard-icon";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { DataTable, type DataTableRow } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageTitle } from "@/components/ui/page-title";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  getDashboardDeviceStatuses,
  getDashboardStats,
  getRecentScanActivities,
} from "@/lib/dashboard";

const formatNumber = new Intl.NumberFormat("id-ID");
const scanTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const responseCodeLabelMap: Record<string, string> = {
  PRESENT: "Hadir",
  LATE: "Terlambat",
  ALREADY_ATTENDED: "Sudah absen",
  CARD_NOT_REGISTERED: "Kartu belum terdaftar",
  CARD_INACTIVE: "Kartu nonaktif",
  NO_ACTIVE_SCHEDULE: "Tidak ada jadwal",
  NOT_YOUR_CLASS: "Bukan kelasnya",
  ATTENDANCE_CLOSED: "Absensi ditutup",
  DEVICE_NOT_REGISTERED: "Perangkat tidak dikenali",
  SERVER_ERROR: "Kesalahan server",
};

const responseCodeToneMap: Record<
  string,
  "primary" | "success" | "warning" | "danger" | "neutral"
> = {
  PRESENT: "success",
  LATE: "warning",
  ALREADY_ATTENDED: "neutral",
  CARD_NOT_REGISTERED: "danger",
  CARD_INACTIVE: "neutral",
  NO_ACTIVE_SCHEDULE: "warning",
  NOT_YOUR_CLASS: "danger",
  ATTENDANCE_CLOSED: "danger",
  DEVICE_NOT_REGISTERED: "danger",
  SERVER_ERROR: "danger",
};

export default async function DashboardPage() {
  const [stats, recentScans, deviceStatuses] = await Promise.all([
    getDashboardStats(),
    getRecentScanActivities(),
    getDashboardDeviceStatuses(),
  ]);

  const cards: SummaryCardType[] = [
    {
      label: "Total Mahasiswa",
      value: formatNumber.format(stats.totalStudents),
      hint: "Jumlah seluruh mahasiswa yang sudah tercatat di sistem.",
      badge: stats.totalStudents > 0 ? "Terdata" : "Kosong",
      tone: "primary",
      icon: "students",
    },
    {
      label: "Kartu RFID Aktif",
      value: formatNumber.format(stats.totalActiveCards),
      hint: "Kartu aktif yang siap dipakai untuk proses absensi.",
      badge: stats.totalActiveCards > 0 ? "Siap dipakai" : "Belum ada",
      tone: stats.totalActiveCards > 0 ? "success" : "neutral",
      icon: "rfid-card",
    },
    {
      label: "Perangkat RFID Aktif",
      value: formatNumber.format(stats.totalActiveDevices),
      hint: "Perangkat yang aktif dan dapat dipakai di ruang absensi.",
      badge: stats.totalActiveDevices > 0 ? "Tersedia" : "Belum aktif",
      tone: stats.totalActiveDevices > 0 ? "success" : "neutral",
      icon: "devices",
    },
    {
      label: "Absensi Hari Ini",
      value: formatNumber.format(stats.totalAttendancesToday),
      hint: "Jumlah kehadiran yang tercatat untuk sesi hari ini.",
      badge: stats.totalAttendancesToday > 0 ? "Ada aktivitas" : "Belum ada",
      tone: stats.totalAttendancesToday > 0 ? "warning" : "neutral",
      icon: "attendance",
    },
  ];

  const isDashboardEmpty =
    stats.totalStudents === 0 &&
    stats.totalActiveCards === 0 &&
    stats.totalActiveDevices === 0 &&
    stats.totalAttendancesToday === 0 &&
    recentScans.length === 0 &&
    deviceStatuses.length === 0;

  const recentScanRows: DataTableRow[] = recentScans.map((scan) => {
    const studentLabel = scan.studentName ?? "Kartu belum terhubung";
    const studentMeta = scan.studentNim ? `NIM ${scan.studentNim}` : `UID ${scan.uid}`;
    const deviceLabel = scan.deviceName ?? scan.deviceCode;
    const deviceMeta = scan.roomName
      ? `${scan.deviceCode}  -  ${scan.roomName}${scan.roomCode ? ` (${scan.roomCode})` : ""}`
      : scan.deviceCode;
    const badgeLabel = responseCodeLabelMap[scan.responseCode] ?? scan.responseCode;
    const badgeTone = responseCodeToneMap[scan.responseCode] ?? "neutral";

    return {
      key: scan.id,
      cells: [
        <div key="time">
          <p className="font-semibold text-[color:var(--color-foreground)] transition-colors group-hover:text-[color:var(--color-primary)]">
            {scanTimeFormatter.format(new Date(scan.scannedAt))}
          </p>
          <p className="mt-1 text-xs text-[color:var(--color-muted)] transition-colors group-hover:text-[color:var(--color-primary)]">
            Waktu scan
          </p>
        </div>,
        <div key="student">
          <p className="font-semibold text-[color:var(--color-foreground)] transition-colors group-hover:text-[color:var(--color-primary)]">
            {studentLabel}
          </p>
          <p className="mt-1 text-xs text-[color:var(--color-muted)] transition-colors group-hover:text-[color:var(--color-primary)]">
            {studentMeta}
          </p>
        </div>,
        <div key="device">
          <p className="font-semibold text-[color:var(--color-foreground)] transition-colors group-hover:text-[color:var(--color-primary)]">
            {deviceLabel}
          </p>
          <p className="mt-1 text-xs text-[color:var(--color-muted)] transition-colors group-hover:text-[color:var(--color-primary)]">
            {deviceMeta}
          </p>
        </div>,
        <StatusBadge key="status" label={badgeLabel} tone={badgeTone} />,
        <span
          key="message"
          className="text-sm leading-6 text-[color:var(--color-muted)] transition-colors group-hover:text-[color:var(--color-primary)]"
        >
          {scan.message}
        </span>,
      ],
    } satisfies DataTableRow;
  });

  return (
    <section className="space-y-5">
      <PageTitle
        eyebrow="Dashboard Admin"
        title="Ringkasan Absensi Hari Ini"
        description="Lihat statistik utama, scan terbaru, dan kondisi perangkat dari satu halaman ringkas."
        meta={
          <>
            <StatusBadge label="Dashboard admin" tone="primary" />
            <StatusBadge
              label={
                stats.totalAttendancesToday > 0
                  ? "Aktivitas hari ini terdeteksi"
                  : "Belum ada scan hari ini"
              }
              tone={stats.totalAttendancesToday > 0 ? "warning" : "neutral"}
            />
          </>
        }
        actions={
          <>
            <Link
              href="/dashboard/students"
              className="inline-flex items-center justify-center rounded-full bg-[color:var(--color-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--color-primary-strong)]"
            >
              Data mahasiswa
            </Link>
            <Link
              href="/dashboard/attendance"
              className="inline-flex items-center justify-center rounded-full border border-[color:var(--color-border)] bg-white px-5 py-3 text-sm font-semibold text-[color:var(--color-foreground)] transition hover:bg-[color:var(--color-surface-muted)]"
            >
              Lihat absensi
            </Link>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <SummaryCard key={card.label} card={card} />
        ))}
      </div>

      {isDashboardEmpty ? (
        <EmptyState
          title="Belum ada aktivitas yang ditampilkan"
          description="Tambahkan mahasiswa, kartu RFID, atau perangkat untuk mulai melihat ringkasan absensi di dashboard."
          icon={<DashboardIcon name="dashboard" className="h-7 w-7" />}
          action={
            <Link
              href="/dashboard/students"
              className="inline-flex items-center justify-center rounded-full bg-[color:var(--color-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--color-primary-strong)]"
            >
              Kelola mahasiswa
            </Link>
          }
        />
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.75fr)_340px]">
        <DataTable
          title="Aktivitas Scan Terbaru"
          description="Enam aktivitas scan paling akhir yang masuk dari perangkat RFID."
          columns={[
            { key: "time", label: "Waktu", className: "w-[150px]" },
            { key: "student", label: "Mahasiswa", className: "w-[240px]" },
            { key: "device", label: "Perangkat", className: "w-[220px]" },
            { key: "status", label: "Hasil", className: "w-[160px]" },
            { key: "message", label: "Pesan" },
          ]}
          rows={recentScanRows}
          emptyMessage="Belum ada aktivitas scan yang tercatat untuk ditampilkan."
        />

        <DeviceStatusPanel devices={deviceStatuses} />
      </div>
    </section>
  );
}
