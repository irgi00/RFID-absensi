"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";

import type {
  AttendanceFilters,
  AttendanceHistoryItem,
  AttendancePagination,
} from "@/lib/attendance";

import { DataTable, type DataTableRow } from "@/components/ui/data-table";
import { StatusBadge, type StatusBadgeTone } from "@/components/ui/status-badge";

type AttendanceHistoryTableProps = {
  scans: AttendanceHistoryItem[];
  filters: AttendanceFilters;
  pagination: AttendancePagination;
};

const dateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const weekdayFormatter = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
});

const timeFormatter = new Intl.DateTimeFormat("id-ID", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

type ScanStatusView = {
  label: string;
  tone: StatusBadgeTone;
};

function getScanStatusView(scan: AttendanceHistoryItem): ScanStatusView {
  if (scan.responseCode === "PRESENT" || scan.responseCode === "LATE") {
    return {
      label: "Hadir",
      tone: "success",
    };
  }

  if (
    scan.responseCode === "ALREADY_ATTENDED" ||
    scan.logStatus === "DUPLICATE"
  ) {
    return {
      label: "Sudah Absen",
      tone: "warning",
    };
  }

  if (
    scan.responseCode === "CARD_NOT_REGISTERED" ||
    scan.logStatus === "UNREGISTERED"
  ) {
    return {
      label: "Kartu Tidak Terdaftar",
      tone: "danger",
    };
  }

  if (
    scan.logStatus === "REJECTED" ||
    scan.logStatus === "ERROR" ||
    scan.responseCode === "CARD_INACTIVE" ||
    scan.responseCode === "NOT_YOUR_CLASS" ||
    scan.responseCode === "ATTENDANCE_CLOSED" ||
    scan.responseCode === "DEVICE_NOT_REGISTERED"
  ) {
    return {
      label: "Ditolak",
      tone: "danger",
    };
  }

  return {
    label: "Netral",
    tone: "neutral",
  };
}

function getStudentInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function buildAttendanceUrl(
  filters: AttendanceFilters,
  overrides?: Partial<Pick<AttendanceFilters, "page">>,
) {
  const searchParams = new URLSearchParams();
  const nextPage = overrides?.page ?? filters.page;

  if (filters.startDate) {
    searchParams.set("startDate", filters.startDate);
  }

  if (filters.endDate) {
    searchParams.set("endDate", filters.endDate);
  }

  if (filters.search) {
    searchParams.set("search", filters.search);
  }

  if (filters.status !== "ALL") {
    searchParams.set("status", filters.status);
  }

  if (nextPage > 1) {
    searchParams.set("page", String(nextPage));
  }

  const query = searchParams.toString();

  return query ? `/dashboard/attendance?${query}` : "/dashboard/attendance";
}

function DetailItem({
  label,
  value,
  valueNode,
}: {
  label: string;
  value?: string;
  valueNode?: ReactNode;
}) {
  return (
    <div className="rounded-[1.25rem] border border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] p-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted)]">
        {label}
      </p>
      {valueNode ? (
        <div className="mt-3">{valueNode}</div>
      ) : (
        <p className="mt-3 text-sm font-semibold text-[color:var(--color-foreground)]">
          {value}
        </p>
      )}
    </div>
  );
}

function AttendanceDetailModal({
  scan,
  onClose,
}: {
  scan: AttendanceHistoryItem | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!scan) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, scan]);

  if (!scan) {
    return null;
  }

  const statusView = getScanStatusView(scan);
  const studentName = scan.studentName ?? "Belum Terdaftar";
  const studentNim = scan.studentNim ?? "Belum Terdaftar";
  const scanTime = new Date(scan.scannedAt);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.52)] px-4 py-8 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="attendance-detail-title"
        className="w-full max-w-3xl rounded-[2rem] border border-white/70 bg-white p-6 shadow-[0_28px_80px_rgba(15,23,42,0.18)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--color-muted)]">
              Detail Scan
            </p>
            <h2
              id="attendance-detail-title"
              className="mt-3 text-[1.6rem] font-semibold tracking-tight text-[color:var(--color-foreground)]"
            >
              Riwayat Scan RFID
            </h2>
            <p className="mt-2 text-sm leading-7 text-[color:var(--color-muted)]">
              Tinjau hasil scan yang terekam pada sistem beserta identitas mahasiswa yang dikenali.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--color-border)] bg-white text-[color:var(--color-muted)] transition hover:bg-[color:var(--color-surface-muted)]"
            aria-label="Tutup detail scan"
          >
            x
          </button>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <StatusBadge label={statusView.label} tone={statusView.tone} />
          <span className="text-sm text-[color:var(--color-muted)]">
            {dateFormatter.format(scanTime)} pukul {timeFormatter.format(scanTime)}
          </span>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2">
          <DetailItem label="UID Kartu" value={scan.uid} />
          <DetailItem
            label="Waktu Scan"
            value={`${dateFormatter.format(scanTime)} - ${timeFormatter.format(scanTime)}`}
          />
          <DetailItem label="Nama Mahasiswa" value={studentName} />
          <DetailItem label="NIM" value={studentNim} />
          <DetailItem
            label="Status Scan"
            valueNode={<StatusBadge label={statusView.label} tone={statusView.tone} />}
          />
          <DetailItem label="Pesan Sistem" value={scan.message} />
          <DetailItem
            label="Kode Perangkat"
            value={scan.deviceName ? `${scan.deviceCode} - ${scan.deviceName}` : scan.deviceCode}
          />
          <DetailItem label="ID Log" value={scan.id} />
        </div>

        {scan.attendanceRecordId ? (
          <div className="mt-4">
            <DetailItem label="Referensi Absensi" value={scan.attendanceRecordId} />
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function AttendanceHistoryTable({
  scans,
  filters,
  pagination,
}: AttendanceHistoryTableProps) {
  const [selectedScan, setSelectedScan] = useState<AttendanceHistoryItem | null>(null);

  const rows = useMemo(
    () =>
      scans.map((scan) => {
        const scannedAt = new Date(scan.scannedAt);
        const statusView = getScanStatusView(scan);

        return {
          key: scan.id,
          cells: [
            <div key="date">
              <p className="font-semibold text-[color:var(--color-foreground)]">
                {dateFormatter.format(scannedAt)}
              </p>
              <p className="mt-1 text-xs text-[color:var(--color-muted)]">
                {weekdayFormatter.format(scannedAt)}
              </p>
            </div>,
            <div key="time">
              <p className="font-semibold text-[color:var(--color-foreground)]">
                {timeFormatter.format(scannedAt)}
              </p>
              <p className="mt-1 text-xs text-[color:var(--color-muted)]">
                Waktu scan
              </p>
            </div>,
            <div key="uid">
              <p className="font-semibold text-[color:var(--color-foreground)]">
                {scan.uid}
              </p>
              <p className="mt-1 text-xs text-[color:var(--color-muted)]">
                UID kartu
              </p>
            </div>,
            scan.studentName ? (
              <div key="student" className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--color-primary-soft)] text-sm font-semibold text-[color:var(--color-primary)]">
                  {getStudentInitials(scan.studentName)}
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-[color:var(--color-foreground)]">
                    {scan.studentName}
                  </p>
                  <p className="mt-1 text-xs text-[color:var(--color-muted)]">
                    Mahasiswa terhubung
                  </p>
                </div>
              </div>
            ) : (
              <div key="student">
                <p className="font-semibold text-[color:var(--color-foreground)]">
                  Belum Terdaftar
                </p>
                <p className="mt-1 text-xs text-[color:var(--color-muted)]">
                  UID belum terhubung
                </p>
              </div>
            ),
            <span key="nim" className="font-medium text-[color:var(--color-foreground)]">
              {scan.studentNim ?? "Belum Terdaftar"}
            </span>,
            <StatusBadge
              key="status"
              label={statusView.label}
              tone={statusView.tone}
            />,
            <div key="message" className="max-w-[320px]">
              <p className="text-sm leading-6 text-[color:var(--color-muted)]">
                {scan.message}
              </p>
            </div>,
            <button
              key="action"
              type="button"
              onClick={() => setSelectedScan(scan)}
              className="inline-flex items-center rounded-full border border-[color:var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[color:var(--color-foreground)] transition hover:bg-[color:var(--color-surface-muted)]"
            >
              Detail
            </button>,
          ],
        } satisfies DataTableRow;
      }),
    [scans],
  );

  const showPagination = pagination.totalItems > pagination.pageSize;

  return (
    <>
      <DataTable
        title="Riwayat Scan"
        description="Riwayat scan kartu RFID yang telah dikirim perangkat dan diproses oleh sistem."
        columns={[
          { key: "date", label: "Tanggal", className: "w-[148px]" },
          { key: "time", label: "Jam Scan", className: "w-[130px]" },
          { key: "uid", label: "UID Kartu", className: "w-[170px]" },
          { key: "student", label: "Mahasiswa", className: "w-[240px]" },
          { key: "nim", label: "NIM", className: "w-[150px]" },
          { key: "status", label: "Status", className: "w-[170px]" },
          { key: "message", label: "Pesan", className: "w-[320px]" },
          { key: "action", label: "Aksi", className: "w-[110px]" },
        ]}
        rows={rows}
        emptyMessage="Tidak ada riwayat scan yang cocok dengan filter saat ini."
        actions={
          showPagination ? (
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-[color:var(--color-muted)]">
                Halaman {pagination.page} dari {pagination.totalPages}
              </span>
              <Link
                href={buildAttendanceUrl(filters, {
                  page: Math.max(1, pagination.page - 1),
                })}
                aria-disabled={pagination.page <= 1}
                className={[
                  "inline-flex items-center justify-center rounded-full border border-[color:var(--color-border)] bg-white px-4 py-2 text-sm font-semibold text-[color:var(--color-foreground)] transition hover:bg-[color:var(--color-surface-muted)]",
                  pagination.page <= 1 ? "pointer-events-none opacity-50" : "",
                ].join(" ")}
              >
                Sebelumnya
              </Link>
              <Link
                href={buildAttendanceUrl(filters, {
                  page: Math.min(pagination.page + 1, pagination.totalPages),
                })}
                aria-disabled={pagination.page >= pagination.totalPages}
                className={[
                  "inline-flex items-center justify-center rounded-full border border-[color:var(--color-border)] bg-white px-4 py-2 text-sm font-semibold text-[color:var(--color-foreground)] transition hover:bg-[color:var(--color-surface-muted)]",
                  pagination.page >= pagination.totalPages
                    ? "pointer-events-none opacity-50"
                    : "",
                ].join(" ")}
              >
                Berikutnya
              </Link>
            </div>
          ) : null
        }
      />

      {scans.length === 0 ? (
        <div className="rounded-[1.5rem] border border-dashed border-[color:var(--color-border-strong)] bg-white px-5 py-4 text-sm text-[color:var(--color-muted)]">
          Sesuaikan rentang tanggal, kata kunci, atau status scan untuk menemukan data yang dicari.
        </div>
      ) : null}

      <AttendanceDetailModal
        scan={selectedScan}
        onClose={() => setSelectedScan(null)}
      />
    </>
  );
}
