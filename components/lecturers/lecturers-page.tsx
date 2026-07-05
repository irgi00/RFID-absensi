"use client";

import { useEffect, useId, useState, type ReactNode } from "react";

import { DashboardIcon } from "@/components/dashboard/dashboard-icon";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import {
  FloatingToast,
  type FloatingToastNotice,
} from "@/components/ui/floating-toast";
import { DataTable, type DataTableRow } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { PageTitle } from "@/components/ui/page-title";
import { StatusBadge } from "@/components/ui/status-badge";
import type {
  LecturerFieldErrors,
  LecturerListItem,
  LecturerListResponse,
  LecturerStatusFilter,
  LecturerSummaryStats,
} from "@/types/lecturers";

type LecturerFilters = {
  search: string;
  status: LecturerStatusFilter;
};

type LecturerFormState = {
  code: string;
  fullName: string;
  email: string;
  phone: string;
  isActive: boolean;
};

type RequestError = {
  message?: string;
  fieldErrors?: LecturerFieldErrors;
};

const defaultFilters: LecturerFilters = {
  search: "",
  status: "ALL",
};

const emptySummary: LecturerSummaryStats = {
  totalLecturers: 0,
  activeLecturers: 0,
  inactiveLecturers: 0,
  lecturersInSchedules: 0,
};

function createDefaultFormState(lecturer?: LecturerListItem | null): LecturerFormState {
  if (!lecturer) {
    return {
      code: "",
      fullName: "",
      email: "",
      phone: "",
      isActive: true,
    };
  }

  return {
    code: lecturer.code ?? "",
    fullName: lecturer.fullName,
    email: lecturer.email ?? "",
    phone: lecturer.phone ?? "",
    isActive: lecturer.isActive,
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

function buildLecturersUrl(filters: LecturerFilters) {
  const searchParams = new URLSearchParams();

  if (filters.search.trim()) {
    searchParams.set("search", filters.search.trim());
  }

  searchParams.set("status", filters.status);

  return `/api/admin/lecturers?${searchParams.toString()}`;
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
        <p className="text-sm font-medium text-[color:var(--color-muted)]">{label}</p>
      </div>
      <p className="mt-4 text-[2rem] font-semibold tracking-tight text-[color:var(--color-foreground)]">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-[color:var(--color-muted)]">{hint}</p>
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
              <p className="mt-2 text-sm leading-7 text-[color:var(--color-muted)]">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--color-border)] bg-white text-[color:var(--color-muted)] transition hover:bg-[color:var(--color-surface-muted)]"
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
  tone?: "neutral" | "danger";
}) {
  const toneClasses: Record<"neutral" | "danger", string> = {
    neutral:
      "border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] text-[color:var(--color-muted)]",
    danger:
      "border-[rgba(220,38,38,0.18)] bg-[color:var(--color-danger-soft)] text-[color:var(--color-danger)]",
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

  return <p className="mt-2 text-sm text-[color:var(--color-danger)]">{message}</p>;
}

function LecturerFormModal({
  open,
  mode,
  lecturer,
  onClose,
  onSuccess,
}: {
  open: boolean;
  mode: "create" | "edit";
  lecturer?: LecturerListItem | null;
  onClose: () => void;
  onSuccess: (message: string) => Promise<void>;
}) {
  const [formState, setFormState] = useState<LecturerFormState>(() =>
    createDefaultFormState(lecturer),
  );
  const [fieldErrors, setFieldErrors] = useState<LecturerFieldErrors>({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const codeFieldId = useId();
  const fullNameFieldId = useId();
  const emailFieldId = useId();
  const phoneFieldId = useId();
  const statusFieldId = useId();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setFieldErrors({});
    setFormError("");
    setIsSubmitting(true);

    try {
      const payload = {
        code: formState.code,
        fullName: formState.fullName,
        email: formState.email,
        phone: formState.phone,
        isActive: formState.isActive,
      };

      const response = await requestJson<{ message: string }>(
        mode === "create"
          ? "/api/admin/lecturers"
          : `/api/admin/lecturers/${lecturer?.id ?? ""}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          body: JSON.stringify(payload),
        },
      );

      await onSuccess(response.message);
      onClose();
    } catch (error) {
      const typedError = error as RequestError;
      setFormError(typedError.message ?? "Dosen gagal disimpan.");
      setFieldErrors(typedError.fieldErrors ?? {});
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <ModalShell
      open={open}
      onClose={onClose}
      title={mode === "create" ? "Tambah Dosen" : "Edit Dosen"}
      description={
        mode === "create"
          ? "Lengkapi data dosen pengampu yang akan digunakan pada jadwal kuliah."
          : "Perbarui data dosen tanpa mengubah struktur database yang ada."
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
            form="lecturer-form"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-full bg-[color:var(--color-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--color-primary-strong)] disabled:cursor-not-allowed disabled:bg-[color:var(--color-surface-muted)] disabled:text-[color:var(--color-muted)] disabled:border disabled:border-[color:var(--color-border-strong)]"
          >
            {isSubmitting
              ? "Menyimpan..."
              : mode === "create"
                ? "Simpan Dosen"
                : "Simpan Perubahan"}
          </button>
        </>
      }
    >
      <form id="lecturer-form" className="space-y-5" onSubmit={handleSubmit}>
        {formError ? <FormHint tone="danger">{formError}</FormHint> : null}

        <div className="grid gap-5 md:grid-cols-2">
          <label className="block" htmlFor={codeFieldId}>
            <span className="text-sm font-semibold text-[color:var(--color-foreground)]">
              Kode Dosen
            </span>
            <input
              id={codeFieldId}
              value={formState.code}
              onChange={(event) =>
                setFormState((current) => ({ ...current, code: event.target.value.toUpperCase() }))
              }
              placeholder="Contoh: DSN"
              className="mt-2 w-full rounded-[1rem] border border-[color:var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[color:var(--color-primary)] focus:ring-3 focus:ring-[rgba(17,40,75,0.08)]"
            />
            <FieldError message={fieldErrors.code} />
          </label>

          <label className="block" htmlFor={phoneFieldId}>
            <span className="text-sm font-semibold text-[color:var(--color-foreground)]">
              Nomor Telepon
            </span>
            <input
              id={phoneFieldId}
              value={formState.phone}
              onChange={(event) =>
                setFormState((current) => ({ ...current, phone: event.target.value }))
              }
              placeholder="Contoh: 081234567890"
              className="mt-2 w-full rounded-[1rem] border border-[color:var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[color:var(--color-primary)] focus:ring-3 focus:ring-[rgba(17,40,75,0.08)]"
            />
            <FieldError message={fieldErrors.phone} />
          </label>
        </div>

        <label className="block" htmlFor={fullNameFieldId}>
          <span className="text-sm font-semibold text-[color:var(--color-foreground)]">
            Nama Dosen
          </span>
          <input
            id={fullNameFieldId}
            value={formState.fullName}
            onChange={(event) =>
              setFormState((current) => ({ ...current, fullName: event.target.value }))
            }
            placeholder="Masukkan nama lengkap dosen"
            className="mt-2 w-full rounded-[1rem] border border-[color:var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[color:var(--color-primary)] focus:ring-3 focus:ring-[rgba(17,40,75,0.08)]"
          />
          <FieldError message={fieldErrors.fullName} />
        </label>

        <label className="block" htmlFor={emailFieldId}>
          <span className="text-sm font-semibold text-[color:var(--color-foreground)]">
            Email
          </span>
          <input
            id={emailFieldId}
            type="email"
            value={formState.email}
            onChange={(event) =>
              setFormState((current) => ({ ...current, email: event.target.value }))
            }
            placeholder="Masukkan email dosen"
            className="mt-2 w-full rounded-[1rem] border border-[color:var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[color:var(--color-primary)] focus:ring-3 focus:ring-[rgba(17,40,75,0.08)]"
          />
          <FieldError message={fieldErrors.email} />
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

export function LecturersPage() {
  const [tableData, setTableData] = useState<LecturerListResponse>({
    lecturers: [],
    summary: emptySummary,
  });
  const [filters, setFilters] = useState<LecturerFilters>(defaultFilters);
  const [draftFilters, setDraftFilters] = useState<LecturerFilters>(defaultFilters);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isLoadingTable, setIsLoadingTable] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<FloatingToastNotice>(null);
  const [selectedLecturer, setSelectedLecturer] = useState<LecturerListItem | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function loadLecturers(nextFilters: LecturerFilters, initial = false) {
    if (initial) {
      setIsLoadingInitial(true);
    } else {
      setIsLoadingTable(true);
    }

    setLoadError(null);

    try {
      const data = await requestJson<LecturerListResponse>(buildLecturersUrl(nextFilters), {
        method: "GET",
      });

      setTableData(data);
      setFilters(nextFilters);
    } catch (error) {
      const typedError = error as RequestError;

      if (initial) {
        setLoadError(typedError.message ?? "Data dosen gagal dimuat.");
      } else {
        setNotice({
          tone: "danger",
          message: typedError.message ?? "Data dosen gagal dimuat.",
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

    async function loadInitialLecturers() {
      try {
        const data = await requestJson<LecturerListResponse>(buildLecturersUrl(defaultFilters), {
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
        setLoadError(typedError.message ?? "Data dosen gagal dimuat.");
      } finally {
        if (!cancelled) {
          setIsLoadingInitial(false);
        }
      }
    }

    void loadInitialLecturers();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleRefreshAfterMutation(message: string) {
    setNotice({ tone: "success", message });
    await loadLecturers(filters);
  }

  async function handleDeleteLecturer() {
    if (!selectedLecturer) {
      return;
    }

    setIsDeleting(true);

    try {
      const response = await requestJson<{ message: string }>(
        `/api/admin/lecturers/${selectedLecturer.id}`,
        {
          method: "DELETE",
        },
      );

      setIsDeleteModalOpen(false);
      setSelectedLecturer(null);
      await handleRefreshAfterMutation(response.message);
    } catch (error) {
      const typedError = error as RequestError;
      setNotice({
        tone: "danger",
        message: typedError.message ?? "Dosen gagal dihapus.",
      });
    } finally {
      setIsDeleting(false);
    }
  }

  const summaryCards = [
    {
      label: "Total Dosen",
      value: tableData.summary.totalLecturers,
      hint: "Seluruh dosen yang tersimpan di master data.",
      tone: "primary" as const,
    },
    {
      label: "Dosen Aktif",
      value: tableData.summary.activeLecturers,
      hint: "Siap dipakai pada penyusunan jadwal kuliah.",
      tone: "success" as const,
    },
    {
      label: "Dosen Nonaktif",
      value: tableData.summary.inactiveLecturers,
      hint: "Tetap tersimpan tetapi tidak aktif digunakan.",
      tone: "neutral" as const,
    },
    {
      label: "Dipakai di Jadwal",
      value: tableData.summary.lecturersInSchedules,
      hint: "Tidak bisa dihapus selama masih direferensikan jadwal kuliah.",
      tone: "warning" as const,
    },
  ];

  const rows: DataTableRow[] = tableData.lecturers.map((lecturer, index) => ({
    key: lecturer.id,
    cells: [
      <span key="number" className="font-semibold text-[color:var(--color-foreground)]">
        {index + 1}
      </span>,
      <span key="code" className="font-semibold text-[color:var(--color-foreground)]">
        {lecturer.code ?? "-"}
      </span>,
      <div key="name">
        <p className="font-semibold text-[color:var(--color-foreground)]">
          {lecturer.fullName}
        </p>
      </div>,
      <span key="email" className="text-[color:var(--color-foreground)]">
        {lecturer.email ?? "-"}
      </span>,
      <span key="phone" className="text-[color:var(--color-foreground)]">
        {lecturer.phone ?? "-"}
      </span>,
      <span key="schedules" className="text-[color:var(--color-foreground)]">
        {lecturer.scheduleCount} jadwal
      </span>,
      <StatusBadge
        key="status"
        label={lecturer.isActive ? "Aktif" : "Nonaktif"}
        tone={lecturer.isActive ? "success" : "neutral"}
      />,
      <div key="actions" className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setSelectedLecturer(lecturer);
            setIsEditModalOpen(true);
          }}
          className="inline-flex items-center rounded-full border border-[color:var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[color:var(--color-foreground)] transition hover:bg-[color:var(--color-surface-muted)]"
        >
          Edit
        </button>
        <button
          type="button"
          onClick={() => {
            setSelectedLecturer(lecturer);
            setIsDeleteModalOpen(true);
          }}
          className="inline-flex items-center rounded-full border border-[rgba(220,38,38,0.12)] bg-[color:var(--color-danger-soft)] px-3 py-1.5 text-xs font-semibold text-[color:var(--color-danger)] transition hover:bg-[rgba(254,226,226,0.78)]"
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
        title="Dosen"
        description="Kelola master dosen pengampu yang akan dipakai pada jadwal kuliah dan proses absensi RFID."
        actions={
          <button
            type="button"
            onClick={() => {
              setSelectedLecturer(null);
              setIsCreateModalOpen(true);
            }}
            className="inline-flex items-center justify-center rounded-full bg-[color:var(--color-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--color-primary-strong)]"
          >
            + Tambah Dosen
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
            await loadLecturers({ ...draftFilters });
          }}
        >
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted)]">
              Cari Dosen
            </span>
            <input
              value={draftFilters.search}
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  search: event.target.value,
                }))
              }
              placeholder="Cari kode, nama, email, atau telepon..."
              className="mt-2 w-full rounded-[1rem] border border-[color:var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[color:var(--color-primary)] focus:ring-3 focus:ring-[rgba(17,40,75,0.08)]"
            />
          </label>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted)]">
              Status
            </span>
            <select
              value={draftFilters.status}
              onChange={(event) =>
                setDraftFilters((current) => ({
                  ...current,
                  status: event.target.value as LecturerStatusFilter,
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
            className="mt-auto inline-flex items-center justify-center rounded-full bg-[color:var(--color-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--color-primary-strong)] disabled:cursor-not-allowed disabled:bg-[color:var(--color-surface-muted)] disabled:text-[color:var(--color-muted)] disabled:border disabled:border-[color:var(--color-border-strong)]"
          >
            {isLoadingTable ? "Memuat..." : "Terapkan Filter"}
          </button>

          <button
            type="button"
            onClick={async () => {
              setDraftFilters(defaultFilters);
              await loadLecturers(defaultFilters);
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
          title="Data dosen belum dapat dimuat"
          description={loadError}
          icon={<DashboardIcon name="lecturers" className="h-7 w-7" />}
          action={
            <button
              type="button"
              onClick={() => {
                void loadLecturers(filters, true);
              }}
              className="inline-flex items-center justify-center rounded-full bg-[color:var(--color-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--color-primary-strong)]"
            >
              Coba Lagi
            </button>
          }
        />
      ) : tableData.summary.totalLecturers === 0 ? (
        <EmptyState
          title="Belum ada dosen"
          description="Tambahkan dosen pertama untuk mulai menyusun jadwal kuliah pada dashboard admin."
          icon={<DashboardIcon name="lecturers" className="h-7 w-7" />}
          action={
            <button
              type="button"
              onClick={() => {
                setSelectedLecturer(null);
                setIsCreateModalOpen(true);
              }}
              className="inline-flex items-center justify-center rounded-full bg-[color:var(--color-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--color-primary-strong)]"
            >
              + Tambah Dosen
            </button>
          }
        />
      ) : (
        <DataTable
          title="Daftar Dosen"
          description="Semua dosen aktif maupun nonaktif yang tersedia untuk kebutuhan akademik."
          columns={[
            { key: "number", label: "No", className: "w-[72px]" },
            { key: "code", label: "Kode", className: "w-[140px]" },
            { key: "name", label: "Nama Dosen", className: "w-[240px]" },
            { key: "email", label: "Email", className: "w-[220px]" },
            { key: "phone", label: "Telepon", className: "w-[160px]" },
            { key: "schedules", label: "Dipakai di Jadwal", className: "w-[150px]" },
            { key: "status", label: "Status", className: "w-[120px]" },
            { key: "actions", label: "Aksi", className: "w-[180px]" },
          ]}
          rows={rows}
          emptyMessage="Tidak ada dosen yang cocok dengan filter saat ini."
          actions={
            isLoadingTable ? (
              <span className="text-sm text-[color:var(--color-muted)]">
                Memuat data terbaru...
              </span>
            ) : null
          }
        />
      )}

      {isCreateModalOpen ? (
        <LecturerFormModal
          open={isCreateModalOpen}
          mode="create"
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handleRefreshAfterMutation}
        />
      ) : null}

      {isEditModalOpen ? (
        <LecturerFormModal
          open={isEditModalOpen}
          mode="edit"
          lecturer={selectedLecturer}
          onClose={() => setIsEditModalOpen(false)}
          onSuccess={handleRefreshAfterMutation}
        />
      ) : null}

      <ConfirmationModal
        open={isDeleteModalOpen}
        title="Hapus Dosen"
        description={
          selectedLecturer
            ? `Dosen ${selectedLecturer.fullName}${selectedLecturer.code ? ` (${selectedLecturer.code})` : ""} akan dihapus permanen dari master data.`
            : "Dosen akan dihapus permanen dari master data."
        }
        confirmLabel="Hapus"
        tone="danger"
        isLoading={isDeleting}
        onCancel={() => {
          if (!isDeleting) {
            setIsDeleteModalOpen(false);
          }
        }}
        onConfirm={handleDeleteLecturer}
      />
    </section>
  );
}
