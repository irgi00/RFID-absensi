"use client";

import { useEffect, useId, useState, type ReactNode } from "react";

import { DashboardIcon } from "@/components/dashboard/dashboard-icon";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { DataTable, type DataTableRow } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { FloatingToast, type FloatingToastNotice } from "@/components/ui/floating-toast";
import { PageTitle } from "@/components/ui/page-title";
import { StatusBadge } from "@/components/ui/status-badge";
import type {
  ClassFieldErrors,
  ClassListItem,
  ClassListResponse,
  ClassStatusFilter,
  ClassSummaryStats,
} from "@/types/classes";

type ClassFilters = {
  search: string;
  status: ClassStatusFilter;
};

type ClassFormState = {
  code: string;
  name: string;
  studyProgram: string;
  cohortYear: string;
  isActive: boolean;
};

type RequestError = {
  message?: string;
  fieldErrors?: ClassFieldErrors;
};

const defaultFilters: ClassFilters = {
  search: "",
  status: "ALL",
};

const emptySummary: ClassSummaryStats = {
  totalClasses: 0,
  activeClasses: 0,
  inactiveClasses: 0,
  classesInSchedules: 0,
};

function createDefaultFormState(classItem?: ClassListItem | null): ClassFormState {
  if (!classItem) {
    return {
      code: "",
      name: "",
      studyProgram: "",
      cohortYear: "",
      isActive: true,
    };
  }

  return {
    code: classItem.code,
    name: classItem.name,
    studyProgram: classItem.studyProgram ?? "",
    cohortYear: classItem.cohortYear === null ? "" : String(classItem.cohortYear),
    isActive: classItem.isActive,
  };
}

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
    const errorBody = (body ?? {}) as RequestError;

    throw {
      message: errorBody.message ?? "Permintaan tidak dapat diproses saat ini.",
      fieldErrors: errorBody.fieldErrors ?? {},
    } satisfies RequestError;
  }

  return body as T;
}

function buildClassesUrl(filters: ClassFilters) {
  const searchParams = new URLSearchParams();

  if (filters.search.trim()) {
    searchParams.set("search", filters.search.trim());
  }

  searchParams.set("status", filters.status);

  return `/api/admin/classes?${searchParams.toString()}`;
}

function SummaryCard({
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
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-slate-700">{hint}</p>
    </article>
  );
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
        className="w-full max-w-2xl rounded-[2rem] border border-white/70 bg-white p-6 shadow-[0_28px_80px_rgba(15,23,42,0.18)]"
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

function FormHint({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "danger" | "warning";
}) {
  const toneClasses: Record<"neutral" | "danger" | "warning", string> = {
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

function ClassFormModal({
  open,
  mode,
  classItem,
  onClose,
  onSuccess,
}: {
  open: boolean;
  mode: "create" | "edit";
  classItem?: ClassListItem | null;
  onClose: () => void;
  onSuccess: (message: string) => Promise<void>;
}) {
  const [formState, setFormState] = useState<ClassFormState>(() =>
    createDefaultFormState(classItem),
  );
  const [fieldErrors, setFieldErrors] = useState<ClassFieldErrors>({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const codeFieldId = useId();
  const nameFieldId = useId();
  const studyProgramFieldId = useId();
  const cohortYearFieldId = useId();
  const statusFieldId = useId();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setFieldErrors({});
    setFormError("");
    setIsSubmitting(true);

    try {
      const payload = {
        code: formState.code,
        name: formState.name,
        studyProgram: formState.studyProgram.trim() ? formState.studyProgram.trim() : null,
        cohortYear: formState.cohortYear.trim() ? Number(formState.cohortYear) : null,
        isActive: formState.isActive,
      };

      const response = await requestJson<{ message: string }>(
        mode === "create" ? "/api/admin/classes" : `/api/admin/classes/${classItem?.id ?? ""}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          body: JSON.stringify(payload),
        },
      );

      await onSuccess(response.message);
      onClose();
    } catch (error) {
      const typedError = error as RequestError;
      setFormError(typedError.message ?? "Kelas gagal disimpan.");
      setFieldErrors(typedError.fieldErrors ?? {});
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={mode === "create" ? "Tambah Kelas" : "Edit Kelas"}
      description={
        mode === "create"
          ? "Lengkapi data master kelas yang akan digunakan pada mahasiswa dan jadwal kuliah."
          : "Perbarui data kelas tanpa mengubah struktur database yang ada."
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
            form="class-form"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-full bg-[color:var(--color-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--color-primary-strong)] disabled:cursor-not-allowed disabled:bg-[color:var(--color-surface-muted)] disabled:text-slate-700 disabled:border disabled:border-[color:var(--color-border-strong)]"
          >
            {isSubmitting
              ? "Menyimpan..."
              : mode === "create"
                ? "Simpan Kelas"
                : "Simpan Perubahan"}
          </button>
        </>
      }
    >
      <form id="class-form" className="space-y-5" onSubmit={handleSubmit}>
        {formError ? <FormHint tone="danger">{formError}</FormHint> : null}

        <div className="grid gap-5 md:grid-cols-2">
          <label className="block" htmlFor={codeFieldId}>
            <span className="text-sm font-semibold text-[color:var(--color-foreground)]">
              Kode Kelas
            </span>
            <input
              id={codeFieldId}
              value={formState.code}
              onChange={(event) =>
                setFormState((current) => ({ ...current, code: event.target.value.toUpperCase() }))
              }
              placeholder="Contoh: 15.5A.01"
              className="mt-2 w-full rounded-[1rem] border border-[color:var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[color:var(--color-primary)] focus:ring-3 focus:ring-[rgba(17,40,75,0.08)]"
            />
            <FieldError message={fieldErrors.code} />
          </label>

          <label className="block" htmlFor={cohortYearFieldId}>
            <span className="text-sm font-semibold text-[color:var(--color-foreground)]">
              Angkatan
            </span>
            <input
              id={cohortYearFieldId}
              type="number"
              min={2000}
              max={2100}
              value={formState.cohortYear}
              onChange={(event) =>
                setFormState((current) => ({ ...current, cohortYear: event.target.value }))
              }
              placeholder="Contoh: 2026"
              className="mt-2 w-full rounded-[1rem] border border-[color:var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[color:var(--color-primary)] focus:ring-3 focus:ring-[rgba(17,40,75,0.08)]"
            />
            <FieldError message={fieldErrors.cohortYear} />
          </label>
        </div>

        <label className="block" htmlFor={nameFieldId}>
          <span className="text-sm font-semibold text-[color:var(--color-foreground)]">
            Nama Kelas
          </span>
          <input
            id={nameFieldId}
            value={formState.name}
            onChange={(event) =>
              setFormState((current) => ({ ...current, name: event.target.value }))
            }
            placeholder="Masukkan nama kelas"
            className="mt-2 w-full rounded-[1rem] border border-[color:var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[color:var(--color-primary)] focus:ring-3 focus:ring-[rgba(17,40,75,0.08)]"
          />
          <FieldError message={fieldErrors.name} />
        </label>

        <label className="block" htmlFor={studyProgramFieldId}>
          <span className="text-sm font-semibold text-[color:var(--color-foreground)]">
            Prodi / Jurusan
          </span>
          <input
            id={studyProgramFieldId}
            value={formState.studyProgram}
            onChange={(event) =>
              setFormState((current) => ({ ...current, studyProgram: event.target.value }))
            }
            placeholder="Contoh: Teknik Informatika"
            className="mt-2 w-full rounded-[1rem] border border-[color:var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[color:var(--color-primary)] focus:ring-3 focus:ring-[rgba(17,40,75,0.08)]"
          />
          <FieldError message={fieldErrors.studyProgram} />
        </label>

        <label className="block" htmlFor={statusFieldId}>
          <span className="text-sm font-semibold text-[color:var(--color-foreground)]">
            Status
          </span>
          <select
            id={statusFieldId}
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

export function ClassesPage() {
  const [tableData, setTableData] = useState<ClassListResponse>({
    classes: [],
    summary: emptySummary,
  });
  const [filters, setFilters] = useState<ClassFilters>(defaultFilters);
  const [draftFilters, setDraftFilters] = useState<ClassFilters>(defaultFilters);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isLoadingTable, setIsLoadingTable] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<FloatingToastNotice>(null);
  const [selectedClass, setSelectedClass] = useState<ClassListItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function loadClasses(nextFilters: ClassFilters, initial = false) {
    if (initial) {
      setIsLoadingInitial(true);
    } else {
      setIsLoadingTable(true);
    }

    setLoadError(null);

    try {
      const data = await requestJson<ClassListResponse>(buildClassesUrl(nextFilters), {
        method: "GET",
      });

      setTableData(data);
      setFilters(nextFilters);
    } catch (error) {
      const typedError = error as RequestError;

      if (initial) {
        setLoadError(typedError.message ?? "Data kelas gagal dimuat.");
      } else {
        setNotice({
          tone: "danger",
          message: typedError.message ?? "Data kelas gagal dimuat.",
        });
      }
    } finally {
      if (initial) {
        setIsLoadingInitial(false);
      } else {
        setIsLoadingTable(false);
      }
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadInitialClasses() {
      try {
        const data = await requestJson<ClassListResponse>(buildClassesUrl(defaultFilters), {
          method: "GET",
        });

        if (cancelled) {
          return;
        }

        setTableData(data);
        setFilters(defaultFilters);
      } catch (error) {
        if (cancelled) {
          return;
        }

        const typedError = error as RequestError;
        setLoadError(typedError.message ?? "Data kelas gagal dimuat.");
      } finally {
        if (!cancelled) {
          setIsLoadingInitial(false);
        }
      }
    }

    void loadInitialClasses();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleRefreshAfterMutation(message: string) {
    setNotice({ tone: "success", message });
    await loadClasses(filters);
  }

  async function handleDeleteClass() {
    if (!selectedClass) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await requestJson<{ message: string }>(
        `/api/admin/classes/${selectedClass.id}`,
        {
          method: "DELETE",
        },
      );

      setIsDeleteModalOpen(false);
      setSelectedClass(null);
      await handleRefreshAfterMutation(response.message);
    } catch (error) {
      const typedError = error as RequestError;
      setNotice({
        tone: "danger",
        message: typedError.message ?? "Kelas gagal dihapus.",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  const summaryCards = [
    {
      label: "Total Kelas",
      value: tableData.summary.totalClasses,
      hint: "Seluruh kelas yang tersimpan di master data.",
      tone: "primary" as const,
    },
    {
      label: "Kelas Aktif",
      value: tableData.summary.activeClasses,
      hint: "Siap dipakai pada mahasiswa dan jadwal kuliah.",
      tone: "success" as const,
    },
    {
      label: "Kelas Nonaktif",
      value: tableData.summary.inactiveClasses,
      hint: "Tetap tersimpan tetapi tidak aktif digunakan.",
      tone: "neutral" as const,
    },
    {
      label: "Dipakai di Jadwal",
      value: tableData.summary.classesInSchedules,
      hint: "Tidak bisa dihapus selama masih direferensikan jadwal kuliah.",
      tone: "warning" as const,
    },
  ];

  const rows: DataTableRow[] = tableData.classes.map((classItem, index) => ({
    key: classItem.id,
    cells: [
      <span key="number" className="font-semibold text-[color:var(--color-foreground)]">
        {index + 1}
      </span>,
      <span key="code" className="font-semibold text-[color:var(--color-foreground)]">
        {classItem.code}
      </span>,
      <div key="name">
        <p className="font-semibold text-[color:var(--color-foreground)]">{classItem.name}</p>
      </div>,
      <span key="studyProgram" className="text-[color:var(--color-foreground)]">
        {classItem.studyProgram?.trim() || "-"}
      </span>,
      <span key="cohortYear" className="text-[color:var(--color-foreground)]">
        {classItem.cohortYear ?? "-"}
      </span>,
      <span key="students" className="text-[color:var(--color-foreground)]">
        {classItem.studentCount} mahasiswa
      </span>,
      <span key="schedules" className="text-[color:var(--color-foreground)]">
        {classItem.scheduleCount} jadwal
      </span>,
      <StatusBadge
        key="status"
        label={classItem.isActive ? "Aktif" : "Nonaktif"}
        tone={classItem.isActive ? "success" : "neutral"}
      />,
      <div key="actions" className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setSelectedClass(classItem);
            setIsEditModalOpen(true);
          }}
          className="inline-flex items-center rounded-full border border-[color:var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[color:var(--color-foreground)] transition hover:bg-[color:var(--color-surface-muted)]"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => {
            setSelectedClass(classItem);
            setIsDeleteModalOpen(true);
          }}
          className="inline-flex items-center rounded-full border border-[rgba(220,38,38,0.12)] bg-[color:var(--color-danger-soft)] px-3 py-1.5 text-xs font-semibold text-red-700 transition hover:bg-[rgba(254,226,226,0.78)]"
        >
          Hapus
        </button>
      </div>,
    ],
  }));

  return (
    <section className="space-y-5">
      <FloatingToast notice={notice} onDismiss={() => setNotice(null)} />

      <PageTitle
        eyebrow="Master Data"
        title="Kelas"
        description="Kelola master kelas yang dipakai pada data mahasiswa dan jadwal kuliah RFID."
        actions={
          <button
            type="button"
            onClick={() => {
              setSelectedClass(null);
              setIsCreateModalOpen(true);
            }}
            className="inline-flex items-center justify-center rounded-full bg-[color:var(--color-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--color-primary-strong)]"
          >
            + Tambah Kelas
          </button>
        }
      />

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {summaryCards.map((card) => (
          <SummaryCard
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
          className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_240px_auto_auto]"
          onSubmit={async (event) => {
            event.preventDefault();
            await loadClasses({ ...draftFilters });
          }}
        >
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
              Cari Kelas
            </span>
            <input
              value={draftFilters.search}
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  search: event.target.value,
                }))
              }
              placeholder="Cari kode, nama, prodi, atau angkatan..."
              className="mt-2 w-full rounded-[1rem] border border-[color:var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[color:var(--color-primary)] focus:ring-3 focus:ring-[rgba(17,40,75,0.08)]"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-700">
              Status
            </span>
            <select
              value={draftFilters.status}
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  status: event.target.value as ClassStatusFilter,
                }))
              }
              className="mt-2 w-full rounded-[1rem] border border-[color:var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[color:var(--color-primary)] focus:ring-3 focus:ring-[rgba(17,40,75,0.08)]"
            >
              <option value="ALL">Semua</option>
              <option value="ACTIVE">Aktif</option>
              <option value="INACTIVE">Nonaktif</option>
            </select>
          </label>

          <button
            type="submit"
            disabled={isLoadingTable || isLoadingInitial}
            className="mt-auto inline-flex items-center justify-center rounded-full bg-[color:var(--color-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--color-primary-strong)] disabled:cursor-not-allowed disabled:bg-[color:var(--color-surface-muted)] disabled:text-slate-700 disabled:border disabled:border-[color:var(--color-border-strong)]"
          >
            {isLoadingTable ? "Memuat..." : "Terapkan Filter"}
          </button>

          <button
            type="button"
            onClick={async () => {
              setDraftFilters(defaultFilters);
              await loadClasses(defaultFilters);
            }}
            className="mt-auto inline-flex items-center justify-center rounded-full border border-[color:var(--color-border)] bg-white px-5 py-3 text-sm font-semibold text-[color:var(--color-foreground)] transition hover:bg-[color:var(--color-surface-muted)]"
          >
            Reset
          </button>
        </form>
      </section>

      {isLoadingInitial ? (
        <section className="rounded-[1.75rem] bg-white px-6 py-8 shadow-[0_20px_45px_rgba(15,23,42,0.06)] lg:px-7">
          <div className="space-y-4">
            <div className="h-5 w-48 animate-pulse rounded-full bg-[color:var(--color-surface-muted)]" />
            <div className="h-4 w-full animate-pulse rounded-full bg-[color:var(--color-surface-muted)]" />
            <div className="h-4 w-10/12 animate-pulse rounded-full bg-[color:var(--color-surface-muted)]" />
            <div className="h-4 w-8/12 animate-pulse rounded-full bg-[color:var(--color-surface-muted)]" />
          </div>
        </section>
      ) : loadError ? (
        <EmptyState
          title="Data kelas belum dapat dimuat"
          description={loadError}
          icon={<DashboardIcon name="classes" className="h-7 w-7" />}
          action={
            <button
              type="button"
              onClick={() => {
                void loadClasses(filters, true);
              }}
              className="inline-flex items-center justify-center rounded-full bg-[color:var(--color-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--color-primary-strong)]"
            >
              Coba Lagi
            </button>
          }
        />
      ) : tableData.summary.totalClasses === 0 ? (
        <EmptyState
          title="Belum ada kelas"
          description="Tambahkan kelas pertama untuk mulai mengelola data mahasiswa dan jadwal kuliah."
          icon={<DashboardIcon name="classes" className="h-7 w-7" />}
          action={
            <button
              type="button"
              onClick={() => {
                setSelectedClass(null);
                setIsCreateModalOpen(true);
              }}
              className="inline-flex items-center justify-center rounded-full bg-[color:var(--color-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--color-primary-strong)]"
            >
              + Tambah Kelas
            </button>
          }
        />
      ) : (
        <DataTable
          title="Daftar Kelas"
          description="Semua kelas aktif maupun nonaktif yang tersedia untuk kebutuhan akademik."
          columns={[
            { key: "number", label: "No", className: "w-[72px]" },
            { key: "code", label: "Kode", className: "w-[140px]" },
            { key: "name", label: "Nama Kelas", className: "w-[240px]" },
            { key: "studyProgram", label: "Prodi / Jurusan", className: "w-[220px]" },
            { key: "cohortYear", label: "Angkatan", className: "w-[120px]" },
            { key: "students", label: "Mahasiswa", className: "w-[130px]" },
            { key: "schedules", label: "Jadwal", className: "w-[110px]" },
            { key: "status", label: "Status", className: "w-[120px]" },
            { key: "actions", label: "Aksi", className: "w-[180px]" },
          ]}
          rows={rows}
          emptyMessage="Tidak ada kelas yang cocok dengan filter saat ini."
          actions={
            isLoadingTable ? (
              <span className="text-sm text-slate-700">
                Memuat data terbaru...
              </span>
            ) : null
          }
        />
      )}

      {isCreateModalOpen ? (
        <ClassFormModal
          open={isCreateModalOpen}
          mode="create"
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handleRefreshAfterMutation}
        />
      ) : null}

      {isEditModalOpen ? (
        <ClassFormModal
          open={isEditModalOpen}
          mode="edit"
          classItem={selectedClass}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={handleRefreshAfterMutation}
        />
      ) : null}

      <ConfirmationModal
        open={isDeleteModalOpen}
        title="Hapus Kelas"
        description={
          selectedClass
            ? `Kelas ${selectedClass.name} (${selectedClass.code}) akan dihapus permanen dari master data.`
            : "Kelas akan dihapus permanen dari master data."
        }
        confirmLabel="Hapus"
        tone="danger"
        isLoading={isDeleting}
        onCancel={() => {
          if (!isDeleting) {
            setIsDeleteModalOpen(false);
          }
        }}
        onConfirm={handleDeleteClass}
      />
    </section>
  );
}
