import Link from "next/link";

import type { AttendanceFilters, AttendancePageData } from "@/lib/attendance";
import type { SummaryCard as SummaryCardType } from "@/types";

import { AttendanceHistoryTable } from "@/components/attendance/attendance-history-table";
import { DashboardIcon } from "@/components/dashboard/dashboard-icon";
import { SummaryCard } from "@/components/dashboard/summary-card";
import { EmptyState } from "@/components/ui/empty-state";

function createSummaryCards(summary: AttendancePageData["summary"]) {
  return [
    {
      label: "Total Scan Hari Ini",
      value: String(summary.totalScansToday),
      hint:
        summary.totalScansToday > 0
          ? "Seluruh aktivitas scan kartu yang tercatat sepanjang hari ini."
          : "Belum ada scan kartu yang masuk hari ini.",
      badge: summary.totalScansToday > 0 ? "Ada aktivitas" : "0 hari ini",
      tone: "primary" as const,
      icon: "attendance" as const,
    },
    {
      label: "Absensi Berhasil",
      value: String(summary.successfulScansToday),
      hint:
        summary.successfulScansToday > 0
          ? "Scan berhasil diproses dan dicatat sebagai kehadiran."
          : "Belum ada kehadiran yang berhasil dicatat hari ini.",
      badge: summary.successfulScansToday > 0 ? "Tercatat" : "Belum ada",
      tone: summary.successfulScansToday > 0 ? "success" : "neutral",
      icon: "dashboard" as const,
    },
    {
      label: "Scan Ditolak",
      value: String(summary.rejectedScansToday),
      hint:
        summary.rejectedScansToday > 0
          ? "Mencakup kartu belum terdaftar, duplikasi scan, dan penolakan sistem."
          : "Belum ada scan yang ditolak hari ini.",
      badge: summary.rejectedScansToday > 0 ? "Perlu ditinjau" : "Aman",
      tone: summary.rejectedScansToday > 0 ? "warning" : "neutral",
      icon: "bell" as const,
    },
  ] satisfies SummaryCardType[];
}

export function AttendanceOverview({
  filters,
  pageData,
}: {
  filters: AttendanceFilters;
  pageData: AttendancePageData;
}) {
  const summaryCards = createSummaryCards(pageData.summary);
  const exportAvailable = pageData.summary.hasAnyScanData;
  const exportParams = new URLSearchParams();
  if (filters.startDate) exportParams.set("startDate", filters.startDate);
  if (filters.endDate) exportParams.set("endDate", filters.endDate);
  if (filters.search) exportParams.set("search", filters.search);
  if (filters.status && filters.status !== "ALL") exportParams.set("status", filters.status);
  const exportUrl = `/api/admin/attendance/export?${exportParams.toString()}`;

  return (
    <section className="space-y-5">
      <section className="rounded-[1.5rem] border border-[rgba(17,40,75,0.08)] bg-white px-6 py-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--color-muted)]">
              Dashboard / Absensi
            </p>
            <h1 className="mt-3 text-[1.8rem] font-semibold tracking-tight text-[color:var(--color-foreground)]">
              Riwayat Absensi
            </h1>
            <p className="mt-3 text-sm leading-7 text-[color:var(--color-muted)]">
              Pantau aktivitas scan kartu RFID dan kehadiran mahasiswa.
            </p>
          </div>

          {exportAvailable ? (
            <a
              href={exportUrl}
              className="inline-flex items-center justify-center rounded-full bg-[color:var(--color-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--color-primary-strong)]"
            >
              Export CSV
            </a>
          ) : (
            <button
              type="button"
              disabled
              title="Endpoint export CSV belum tersedia."
              className="inline-flex cursor-not-allowed items-center justify-center rounded-full border border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] px-5 py-3 text-sm font-semibold text-[color:var(--color-muted)] opacity-80"
            >
              Export CSV
            </button>
          )}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        {summaryCards.map((card) => (
          <SummaryCard key={card.label} card={card} />
        ))}
      </div>

      {pageData.summary.hasAnyScanData ? (
        <>
          <section className="rounded-[1.75rem] bg-white px-6 py-5 shadow-[0_20px_45px_rgba(15,23,42,0.06)]">
            <form className="grid gap-4 xl:grid-cols-[180px_180px_minmax(0,1.4fr)_220px_auto_auto]">
              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted)]">
                  Tanggal Mulai
                </span>
                <input
                  type="date"
                  name="startDate"
                  defaultValue={filters.startDate ?? ""}
                  className="mt-2 w-full rounded-[1rem] border border-[color:var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[color:var(--color-primary)] focus:ring-3 focus:ring-[rgba(17,40,75,0.08)]"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted)]">
                  Tanggal Akhir
                </span>
                <input
                  type="date"
                  name="endDate"
                  defaultValue={filters.endDate ?? ""}
                  className="mt-2 w-full rounded-[1rem] border border-[color:var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[color:var(--color-primary)] focus:ring-3 focus:ring-[rgba(17,40,75,0.08)]"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted)]">
                  Cari Mahasiswa
                </span>
                <input
                  type="search"
                  name="search"
                  defaultValue={filters.search ?? ""}
                  placeholder="Cari nama, NIM, atau UID kartu..."
                  className="mt-2 w-full rounded-[1rem] border border-[color:var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[color:var(--color-primary)] focus:ring-3 focus:ring-[rgba(17,40,75,0.08)]"
                />
              </label>

              <label className="block">
                <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted)]">
                  Status Scan
                </span>
                <select
                  name="status"
                  defaultValue={filters.status}
                  className="mt-2 w-full rounded-[1rem] border border-[color:var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[color:var(--color-primary)] focus:ring-3 focus:ring-[rgba(17,40,75,0.08)]"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="SUCCESS">Berhasil</option>
                  <option value="REJECTED">Ditolak</option>
                  <option value="UNREGISTERED">Kartu Tidak Terdaftar</option>
                  <option value="DUPLICATE">Sudah Absen</option>
                </select>
              </label>

              <button
                type="submit"
                className="mt-auto inline-flex items-center justify-center rounded-full bg-[color:var(--color-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--color-primary-strong)]"
              >
                Terapkan Filter
              </button>

              <Link
                href="/dashboard/attendance"
                className="mt-auto inline-flex items-center justify-center rounded-full border border-[color:var(--color-border)] bg-white px-5 py-3 text-sm font-semibold text-[color:var(--color-foreground)] transition hover:bg-[color:var(--color-surface-muted)]"
              >
                Reset
              </Link>
            </form>
          </section>

          <AttendanceHistoryTable
            scans={pageData.scans}
            filters={{
              ...filters,
              page: pageData.pagination.page,
            }}
            pagination={pageData.pagination}
          />
        </>
      ) : (
        <EmptyState
          title="Belum Ada Riwayat Scan"
          description="Aktivitas scan kartu RFID akan muncul di halaman ini setelah perangkat NodeMCU berhasil mengirim data ke sistem."
          icon={<DashboardIcon name="attendance" className="h-7 w-7" />}
        />
      )}
    </section>
  );
}
