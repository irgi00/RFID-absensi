"use client";

import { useEffect, useState, type ReactNode } from "react";

import type {
  RfidRegistrationDevice,
  RfidRegistrationScan,
  RfidRegistrationScanResponse,
  RfidRegistrationStudent,
  RfidRegistrationStudentResponse,
} from "@/types/rfid-registration";

import { DashboardIcon } from "@/components/dashboard/dashboard-icon";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { StatusBadge } from "@/components/ui/status-badge";

type RfidCardRegistrationPageProps = {
  initialDevice: RfidRegistrationDevice | null;
};

type NoticeState =
  | {
      tone: "success" | "danger";
      message: string;
    }
  | null;

const scanTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

const deviceTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

async function requestJson<T>(input: RequestInfo, init?: RequestInit) {
  const response = await fetch(input, {
    cache: "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  let body: unknown = null;

  try {
    body = await response.json();
  } catch {
    body = null;
  }

  if (!response.ok) {
    const errorBody = (body ?? {}) as { message?: string };

    throw new Error(errorBody.message ?? "Permintaan tidak dapat diproses.");
  }

  return body as T;
}

function getInitials(fullName: string) {
  return fullName
    .split(" ")
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function getCardStatusBadge(cardStatus: RfidRegistrationStudent["cardStatus"]) {
  switch (cardStatus) {
    case "REGISTERED":
      return { label: "Terdaftar", tone: "success" as const };
    case "LOST":
      return { label: "Hilang", tone: "danger" as const };
    case "INACTIVE":
      return { label: "Nonaktif", tone: "neutral" as const };
    default:
      return { label: "Belum terdaftar", tone: "warning" as const };
  }
}

function getStudentStatusBadge(isActive: boolean) {
  return isActive
    ? { label: "Aktif", tone: "success" as const }
    : { label: "Nonaktif", tone: "neutral" as const };
}

function getDeviceMeta(device: RfidRegistrationDevice | null) {
  if (!device) {
    return {
      badge: null,
      helper: "Belum ada perangkat RFID yang dikonfigurasi untuk dipantau pada halaman ini.",
    };
  }

  const roomLabel = device.roomName
    ? `${device.roomName}${device.roomCode ? ` (${device.roomCode})` : ""}`
    : "Lokasi perangkat belum diatur";

  const helper = device.lastSeenAt
    ? `Terakhir terlihat ${deviceTimeFormatter.format(new Date(device.lastSeenAt))} di ${roomLabel}.`
    : `${roomLabel}. Belum ada aktivitas perangkat yang tercatat.`;

  return {
    badge: device.isActive
      ? `Perangkat Aktif: ${device.deviceCode}`
      : `Perangkat Terpilih: ${device.deviceCode}`,
    helper,
  };
}

function DetailItem({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-[1.15rem] border border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] px-4 py-3.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-700">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-[color:var(--color-foreground)]">
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-slate-700">{hint}</p> : null}
    </div>
  );
}

function InlineNotice({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "warning" | "danger" | "success";
}) {
  const toneClasses: Record<"neutral" | "warning" | "danger" | "success", string> = {
    neutral:
      "border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] text-slate-700",
    warning:
      "border-[rgba(217,119,6,0.16)] bg-[color:var(--color-warning-soft)] text-amber-700",
    danger:
      "border-[rgba(220,38,38,0.16)] bg-[color:var(--color-danger-soft)] text-red-700",
    success:
      "border-[rgba(5,150,105,0.16)] bg-[color:var(--color-success-soft)] text-emerald-700",
  };

  return (
    <div className={`rounded-[1.1rem] border px-4 py-3 text-sm leading-6 ${toneClasses[tone]}`}>
      {children}
    </div>
  );
}

function FloatingToast({ notice }: { notice: NoticeState }) {
  if (!notice) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-50 w-full max-w-sm">
      <div
        className={[
          "rounded-[1.35rem] border px-4 py-3 shadow-[0_22px_55px_rgba(15,23,42,0.16)] backdrop-blur",
          notice.tone === "success"
            ? "border-[rgba(5,150,105,0.16)] bg-white text-[color:var(--color-foreground)]"
            : "border-[rgba(220,38,38,0.16)] bg-white text-[color:var(--color-foreground)]",
        ].join(" ")}
      >
        <div className="flex items-start gap-3">
          <span
            className={[
              "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
              notice.tone === "success"
                ? "bg-[color:var(--color-success-soft)] text-emerald-700"
                : "bg-[color:var(--color-danger-soft)] text-red-700",
            ].join(" ")}
          >
            {notice.tone === "success" ? (
              <svg
                className="h-4.5 w-4.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m5 13 4 4L19 7" />
              </svg>
            ) : (
              <svg
                className="h-4.5 w-4.5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
                <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
              </svg>
            )}
          </span>
          <div>
            <p className="text-sm font-semibold">
              {notice.tone === "success" ? "Berhasil" : "Perlu perhatian"}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-700">
              {notice.message}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RfidCardRegistrationPage({
  initialDevice,
}: RfidCardRegistrationPageProps) {
  const [nim, setNim] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<RfidRegistrationStudent | null>(null);
  const [selectedDevice, setSelectedDevice] = useState<RfidRegistrationDevice | null>(
    initialDevice,
  );
  const [scanResult, setScanResult] = useState<RfidRegistrationScan | null>(null);
  const [searchError, setSearchError] = useState("");
  const [scanError, setScanError] = useState("");
  const [notice, setNotice] = useState<NoticeState>(null);
  const [scanSince, setScanSince] = useState(() => new Date().toISOString());
  const [isSearching, setIsSearching] = useState(false);
  const [isLinking, setIsLinking] = useState(false);
  const [isReplaceConfirmOpen, setIsReplaceConfirmOpen] = useState(false);

  const activeCardConflict =
    scanResult?.activeCardOwner && scanResult.activeCardOwner.studentId !== selectedStudent?.id
      ? scanResult.activeCardOwner
      : null;
  const canLinkCard = Boolean(selectedStudent && scanResult && !activeCardConflict && !isLinking);
  const deviceMeta = getDeviceMeta(selectedDevice);
  const studentCardBadge = selectedStudent
    ? getCardStatusBadge(selectedStudent.cardStatus)
    : null;
  const studentStatusBadge = selectedStudent
    ? getStudentStatusBadge(selectedStudent.isActive)
    : null;

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setNotice(null);
    }, 4200);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [notice]);

  useEffect(() => {
    if (!selectedStudent || scanResult) {
      return;
    }

    let cancelled = false;
    let timeoutId: number | undefined;

    const pollScanLog = async () => {
      const searchParams = new URLSearchParams();
      searchParams.set("since", scanSince);

      if (selectedDevice?.deviceCode) {
        searchParams.set("deviceCode", selectedDevice.deviceCode);
      }

      try {
        const response = await requestJson<RfidRegistrationScanResponse>(
          `/api/rfid-cards/registration/scan?${searchParams.toString()}`,
          { method: "GET" },
        );

        if (cancelled) {
          return;
        }

        if (response.device) {
          setSelectedDevice(response.device);
        }

        if (response.scan) {
          setScanResult(response.scan);
          setScanError("");
          return;
        }

        timeoutId = window.setTimeout(pollScanLog, 2200);
      } catch (error) {
        if (cancelled) {
          return;
        }

        setScanError(
          error instanceof Error
            ? error.message
            : "Panel scan belum dapat mengambil data UID terbaru.",
        );
        timeoutId = window.setTimeout(pollScanLog, 4000);
      }
    };

    void pollScanLog();

    return () => {
      cancelled = true;

      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [scanResult, scanSince, selectedDevice?.deviceCode, selectedStudent]);

  async function fetchStudentByNim(studentNim: string) {
    const searchParams = new URLSearchParams({ nim: studentNim.trim() });

    return requestJson<RfidRegistrationStudentResponse>(
      `/api/rfid-cards/registration/student?${searchParams.toString()}`,
      { method: "GET" },
    );
  }

  function resetScanSession() {
    setScanResult(null);
    setScanError("");
    setScanSince(new Date().toISOString());
  }

  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsSearching(true);
    setSearchError("");
    setNotice(null);

    try {
      const response = await fetchStudentByNim(nim);
      setSelectedStudent(response.student);
      resetScanSession();
    } catch (error) {
      setSelectedStudent(null);
      setScanResult(null);
      setSearchError(
        error instanceof Error ? error.message : "Mahasiswa tidak dapat ditemukan saat ini.",
      );
    } finally {
      setIsSearching(false);
    }
  }

  async function refreshSelectedStudent(studentNim: string) {
    const response = await fetchStudentByNim(studentNim);
    setSelectedStudent(response.student);
  }

  async function linkCard() {
    if (!selectedStudent || !scanResult || activeCardConflict) {
      return;
    }

    setIsLinking(true);
    setNotice(null);

    try {
      const response = await requestJson<{ message: string }>(
        `/api/students/${selectedStudent.id}/rfid-card`,
        {
          method: "POST",
          body: JSON.stringify({
            uid: scanResult.uid,
            cardLabel: "",
          }),
        },
      );

      await refreshSelectedStudent(selectedStudent.nim);
      resetScanSession();
      setNotice({
        tone: "success",
        message: response.message,
      });
      setIsReplaceConfirmOpen(false);
    } catch (error) {
      setNotice({
        tone: "danger",
        message:
          error instanceof Error
            ? error.message
            : "Kartu RFID belum dapat dihubungkan ke mahasiswa.",
      });
    } finally {
      setIsLinking(false);
    }
  }

  function handleLinkAction() {
    if (!selectedStudent || !scanResult || activeCardConflict) {
      return;
    }

    const shouldConfirmReplacement =
      selectedStudent.cardStatus === "REGISTERED" &&
      selectedStudent.cardUid &&
      selectedStudent.cardUid !== scanResult.uid;

    if (shouldConfirmReplacement) {
      setIsReplaceConfirmOpen(true);
      return;
    }

    void linkCard();
  }

  return (
    <>
      <FloatingToast notice={notice} />

      <section className="space-y-5">
        <div className="space-y-2 px-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-700">
            Dashboard / Kartu RFID
          </p>
          <h1 className="text-[1.55rem] font-semibold tracking-tight text-[color:var(--color-foreground)] sm:text-[1.8rem]">
            Daftarkan Kartu RFID
          </h1>
          <p className="max-w-2xl text-sm leading-7 text-slate-700">
            Hubungkan kartu RFID dengan data mahasiswa yang terdaftar.
          </p>
        </div>

        <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
          <section className="space-y-4">
            <article className="rounded-[1.75rem] border border-white/65 bg-white px-5 py-5 shadow-[0_20px_45px_rgba(15,23,42,0.06)] sm:px-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-[color:var(--color-foreground)]">
                    Informasi Mahasiswa
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-slate-700">
                    Cari mahasiswa berdasarkan NIM sebelum menghubungkan kartu.
                  </p>
                </div>
                <span className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-[color:var(--color-primary-soft)] text-[color:var(--color-primary)]">
                  <DashboardIcon name="students" className="h-5 w-5" />
                </span>
              </div>

              <form className="mt-5 space-y-4" onSubmit={handleSearch}>
                <label className="block">
                  <span className="text-sm font-semibold text-[color:var(--color-foreground)]">
                    Nomor Induk Mahasiswa (NIM)
                  </span>
                  <input
                    value={nim}
                    onChange={(event) => setNim(event.target.value)}
                    placeholder="Masukkan NIM mahasiswa"
                    className="mt-2 w-full rounded-[1rem] border border-[color:var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[color:var(--color-primary)] focus:ring-3 focus:ring-[rgba(17,40,75,0.08)]"
                  />
                </label>

                <button
                  type="submit"
                  disabled={isSearching || !nim.trim()}
                  className="inline-flex items-center justify-center rounded-full bg-[color:var(--color-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--color-primary-strong)] disabled:cursor-not-allowed disabled:bg-[color:var(--color-surface-muted)] disabled:text-slate-700 disabled:border disabled:border-[color:var(--color-border-strong)]"
                >
                  {isSearching ? "Mencari..." : "Cari"}
                </button>
              </form>

              {searchError ? (
                <div className="mt-4">
                  <InlineNotice tone="danger">{searchError}</InlineNotice>
                </div>
              ) : null}

              {selectedStudent ? (
                <div className="mt-5 space-y-4">
                  <div className="rounded-[1.35rem] border border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] p-4">
                    <div className="flex items-start gap-4">
                      <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[1.2rem] bg-[color:var(--color-primary)] text-base font-semibold text-white shadow-[0_14px_30px_rgba(17,40,75,0.18)]">
                        {getInitials(selectedStudent.fullName)}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-lg font-semibold text-[color:var(--color-foreground)]">
                          {selectedStudent.fullName}
                        </p>
                        <p className="mt-1 text-sm text-slate-700">
                          NIM {selectedStudent.nim}
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {studentStatusBadge ? <StatusBadge {...studentStatusBadge} /> : null}
                          {studentCardBadge ? <StatusBadge {...studentCardBadge} /> : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <DetailItem
                      label="Kelas"
                      value={selectedStudent.className}
                      hint={selectedStudent.classCode}
                    />
                    <DetailItem
                      label="Prodi"
                      value={selectedStudent.studyProgram?.trim() || "Belum diatur"}
                    />
                    {selectedStudent.departmentName ? (
                      <DetailItem
                        label="Jurusan"
                        value={selectedStudent.departmentName}
                      />
                    ) : null}
                    <DetailItem
                      label="Status Kartu RFID"
                      value={studentCardBadge?.label ?? "Belum terdaftar"}
                      hint={selectedStudent.cardUid ? `UID aktif: ${selectedStudent.cardUid}` : ""}
                    />
                  </div>

                  {selectedStudent.cardStatus === "REGISTERED" &&
                  selectedStudent.cardUid &&
                  selectedStudent.cardLabel ? (
                    <InlineNotice tone="warning">
                      Mahasiswa ini sudah memiliki kartu aktif dengan label{" "}
                      <span className="font-semibold">{selectedStudent.cardLabel}</span>.
                    </InlineNotice>
                  ) : null}
                </div>
              ) : (
                <div className="mt-5 rounded-[1.3rem] border border-dashed border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-muted)] px-4 py-5 text-sm leading-6 text-slate-700">
                  Cari mahasiswa terlebih dahulu untuk memulai pendaftaran kartu.
                </div>
              )}
            </article>

            <p className="px-1 text-sm leading-6 text-slate-700">
              Satu kartu RFID aktif hanya dapat terhubung dengan satu mahasiswa.
            </p>
          </section>

          <article className="rounded-[1.85rem] border border-white/70 bg-white p-5 shadow-[0_24px_60px_rgba(15,23,42,0.08)] sm:p-6">
            <div className="flex flex-col gap-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-[color:var(--color-foreground)]">
                    Panel Pemindaian Kartu
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-slate-700">
                    Area ini menunggu UID kartu RFID masuk dari perangkat pembaca.
                  </p>
                </div>
                {deviceMeta.badge ? (
                  <StatusBadge
                    label={deviceMeta.badge}
                    tone={selectedDevice?.isActive ? "success" : "neutral"}
                  />
                ) : null}
              </div>

              <div
                className={[
                  "relative overflow-hidden rounded-[1.75rem] border px-5 py-8 sm:px-8 sm:py-10",
                  scanResult
                    ? "border-[rgba(5,150,105,0.16)] bg-[linear-gradient(180deg,rgba(209,250,229,0.7),rgba(255,255,255,1))]"
                    : "border-[color:var(--color-border)] bg-[linear-gradient(180deg,rgba(232,238,249,0.55),rgba(255,255,255,1))]",
                ].join(" ")}
              >
                <div className="absolute inset-x-6 top-0 h-32 rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.12),transparent_72%)] blur-3xl" />
                <div className="relative flex min-h-[440px] flex-col items-center justify-center text-center">
                  {!selectedStudent ? (
                    <>
                      <div className="flex h-28 w-28 items-center justify-center rounded-full border border-dashed border-[color:var(--color-border-strong)] bg-white text-slate-700 shadow-[inset_0_0_0_12px_rgba(241,245,249,0.6)]">
                        <DashboardIcon name="rfid-card" className="h-10 w-10" />
                      </div>
                      <h3 className="mt-8 text-[1.55rem] font-semibold tracking-tight text-[color:var(--color-foreground)]">
                        Pilih Mahasiswa Terlebih Dahulu
                      </h3>
                      <p className="mt-3 max-w-md text-sm leading-7 text-slate-700">
                        Cari dan pilih mahasiswa sebelum memindai kartu RFID.
                      </p>
                      <button
                        type="button"
                        disabled
                        className="mt-8 inline-flex items-center justify-center rounded-full border border-[color:var(--color-border)] bg-white px-5 py-3 text-sm font-semibold text-slate-700 opacity-70"
                      >
                        Menunggu mahasiswa dipilih
                      </button>
                    </>
                  ) : scanResult ? (
                    <>
                      <div className="relative flex h-36 w-36 items-center justify-center">
                        <div className="absolute inset-0 rounded-full border border-[rgba(5,150,105,0.18)] bg-[rgba(255,255,255,0.74)]" />
                        <div className="absolute inset-3 rounded-full border border-[rgba(5,150,105,0.16)]" />
                        <div className="absolute inset-6 rounded-full bg-[color:var(--color-success-soft)]" />
                        <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-[color:var(--color-success)] text-white shadow-[0_14px_28px_rgba(5,150,105,0.25)]">
                          <svg
                            className="h-6 w-6"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="m5 13 4 4L19 7" />
                          </svg>
                        </span>
                      </div>

                      <h3 className="mt-8 text-[1.65rem] font-semibold tracking-tight text-[color:var(--color-foreground)]">
                        Kartu Berhasil Terbaca
                      </h3>
                      <p className="mt-4 rounded-full bg-white px-4 py-2 text-sm font-semibold text-[color:var(--color-primary)] shadow-[0_14px_28px_rgba(15,23,42,0.08)]">
                        UID Kartu: {scanResult.uid}
                      </p>
                      <p className="mt-3 text-sm leading-7 text-slate-700">
                        Terdeteksi pada {scanTimeFormatter.format(new Date(scanResult.scannedAt))}
                        {scanResult.deviceCode ? ` melalui ${scanResult.deviceCode}.` : "."}
                      </p>

                      {activeCardConflict ? (
                        <div className="mt-6 w-full max-w-xl">
                          <InlineNotice tone="danger">
                            UID ini sudah aktif pada {activeCardConflict.studentName} (
                            {activeCardConflict.studentNim}). Pilih kartu lain sebelum
                            menghubungkannya ke mahasiswa ini.
                          </InlineNotice>
                        </div>
                      ) : null}

                      {selectedStudent.cardStatus === "REGISTERED" &&
                      selectedStudent.cardUid &&
                      selectedStudent.cardUid !== scanResult.uid ? (
                        <div className="mt-6 w-full max-w-xl">
                          <InlineNotice tone="warning">
                            Mahasiswa ini sudah memiliki kartu aktif. Saat tombol Hubungkan
                            Kartu ditekan, sistem akan meminta konfirmasi penggantian kartu
                            lama terlebih dahulu.
                          </InlineNotice>
                        </div>
                      ) : null}

                      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                        <button
                          type="button"
                          onClick={resetScanSession}
                          disabled={isLinking}
                          className="inline-flex items-center justify-center rounded-full border border-[color:var(--color-border)] bg-white px-5 py-3 text-sm font-semibold text-[color:var(--color-foreground)] transition hover:bg-[color:var(--color-surface-muted)] disabled:cursor-not-allowed disabled:bg-[color:var(--color-surface-muted)] disabled:text-slate-700 disabled:border disabled:border-[color:var(--color-border-strong)]"
                        >
                          Batalkan
                        </button>
                        <button
                          type="button"
                          onClick={handleLinkAction}
                          disabled={!canLinkCard}
                          className="inline-flex items-center justify-center rounded-full bg-[color:var(--color-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--color-primary-strong)] disabled:cursor-not-allowed disabled:bg-[color:var(--color-surface-muted)] disabled:text-slate-700 disabled:border disabled:border-[color:var(--color-border-strong)]"
                        >
                          {isLinking ? "Menghubungkan..." : "Hubungkan Kartu"}
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="relative flex h-36 w-36 items-center justify-center">
                        <div className="absolute inset-0 rounded-full border border-[rgba(29,78,216,0.14)] bg-white/86" />
                        <div className="absolute inset-4 rounded-full border border-dashed border-[rgba(17,40,75,0.18)]" />
                        <div className="absolute inset-9 rounded-full bg-[color:var(--color-primary-soft)]" />
                        <span className="relative text-[color:var(--color-primary)]">
                          <DashboardIcon name="rfid-card" className="h-14 w-14" />
                        </span>
                      </div>

                      <h3 className="mt-8 text-[1.65rem] font-semibold tracking-tight text-[color:var(--color-foreground)]">
                        Menunggu kartu dipindai...
                      </h3>
                      <p className="mt-3 max-w-lg text-sm leading-7 text-slate-700">
                        Dekatkan kartu RFID ke perangkat pembaca untuk memulai proses
                        registrasi.
                      </p>
                      <p className="mt-4 max-w-xl text-sm leading-7 text-slate-700">
                        {deviceMeta.helper}
                      </p>

                      {scanError ? (
                        <div className="mt-6 w-full max-w-xl">
                          <InlineNotice tone="warning">{scanError}</InlineNotice>
                        </div>
                      ) : null}
                    </>
                  )}
                </div>
              </div>
            </div>
          </article>
        </div>
      </section>

      <ConfirmationModal
        open={isReplaceConfirmOpen}
        title="Ganti kartu RFID aktif?"
        description={
          selectedStudent && scanResult
            ? `Mahasiswa ${selectedStudent.fullName} saat ini memiliki kartu aktif ${selectedStudent.cardUid}. Melanjutkan proses akan menonaktifkan kartu lama lalu menghubungkan UID ${scanResult.uid}.`
            : "Melanjutkan proses akan mengganti kartu RFID aktif mahasiswa."
        }
        confirmLabel="Ya, ganti kartu"
        cancelLabel="Kembali"
        isLoading={isLinking}
        icon={<DashboardIcon name="rfid-card" className="h-6 w-6" />}
        onCancel={() => {
          if (!isLinking) {
            setIsReplaceConfirmOpen(false);
          }
        }}
        onConfirm={() => {
          void linkCard();
        }}
      />
    </>
  );
}
