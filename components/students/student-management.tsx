"use client";

import Link from "next/link";
import {
  useEffect,
  useId,
  useState,
  type ReactNode,
} from "react";

import type {
  StudentCardFilter,
  StudentClassOption,
  StudentFieldErrors,
  StudentListItem,
  StudentListResponse,
  StudentStatusFilter,
} from "@/types/students";

import { DashboardIcon } from "@/components/dashboard/dashboard-icon";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { DataTable, type DataTableRow } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";

type StudentManagementProps = {
  initialData: StudentListResponse;
  classOptions: StudentClassOption[];
};

type StudentFilters = {
  search: string;
  studentStatus: StudentStatusFilter;
  cardStatus: StudentCardFilter;
  page: number;
};

type NoticeState =
  | {
      tone: "success" | "danger";
      message: string;
    }
  | null;

type StudentFormState = {
  nim: string;
  fullName: string;
  classId: string;
  isActive: boolean;
};

type StudentCardFormState = {
  uid: string;
  cardLabel: string;
};

const formatNumber = new Intl.NumberFormat("id-ID");

const defaultFilters: StudentFilters = {
  search: "",
  studentStatus: "ALL",
  cardStatus: "ALL",
  page: 1,
};

function getCardBadgeProps(cardStatus: StudentListItem["cardStatus"]) {
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

function getStudentStatusBadgeProps(isActive: boolean) {
  return isActive
    ? { label: "Aktif", tone: "success" as const }
    : { label: "Nonaktif", tone: "neutral" as const };
}

function getStudyProgramLabel(student: Pick<StudentListItem, "studyProgram">) {
  return student.studyProgram?.trim() || "Belum diatur";
}

function createStudentFormState(student?: StudentListItem | null): StudentFormState {
  if (student) {
    return {
      nim: student.nim,
      fullName: student.fullName,
      classId: student.classId,
      isActive: student.isActive,
    };
  }

  return {
    nim: "",
    fullName: "",
    classId: "",
    isActive: true,
  };
}

function createCardFormState(student?: StudentListItem | null): StudentCardFormState {
  return {
    uid: student?.cardStatus === "REGISTERED" ? student.cardUid ?? "" : "",
    cardLabel: "",
  };
}

function buildStudentsUrl(filters: StudentFilters) {
  const searchParams = new URLSearchParams();

  if (filters.search) {
    searchParams.set("search", filters.search);
  }

  searchParams.set("studentStatus", filters.studentStatus);
  searchParams.set("cardStatus", filters.cardStatus);
  searchParams.set("page", String(filters.page));
  searchParams.set("pageSize", "10");

  return `/api/students?${searchParams.toString()}`;
}

async function requestJson<T>(input: RequestInfo, init?: RequestInit) {
  const response = await fetch(input, {
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
    const errorBody = (body ?? {}) as {
      message?: string;
      fieldErrors?: StudentFieldErrors;
    };

    throw {
      message: errorBody.message ?? "Terjadi kesalahan saat memproses permintaan.",
      fieldErrors: errorBody.fieldErrors ?? {},
    };
  }

  return body as T;
}

function ModalShell({
  open,
  title,
  description,
  children,
  onClose,
  footer,
}: {
  open: boolean;
  title: string;
  description?: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.52)] px-4 py-8 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        className="w-full max-w-3xl rounded-[2rem] border border-white/70 bg-white p-6 shadow-[0_28px_80px_rgba(15,23,42,0.18)]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-[1.55rem] font-semibold tracking-tight text-[color:var(--color-foreground)]">
              {title}
            </h2>
            {description ? (
              <p className="mt-2 text-sm leading-7 text-slate-700">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--color-border)] bg-white text-slate-700 transition hover:bg-[color:var(--color-surface-muted)]"
            aria-label="Tutup modal"
          >
            x
          </button>
        </div>

        <div className="mt-6">{children}</div>

        {footer ? (
          <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[color:var(--color-border)] pt-5 sm:flex-row sm:items-center sm:justify-end">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function StudentSummaryCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: number;
  hint: string;
  tone: "primary" | "success" | "neutral" | "warning";
}) {
  const toneClasses: Record<
    "primary" | "success" | "neutral" | "warning",
    { panel: string; accent: string }
  > = {
    primary: {
      panel: "border-[rgba(17,40,75,0.08)] bg-white",
      accent: "bg-[color:var(--color-primary)]",
    },
    success: {
      panel: "border-[rgba(5,150,105,0.12)] bg-white",
      accent: "bg-[color:var(--color-success)]",
    },
    neutral: {
      panel: "border-[rgba(100,116,139,0.12)] bg-white",
      accent: "bg-[color:var(--color-muted)]",
    },
    warning: {
      panel: "border-[rgba(217,119,6,0.12)] bg-white",
      accent: "bg-[color:var(--color-warning)]",
    },
  };

  return (
    <article
      className={`rounded-[1.5rem] border p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)] ${toneClasses[tone].panel}`}
    >
      <div className="flex items-center gap-3">
        <span className={`h-3 w-3 rounded-full ${toneClasses[tone].accent}`} />
        <p className="text-sm font-medium text-slate-700">{label}</p>
      </div>
      <p className="mt-4 text-[2rem] font-semibold tracking-tight text-[color:var(--color-foreground)]">
        {formatNumber.format(value)}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-700">{hint}</p>
    </article>
  );
}

function FormHint({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "warning" | "danger";
}) {
  const toneClasses: Record<"neutral" | "warning" | "danger", string> = {
    neutral:
      "border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] text-slate-700",
    warning:
      "border-[rgba(217,119,6,0.18)] bg-[color:var(--color-warning-soft)] text-amber-700",
    danger:
      "border-[rgba(220,38,38,0.18)] bg-[color:var(--color-danger-soft)] text-red-700",
  };

  return (
    <div className={`rounded-[1.25rem] border px-4 py-3 text-sm ${toneClasses[tone]}`}>
      {children}
    </div>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="mt-2 text-sm text-red-700">{message}</p>;
}
function StudentFormModal({
  open,
  mode,
  student,
  classOptions,
  onClose,
  onSuccess,
}: {
  open: boolean;
  mode: "create" | "edit";
  student?: StudentListItem | null;
  classOptions: StudentClassOption[];
  onClose: () => void;
  onSuccess: (message: string) => Promise<void>;
}) {
  const [formState, setFormState] = useState<StudentFormState>(() =>
    createStudentFormState(student),
  );
  const [fieldErrors, setFieldErrors] = useState<StudentFieldErrors>({});
  const [formError, setFormError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const classFieldId = useId();


  const selectedClass =
    classOptions.find((item) => item.id === formState.classId) ?? null;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setFieldErrors({});
    setFormError("");

    if (!formState.classId) {
      setFieldErrors({
        classId: "Pilih kelas terlebih dahulu.",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await requestJson<{ message: string }>(
        mode === "create" ? "/api/students" : `/api/students/${student?.id ?? ""}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          body: JSON.stringify(formState),
        },
      );

      await onSuccess(response.message);
      onClose();
    } catch (error) {
      const typedError = error as { message?: string; fieldErrors?: StudentFieldErrors };
      setFormError(typedError.message ?? "Mahasiswa gagal disimpan.");
      setFieldErrors(typedError.fieldErrors ?? {});
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={mode === "create" ? "Tambah Mahasiswa" : "Edit Mahasiswa"}
      description={
        mode === "create"
          ? "Masukkan identitas mahasiswa sesuai data akademik yang tersedia."
          : "Perbarui data mahasiswa tanpa mengubah struktur database yang ada."
      }
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-full border border-[color:var(--color-border)] bg-white px-5 py-3 text-sm font-semibold text-[color:var(--color-foreground)] transition hover:bg-[color:var(--color-surface-muted)]"
          >
            Batal
          </button>
          <button
            type="submit"
            form="student-form"
            disabled={isSubmitting || classOptions.length === 0}
            className="inline-flex items-center justify-center rounded-full bg-[color:var(--color-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--color-primary-strong)] disabled:cursor-not-allowed disabled:bg-[color:var(--color-surface-muted)] disabled:text-slate-700 disabled:border disabled:border-[color:var(--color-border-strong)]"
          >
            {isSubmitting ? "Menyimpan..." : mode === "create" ? "Simpan Mahasiswa" : "Simpan Perubahan"}
          </button>
        </>
      }
    >
      <form id="student-form" className="space-y-5" onSubmit={handleSubmit}>
        {classOptions.length === 0 ? (
          <FormHint tone="warning">
            Data kelas belum tersedia. Tambahkan atau seed kelas terlebih dahulu, lalu
            coba simpan mahasiswa lagi.
          </FormHint>
        ) : null}

        {formError ? <FormHint tone="danger">{formError}</FormHint> : null}

        <div className="grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="text-sm font-semibold text-[color:var(--color-foreground)]">
              NIM
            </span>
            <input
              value={formState.nim}
              onChange={(event) =>
                setFormState((current) => ({ ...current, nim: event.target.value }))
              }
              placeholder="Masukkan NIM"
              className="mt-2 w-full rounded-[1rem] border border-[color:var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[color:var(--color-primary)] focus:ring-3 focus:ring-[rgba(17,40,75,0.08)]"
            />
            <FieldError message={fieldErrors.nim} />
          </label>

          <label className="block">
            <span className="text-sm font-semibold text-[color:var(--color-foreground)]">
              Nama mahasiswa
            </span>
            <input
              value={formState.fullName}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  fullName: event.target.value,
                }))
              }
              placeholder="Masukkan nama mahasiswa"
              className="mt-2 w-full rounded-[1rem] border border-[color:var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[color:var(--color-primary)] focus:ring-3 focus:ring-[rgba(17,40,75,0.08)]"
            />
            <FieldError message={fieldErrors.fullName} />
          </label>
        </div>

        <div className="grid gap-5 md:grid-cols-2">
          <label className="block" htmlFor={classFieldId}>
            <span className="text-sm font-semibold text-[color:var(--color-foreground)]">
              Kelas
            </span>
            <select
              id={classFieldId}
              value={formState.classId}
              onChange={(event) =>
                setFormState((current) => ({
                  ...current,
                  classId: event.target.value,
                }))
              }
              disabled={classOptions.length === 0}
              required
              className="mt-2 w-full rounded-[1rem] border border-[color:var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[color:var(--color-primary)] focus:ring-3 focus:ring-[rgba(17,40,75,0.08)] disabled:cursor-not-allowed disabled:bg-[color:var(--color-surface-muted)]"
            >
              <option value="" disabled>
                {classOptions.length === 0 ? "Belum ada kelas tersedia" : "Pilih kelas"}
              </option>
              {classOptions.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({item.code}){item.isActive ? "" : " - Nonaktif"}
                </option>
              ))}
            </select>
            <FieldError message={fieldErrors.classId} />
          </label>

          <div className="block">
            <span className="text-sm font-semibold text-[color:var(--color-foreground)]">
              Prodi / Jurusan
            </span>
            <div className="mt-2 rounded-[1rem] border border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] px-4 py-3 text-sm text-slate-700">
              {selectedClass?.studyProgram?.trim() || "Mengikuti data kelas yang dipilih."}
            </div>
          </div>
        </div>

        <label className="block">
          <span className="text-sm font-semibold text-[color:var(--color-foreground)]">
            Status mahasiswa
          </span>
          <select
            value={String(formState.isActive)}
            onChange={(event) =>
              setFormState((current) => ({
                ...current,
                isActive: event.target.value === "true",
              }))
            }
            className="mt-2 w-full rounded-[1rem] border border-[color:var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[color:var(--color-primary)] focus:ring-3 focus:ring-[rgba(17,40,75,0.08)]"
          >
            <option value="true">Aktif</option>
            <option value="false">Nonaktif</option>
          </select>
        </label>
      </form>
    </ModalShell>
  );
}

function StudentCardModal({
  open,
  student,
  onClose,
  onSuccess,
}: {
  open: boolean;
  student?: StudentListItem | null;
  onClose: () => void;
  onSuccess: (message: string) => Promise<void>;
}) {
  const [formState, setFormState] = useState<StudentCardFormState>(() =>
    createCardFormState(student),
  );
  const [fieldErrors, setFieldErrors] = useState<StudentFieldErrors>({});
  const [formError, setFormError] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);


  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!student) {
      return;
    }

    setIsSubmitting(true);
    setFieldErrors({});
    setFormError("");

    try {
      const response = await requestJson<{ message: string }>(
        `/api/students/${student.id}/rfid-card`,
        {
          method: "POST",
          body: JSON.stringify(formState),
        },
      );

      await onSuccess(response.message);
      onClose();
    } catch (error) {
      const typedError = error as { message?: string; fieldErrors?: StudentFieldErrors };
      setFormError(typedError.message ?? "Kartu RFID gagal disimpan.");
      setFieldErrors(typedError.fieldErrors ?? {});
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={student?.cardStatus === "REGISTERED" ? "Ganti Kartu RFID" : "Daftarkan Kartu RFID"}
      description="Gunakan UID kartu aktif yang benar agar data mahasiswa terhubung dengan proses absensi."
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-full border border-[color:var(--color-border)] bg-white px-5 py-3 text-sm font-semibold text-[color:var(--color-foreground)] transition hover:bg-[color:var(--color-surface-muted)]"
          >
            Batal
          </button>
          <button
            type="submit"
            form="student-card-form"
            disabled={isSubmitting || !student}
            className="inline-flex items-center justify-center rounded-full bg-[color:var(--color-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--color-primary-strong)] disabled:cursor-not-allowed disabled:bg-[color:var(--color-surface-muted)] disabled:text-slate-700 disabled:border disabled:border-[color:var(--color-border-strong)]"
          >
            {isSubmitting
              ? "Menyimpan..."
              : student?.cardStatus === "REGISTERED"
                ? "Simpan Penggantian"
                : "Simpan Kartu RFID"}
          </button>
        </>
      }
    >
      {!student ? null : (
        <form id="student-card-form" className="space-y-5" onSubmit={handleSubmit}>
          <div className="grid gap-4 rounded-[1.5rem] bg-[color:var(--color-surface-muted)] p-5 md:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
                Mahasiswa
              </p>
              <p className="mt-2 text-sm font-semibold text-[color:var(--color-foreground)]">
                {student.fullName}
              </p>
              <p className="mt-1 text-sm text-slate-700">{student.nim}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
                Status kartu saat ini
              </p>
              <div className="mt-2">
                <StatusBadge {...getCardBadgeProps(student.cardStatus)} />
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
                UID aktif
              </p>
              <p className="mt-2 text-sm font-semibold text-[color:var(--color-foreground)]">
                {student.cardUid ?? "-"}
              </p>
            </div>
          </div>

          {student.cardStatus === "REGISTERED" ? (
            <FormHint tone="warning">
              Menyimpan UID baru akan menonaktifkan kartu aktif sebelumnya secara otomatis.
            </FormHint>
          ) : null}

          {formError ? <FormHint tone="danger">{formError}</FormHint> : null}

          <div className="grid gap-5 md:grid-cols-2">
            <label className="block">
              <span className="text-sm font-semibold text-[color:var(--color-foreground)]">
                UID kartu RFID
              </span>
              <input
                value={formState.uid}
                onChange={(event) =>
                  setFormState((current) => ({ ...current, uid: event.target.value }))
                }
                placeholder="Contoh: 04A1BC23D9"
                className="mt-2 w-full rounded-[1rem] border border-[color:var(--color-border)] bg-white px-4 py-3 text-sm uppercase outline-none transition focus:border-[color:var(--color-primary)] focus:ring-3 focus:ring-[rgba(17,40,75,0.08)]"
              />
              <FieldError message={fieldErrors.uid} />
            </label>

            <label className="block">
              <span className="text-sm font-semibold text-[color:var(--color-foreground)]">
                Label kartu
              </span>
              <input
                value={formState.cardLabel}
                onChange={(event) =>
                  setFormState((current) => ({
                    ...current,
                    cardLabel: event.target.value,
                  }))
                }
                placeholder="Opsional, misalnya Kartu Utama"
                className="mt-2 w-full rounded-[1rem] border border-[color:var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[color:var(--color-primary)] focus:ring-3 focus:ring-[rgba(17,40,75,0.08)]"
              />
              <FieldError message={fieldErrors.cardLabel} />
            </label>
          </div>
        </form>
      )}
    </ModalShell>
  );
}
function StudentDetailModal({
  open,
  student,
  onClose,
  onEdit,
  onManageCard,
}: {
  open: boolean;
  student?: StudentListItem | null;
  onClose: () => void;
  onEdit: () => void;
  onManageCard: () => void;
}) {
  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title="Detail Mahasiswa"
      description="Ringkasan identitas mahasiswa dan status kartu RFID aktif."
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-full border border-[color:var(--color-border)] bg-white px-5 py-3 text-sm font-semibold text-[color:var(--color-foreground)] transition hover:bg-[color:var(--color-surface-muted)]"
          >
            Tutup
          </button>
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center justify-center rounded-full border border-[color:var(--color-border)] bg-white px-5 py-3 text-sm font-semibold text-[color:var(--color-foreground)] transition hover:bg-[color:var(--color-surface-muted)]"
          >
            Edit mahasiswa
          </button>
          <button
            type="button"
            onClick={onManageCard}
            className="inline-flex items-center justify-center rounded-full bg-[color:var(--color-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--color-primary-strong)]"
          >
            {student?.cardStatus === "REGISTERED" ? "Ganti Kartu RFID" : "Daftarkan Kartu RFID"}
          </button>
        </>
      }
    >
      {!student ? null : (
        <div className="space-y-5">
          <div className="grid gap-4 rounded-[1.5rem] bg-[color:var(--color-surface-muted)] p-5 md:grid-cols-2">
            <DetailItem label="Nama mahasiswa" value={student.fullName} />
            <DetailItem label="NIM" value={student.nim} />
            <DetailItem
              label="Kelas"
              value={`${student.className} (${student.classCode})`}
            />
            <DetailItem label="Prodi / Jurusan" value={getStudyProgramLabel(student)} />
            <DetailItem
              label="Status mahasiswa"
              valueNode={<StatusBadge {...getStudentStatusBadgeProps(student.isActive)} />}
            />
            <DetailItem
              label="Status kartu RFID"
              valueNode={<StatusBadge {...getCardBadgeProps(student.cardStatus)} />}
            />
            <DetailItem label="UID kartu RFID aktif" value={student.cardUid ?? "-"} />
            <DetailItem
              label="Akses absensi"
              valueNode={
                <Link
                  href="/dashboard/attendance"
                  className="inline-flex items-center rounded-full border border-[color:var(--color-border)] px-3 py-1.5 text-sm font-semibold text-[color:var(--color-foreground)] transition hover:bg-white"
                >
                  Buka halaman Absensi
                </Link>
              }
            />
          </div>

          {!student.classIsActive ? (
            <FormHint tone="warning">
              Mahasiswa ini terhubung ke kelas yang saat ini berstatus nonaktif.
            </FormHint>
          ) : null}
        </div>
      )}
    </ModalShell>
  );
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
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
        {label}
      </p>
      {valueNode ? (
        <div className="mt-2">{valueNode}</div>
      ) : (
        <p className="mt-2 text-sm font-semibold text-[color:var(--color-foreground)]">
          {value}
        </p>
      )}
    </div>
  );
}

export function StudentManagement({
  initialData,
  classOptions,
}: StudentManagementProps) {
  const [tableData, setTableData] = useState(initialData);
  const [filters, setFilters] = useState<StudentFilters>(defaultFilters);
  const [draftFilters, setDraftFilters] = useState<StudentFilters>(defaultFilters);
  const [isLoadingTable, setIsLoadingTable] = useState(false);
  const [notice, setNotice] = useState<NoticeState>(null);
  const [selectedStudent, setSelectedStudent] = useState<StudentListItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const hasClassData = classOptions.length > 0;

  async function loadStudents(nextFilters: StudentFilters) {
    setIsLoadingTable(true);

    try {
      const data = await requestJson<StudentListResponse>(buildStudentsUrl(nextFilters), {
        method: "GET",
      });

      setTableData(data);
      setFilters(nextFilters);
    } catch (error) {
      const typedError = error as { message?: string };
      setNotice({
        tone: "danger",
        message: typedError.message ?? "Data mahasiswa gagal dimuat.",
      });
    } finally {
      setIsLoadingTable(false);
    }
  }

  async function handleRefreshAfterMutation(message: string) {
    setNotice({ tone: "success", message });

    const nextPage =
      tableData.pagination.totalItems <= 1 && filters.page > 1
        ? filters.page - 1
        : filters.page;

    await loadStudents({
      ...filters,
      page: Math.max(1, nextPage),
    });
  }

  async function handleDeactivateStudent() {
    if (!selectedStudent) {
      return;
    }

    setNotice(null);

    try {
      const response = await requestJson<{ message: string }>(
        `/api/students/${selectedStudent.id}/deactivate`,
        {
          method: "POST",
          body: JSON.stringify({}),
        },
      );

      setIsDeactivateModalOpen(false);
      await handleRefreshAfterMutation(response.message);
    } catch (error) {
      const typedError = error as { message?: string };
      setNotice({
        tone: "danger",
        message: typedError.message ?? "Mahasiswa gagal dinonaktifkan.",
      });
    }
  }

  function openCreateModal() {
    setSelectedStudent(null);
    setIsCreateModalOpen(true);
  }

  function openEditModal(student: StudentListItem) {
    setSelectedStudent(student);
    setIsEditModalOpen(true);
  }

  function openDetailModal(student: StudentListItem) {
    setSelectedStudent(student);
    setIsDetailModalOpen(true);
  }

  function openCardModal(student: StudentListItem) {
    setSelectedStudent(student);
    setIsCardModalOpen(true);
  }

  function openDeactivateModal(student: StudentListItem) {
    setSelectedStudent(student);
    setIsDeactivateModalOpen(true);
  }

  const summaryCards = [
    {
      label: "Total Mahasiswa",
      value: tableData.summary.totalStudents,
      hint: "Seluruh mahasiswa yang tercatat di sistem.",
      tone: "primary" as const,
    },
    {
      label: "Mahasiswa Aktif",
      value: tableData.summary.activeStudents,
      hint: "Mahasiswa yang masih aktif dipakai pada proses absensi.",
      tone: "success" as const,
    },
    {
      label: "Mahasiswa Nonaktif",
      value: tableData.summary.inactiveStudents,
      hint: "Mahasiswa yang statusnya sudah dinonaktifkan.",
      tone: "neutral" as const,
    },
    {
      label: "Belum Memiliki Kartu RFID",
      value: tableData.summary.studentsWithoutActiveCard,
      hint: "Mahasiswa yang belum punya kartu RFID aktif.",
      tone: "warning" as const,
    },
  ];

  const rows: DataTableRow[] = tableData.students.map((student, index) => {
    const cardBadge = getCardBadgeProps(student.cardStatus);
    const studentStatusBadge = getStudentStatusBadgeProps(student.isActive);
    const rowNumber =
      (tableData.pagination.page - 1) * tableData.pagination.pageSize + index + 1;

    return {
      key: student.id,
      cells: [
        <span key="number" className="font-semibold text-[color:var(--color-foreground)]">
          {rowNumber}
        </span>,
        <div key="nim">
          <p className="font-semibold text-[color:var(--color-foreground)]">{student.nim}</p>
        </div>,
        <div key="name">
          <p className="font-semibold text-[color:var(--color-foreground)]">
            {student.fullName}
          </p>
        </div>,
        <div key="class">
          <p className="font-semibold text-[color:var(--color-foreground)]">
            {student.className}
          </p>
          <p className="mt-1 text-xs text-slate-700">{student.classCode}</p>
        </div>,
        <div key="studyProgram">
          <p className="text-sm text-[color:var(--color-foreground)]">
            {getStudyProgramLabel(student)}
          </p>
        </div>,
        <div key="card">
          <StatusBadge label={cardBadge.label} tone={cardBadge.tone} />
          <p className="mt-2 text-xs text-slate-700">
            UID: {student.cardUid ?? "-"}
          </p>
        </div>,
        <StatusBadge
          key="status"
          label={studentStatusBadge.label}
          tone={studentStatusBadge.tone}
        />,
        <div key="actions" className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => openDetailModal(student)}
            className="inline-flex items-center rounded-full border border-[color:var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[color:var(--color-foreground)] transition hover:bg-[color:var(--color-surface-muted)]"
          >
            Detail
          </button>
          <button
            type="button"
            onClick={() => openEditModal(student)}
            className="inline-flex items-center rounded-full border border-[color:var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[color:var(--color-foreground)] transition hover:bg-[color:var(--color-surface-muted)]"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => openCardModal(student)}
            className="inline-flex items-center rounded-full border border-[rgba(17,40,75,0.12)] bg-[color:var(--color-primary-soft)] px-3 py-1.5 text-xs font-semibold text-[color:var(--color-primary)] transition hover:bg-[rgba(232,238,249,0.7)]"
          >
            {student.cardStatus === "REGISTERED" ? "Ganti Kartu" : "Daftarkan Kartu"}
          </button>
          <button
            type="button"
            onClick={() => openDeactivateModal(student)}
            disabled={!student.isActive}
            className="inline-flex items-center rounded-full border border-[rgba(220,38,38,0.12)] bg-[color:var(--color-danger-soft)] px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-[rgba(254,226,226,0.78)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            Nonaktifkan
          </button>
        </div>,
      ],
    } satisfies DataTableRow;
  });
  return (
    <section className="space-y-5">
      <section className="rounded-[1.75rem] bg-white px-6 py-5 shadow-[0_20px_45px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-[1.55rem] font-semibold tracking-tight text-[color:var(--color-foreground)]">
              Data Mahasiswa
            </h1>
            <p className="mt-2 text-sm leading-7 text-slate-700">
              Kelola identitas mahasiswa dan status kartu RFID.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            disabled={!hasClassData}
            className="inline-flex items-center justify-center rounded-full bg-[color:var(--color-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--color-primary-strong)] disabled:cursor-not-allowed disabled:bg-[color:var(--color-surface-muted)] disabled:text-slate-700 disabled:border disabled:border-[color:var(--color-border-strong)]"
          >
            + Tambah Mahasiswa
          </button>
        </div>
      </section>

      {notice ? (
        <FormHint tone={notice.tone === "success" ? "neutral" : "danger"}>
          {notice.message}
        </FormHint>
      ) : null}

      {!hasClassData ? (
        <FormHint tone="warning">
          Data kelas belum tersedia. Jalankan seed kelas terlebih dahulu agar
          mahasiswa pertama bisa ditambahkan.
        </FormHint>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <StudentSummaryCard
            key={card.label}
            label={card.label}
            value={card.value}
            hint={card.hint}
            tone={card.tone}
          />
        ))}
      </div>

      <section className="rounded-[1.75rem] bg-white px-6 py-5 shadow-[0_20px_45px_rgba(15,23,42,0.06)]">
        <form
          className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_220px_220px_auto_auto]"
          onSubmit={async (event) => {
            event.preventDefault();
            setNotice(null);
            await loadStudents({
              ...draftFilters,
              page: 1,
            });
          }}
        >
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
              Cari mahasiswa
            </span>
            <input
              value={draftFilters.search}
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  search: event.target.value,
                }))
              }
              placeholder="Cari nama atau NIM..."
              className="mt-2 w-full rounded-[1rem] border border-[color:var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[color:var(--color-primary)] focus:ring-3 focus:ring-[rgba(17,40,75,0.08)]"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
              Status mahasiswa
            </span>
            <select
              value={draftFilters.studentStatus}
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  studentStatus: event.target.value as StudentStatusFilter,
                }))
              }
              className="mt-2 w-full rounded-[1rem] border border-[color:var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[color:var(--color-primary)] focus:ring-3 focus:ring-[rgba(17,40,75,0.08)]"
            >
              <option value="ALL">Semua</option>
              <option value="ACTIVE">Aktif</option>
              <option value="INACTIVE">Nonaktif</option>
            </select>
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
              Status kartu RFID
            </span>
            <select
              value={draftFilters.cardStatus}
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  cardStatus: event.target.value as StudentCardFilter,
                }))
              }
              className="mt-2 w-full rounded-[1rem] border border-[color:var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[color:var(--color-primary)] focus:ring-3 focus:ring-[rgba(17,40,75,0.08)]"
            >
              <option value="ALL">Semua</option>
              <option value="REGISTERED">Sudah Terdaftar</option>
              <option value="UNREGISTERED">Belum Terdaftar</option>
            </select>
          </label>

          <button
            type="submit"
            disabled={isLoadingTable}
            className="mt-auto inline-flex items-center justify-center rounded-full bg-[color:var(--color-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--color-primary-strong)] disabled:cursor-not-allowed disabled:bg-[color:var(--color-surface-muted)] disabled:text-slate-700 disabled:border disabled:border-[color:var(--color-border-strong)]"
          >
            {isLoadingTable ? "Memuat..." : "Terapkan Filter"}
          </button>

          <button
            type="button"
            onClick={async () => {
              setDraftFilters(defaultFilters);
              setNotice(null);
              await loadStudents(defaultFilters);
            }}
            className="mt-auto inline-flex items-center justify-center rounded-full border border-[color:var(--color-border)] bg-white px-5 py-3 text-sm font-semibold text-[color:var(--color-foreground)] transition hover:bg-[color:var(--color-surface-muted)]"
          >
            Reset
          </button>
        </form>
      </section>

      {tableData.summary.totalStudents === 0 ? (
        <EmptyState
          title="Belum ada data mahasiswa"
          description={
            hasClassData
              ? "Tambahkan mahasiswa pertama untuk mulai mengelola identitas dan status kartu RFID."
              : "Tambahkan data kelas terlebih dahulu agar mahasiswa pertama bisa disimpan."
          }
          icon={<DashboardIcon name="students" className="h-7 w-7" />}
          action={hasClassData ? (
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center justify-center rounded-full bg-[color:var(--color-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--color-primary-strong)]"
            >
              + Tambah Mahasiswa
            </button>
          ) : null}
        />
      ) : (
        <DataTable
          title="Daftar Mahasiswa"
          description="Data mahasiswa dan status kartu RFID terbaru."
          columns={[
            { key: "number", label: "No", className: "w-[72px]" },
            { key: "nim", label: "NIM", className: "w-[150px]" },
            { key: "name", label: "Nama Mahasiswa", className: "w-[220px]" },
            { key: "class", label: "Kelas", className: "w-[180px]" },
            { key: "studyProgram", label: "Prodi / Jurusan", className: "w-[220px]" },
            { key: "card", label: "Kartu RFID", className: "w-[180px]" },
            { key: "status", label: "Status", className: "w-[120px]" },
            { key: "actions", label: "Aksi", className: "w-[280px]" },
          ]}
          rows={rows}
          emptyMessage="Tidak ada mahasiswa yang cocok dengan filter saat ini."
          actions={
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-700">
                Halaman {tableData.pagination.page} dari {tableData.pagination.totalPages}
              </span>
              <button
                type="button"
                onClick={() =>
                  loadStudents({
                    ...filters,
                    page: Math.max(1, filters.page - 1),
                  })
                }
                disabled={filters.page <= 1 || isLoadingTable}
                className="inline-flex items-center justify-center rounded-full border border-[color:var(--color-border)] bg-white px-4 py-2 text-sm font-semibold text-[color:var(--color-foreground)] transition hover:bg-[color:var(--color-surface-muted)] disabled:cursor-not-allowed disabled:bg-[color:var(--color-surface-muted)] disabled:text-slate-700 disabled:border disabled:border-[color:var(--color-border-strong)]"
              >
                Sebelumnya
              </button>
              <button
                type="button"
                onClick={() =>
                  loadStudents({
                    ...filters,
                    page: Math.min(filters.page + 1, tableData.pagination.totalPages),
                  })
                }
                disabled={
                  filters.page >= tableData.pagination.totalPages || isLoadingTable
                }
                className="inline-flex items-center justify-center rounded-full border border-[color:var(--color-border)] bg-white px-4 py-2 text-sm font-semibold text-[color:var(--color-foreground)] transition hover:bg-[color:var(--color-surface-muted)] disabled:cursor-not-allowed disabled:bg-[color:var(--color-surface-muted)] disabled:text-slate-700 disabled:border disabled:border-[color:var(--color-border-strong)]"
              >
                Berikutnya
              </button>
            </div>
          }
        />
      )}

      {isCreateModalOpen ? (
        <StudentFormModal
          open={isCreateModalOpen}
          mode="create"
          classOptions={classOptions}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handleRefreshAfterMutation}
        />
      ) : null}

      {isEditModalOpen ? (
        <StudentFormModal
          open={isEditModalOpen}
          mode="edit"
          student={selectedStudent}
          classOptions={classOptions}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={handleRefreshAfterMutation}
        />
      ) : null}

      <StudentDetailModal
        open={isDetailModalOpen}
        student={selectedStudent}
        onClose={() => setIsDetailModalOpen(false)}
        onEdit={() => {
          setIsDetailModalOpen(false);

          if (selectedStudent) {
            openEditModal(selectedStudent);
          }
        }}
        onManageCard={() => {
          setIsDetailModalOpen(false);

          if (selectedStudent) {
            openCardModal(selectedStudent);
          }
        }}
      />

      <StudentCardModal
        open={isCardModalOpen}
        student={selectedStudent}
        onClose={() => setIsCardModalOpen(false)}
        onSuccess={handleRefreshAfterMutation}
      />

      <ConfirmationModal
        open={isDeactivateModalOpen}
        title="Nonaktifkan Mahasiswa"
        description={
          selectedStudent
            ? `Mahasiswa ${selectedStudent.fullName} akan ditandai nonaktif. Data absensi dan kartu RFID tetap disimpan.`
            : "Mahasiswa akan ditandai nonaktif."
        }
        confirmLabel="Nonaktifkan"
        tone="danger"
        onCancel={() => setIsDeactivateModalOpen(false)}
        onConfirm={handleDeactivateStudent}
      />
    </section>
  );
}
