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
  ClassScheduleFieldErrors,
  ClassScheduleListItem,
  ClassScheduleListResponse,
  ClassScheduleOptionItem,
  ClassScheduleOptionsResponse,
} from "@/types/class-schedules";

type ScheduleFilters = { search: string };

type ScheduleFormState = {
  subjectId: string;
  classId: string;
  lecturerId: string;
  roomId: string;
  day: string;
  startTime: string;
  endTime: string;
  onTimeCutoff: string;
  active: boolean;
};

type RequestError = { message?: string; fieldErrors?: ClassScheduleFieldErrors };

type ScheduleModalMode = "create" | "edit";
type ScheduleModalState =
  | { status: "closed" }
  | { status: "loading"; mode: ScheduleModalMode }
  | { status: "ready"; mode: ScheduleModalMode; options: ClassScheduleOptionsResponse }
  | { status: "error"; mode: ScheduleModalMode; message: string };

const defaultFilters: ScheduleFilters = { search: "" };
const defaultFormState: ScheduleFormState = {
  subjectId: "",
  classId: "",
  lecturerId: "",
  roomId: "",
  day: "",
  startTime: "",
  endTime: "",
  onTimeCutoff: "",
  active: true,
};

const dayLabelMap: Record<string, string> = {
  MONDAY: "Senin",
  TUESDAY: "Selasa",
  WEDNESDAY: "Rabu",
  THURSDAY: "Kamis",
  FRIDAY: "Jumat",
  SATURDAY: "Sabtu",
  SUNDAY: "Minggu",
};

const dayOptions = [
  { value: "MONDAY", label: "Senin" },
  { value: "TUESDAY", label: "Selasa" },
  { value: "WEDNESDAY", label: "Rabu" },
  { value: "THURSDAY", label: "Kamis" },
  { value: "FRIDAY", label: "Jumat" },
  { value: "SATURDAY", label: "Sabtu" },
  { value: "SUNDAY", label: "Minggu" },
] as const;

function createDefaultFormState(schedule?: ClassScheduleListItem | null): ScheduleFormState {
  return schedule
    ? {
        subjectId: schedule.subjectId,
        classId: schedule.classId,
        lecturerId: schedule.lecturerId,
        roomId: schedule.roomId,
        day: schedule.day,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
        onTimeCutoff: schedule.onTimeCutoff,
        active: schedule.active,
      }
    : { ...defaultFormState };
}

function formatDay(day: string) {
  return dayLabelMap[day] ?? day;
}

function generateTimeOptions(intervalMinutes = 5) {
  const options: string[] = [];
  for (let currentMinute = 0; currentMinute < 1440; currentMinute += intervalMinutes) {
    const hour = Math.floor(currentMinute / 60);
    const minute = currentMinute % 60;
    options.push(`${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`);
  }
  return options;
}

const timeOptions = generateTimeOptions();

function parseTimeToMinutes(value: string) {
  const [hourText, minuteText] = value.split(":");
  const hour = Number(hourText);
  const minute = Number(minuteText);
  return Number.isNaN(hour) || Number.isNaN(minute) ? Number.NaN : hour * 60 + minute;
}

function buildSchedulesUrl(filters: ScheduleFilters) {
  const searchParams = new URLSearchParams();
  if (filters.search.trim()) searchParams.set("search", filters.search.trim());
  const query = searchParams.toString();
  return query ? `/api/admin/class-schedules?${query}` : "/api/admin/class-schedules";
}

async function requestJson<T>(input: RequestInfo, init?: RequestInit) {
  const response = await fetch(input, {
    cache: "no-store",
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
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

function isScheduleConflict(
  schedules: ClassScheduleListItem[],
  formState: ScheduleFormState,
  scheduleId?: string,
) {
  const nextStart = parseTimeToMinutes(formState.startTime);
  const nextEnd = parseTimeToMinutes(formState.endTime);
  return schedules.some((schedule) => {
    if (scheduleId && schedule.id === scheduleId) return false;
    if (schedule.day !== formState.day) return false;
    const existingStart = parseTimeToMinutes(schedule.startTime);
    const existingEnd = parseTimeToMinutes(schedule.endTime);
    const overlaps = existingStart < nextEnd && existingEnd > nextStart;
    return overlaps && (
      schedule.classId === formState.classId ||
      schedule.lecturerId === formState.lecturerId ||
      schedule.roomId === formState.roomId
    );
  });
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-2 text-sm text-[color:var(--color-danger)]">{message}</p>;
}

function FormHint({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "danger" }) {
  const toneClasses: Record<"neutral" | "danger", string> = {
    neutral: "border-[color:var(--color-border)] bg-[color:var(--color-surface-muted)] text-[color:var(--color-muted)]",
    danger: "border-[rgba(220,38,38,0.18)] bg-[color:var(--color-danger-soft)] text-[color:var(--color-danger)]",
  };
  return <div className={`rounded-[1.25rem] border px-4 py-3 text-sm ${toneClasses[tone]}`}>{children}</div>;
}

function ModalShell({ open, title, description, children, onClose, footer }: { open: boolean; title: string; description?: string; children: ReactNode; onClose: () => void; footer?: ReactNode; }) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previousOverflow; };
  }, [open]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(15,23,42,0.52)] px-4 py-8 backdrop-blur-sm" onClick={onClose} role="presentation">
      <div role="dialog" aria-modal="true" className="w-full max-w-4xl rounded-[2rem] border border-white/70 bg-white p-6 shadow-[0_28px_80px_rgba(15,23,42,0.18)]" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2 className="text-[1.55rem] font-semibold tracking-tight text-[color:var(--color-foreground)]">{title}</h2>
            {description ? <p className="mt-2 text-sm leading-7 text-[color:var(--color-muted)]">{description}</p> : null}
          </div>
          <button type="button" onClick={onClose} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color:var(--color-border)] bg-white text-[color:var(--color-muted)] transition hover:bg-[color:var(--color-surface-muted)]" aria-label="Tutup modal">x</button>
        </div>
        <div className="mt-6">{children}</div>
        {footer ? <div className="mt-8 flex flex-col-reverse gap-3 border-t border-[color:var(--color-border)] pt-5 sm:flex-row sm:items-center sm:justify-end">{footer}</div> : null}
      </div>
    </div>
  );
}

function SelectField({ id, label, value, options, placeholder, onChange, error, disabled = false, }: { id: string; label: string; value: string; options: ClassScheduleOptionItem[]; placeholder: string; onChange: (value: string) => void; error?: string; disabled?: boolean; }) {
  return (
    <label className="block" htmlFor={id}>
      <span className="text-sm font-semibold text-[color:var(--color-foreground)]">{label}</span>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} className="mt-2 w-full rounded-[1rem] border border-[color:var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[color:var(--color-primary)] focus:ring-3 focus:ring-[rgba(17,40,75,0.08)] disabled:cursor-not-allowed disabled:bg-[color:var(--color-surface-muted)]">
        <option value="">{placeholder}</option>
        {options.map((item) => <option key={item.id} value={item.id}>{item.label}{item.active ? "" : " - Nonaktif"}</option>)}
      </select>
      <FieldError message={error} />
    </label>
  );
}

function TimeField({ id, label, value, onChange, error, }: { id: string; label: string; value: string; onChange: (value: string) => void; error?: string; }) {
  return (
    <label className="block" htmlFor={id}>
      <span className="text-sm font-semibold text-[color:var(--color-foreground)]">{label}</span>
      <select id={id} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full rounded-[1rem] border border-[color:var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[color:var(--color-primary)] focus:ring-3 focus:ring-[rgba(17,40,75,0.08)]">
        <option value="">Pilih waktu</option>
        {timeOptions.map((time) => <option key={time} value={time}>{time}</option>)}
      </select>
      <FieldError message={error} />
    </label>
  );
}

function ScheduleFormModal({ modalState, formState, fieldErrors, formError, isSubmitting, onClose, onRetry, onChange, onSubmit, }: { modalState: ScheduleModalState; formState: ScheduleFormState; fieldErrors: ClassScheduleFieldErrors; formError: string; isSubmitting: boolean; onClose: () => void; onRetry: () => void; onChange: (updater: (current: ScheduleFormState) => ScheduleFormState) => void; onSubmit: () => void; }) {
  const subjectId = useId();
  const classId = useId();
  const lecturerId = useId();
  const roomId = useId();
  const dayId = useId();
  const startTimeId = useId();
  const endTimeId = useId();
  const cutoffId = useId();
  const statusId = useId();
  const isOpen = modalState.status !== "closed";
  const mode = modalState.status === "closed" ? "create" : modalState.mode;

  const body = (() => {
    if (modalState.status === "loading") {
      return <div className="space-y-4"><div className="h-5 w-48 animate-pulse rounded-full bg-[color:var(--color-surface-muted)]" /><div className="grid gap-4 md:grid-cols-2"><div className="h-12 animate-pulse rounded-[1rem] bg-[color:var(--color-surface-muted)]" /><div className="h-12 animate-pulse rounded-[1rem] bg-[color:var(--color-surface-muted)]" /><div className="h-12 animate-pulse rounded-[1rem] bg-[color:var(--color-surface-muted)]" /><div className="h-12 animate-pulse rounded-[1rem] bg-[color:var(--color-surface-muted)]" /></div></div>;
    }
    if (modalState.status === "error") return <FormHint tone="danger">{modalState.message}</FormHint>;
    if (modalState.status !== "ready") return null;
    return (
      <form id="class-schedule-form" className="space-y-5" onSubmit={(event) => { event.preventDefault(); onSubmit(); }}>
        {formError ? <FormHint tone="danger">{formError}</FormHint> : null}
        <div className="grid gap-5 md:grid-cols-2">
          <SelectField id={subjectId} label="Mata Kuliah" value={formState.subjectId} options={modalState.options.subjects} placeholder="Pilih mata kuliah" onChange={(value) => onChange((current) => ({ ...current, subjectId: value }))} error={fieldErrors.subjectId} />
          <SelectField id={classId} label="Kelas" value={formState.classId} options={modalState.options.classes} placeholder="Pilih kelas" onChange={(value) => onChange((current) => ({ ...current, classId: value }))} error={fieldErrors.classId} />
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <SelectField id={lecturerId} label="Dosen" value={formState.lecturerId} options={modalState.options.lecturers} placeholder="Pilih dosen" onChange={(value) => onChange((current) => ({ ...current, lecturerId: value }))} error={fieldErrors.lecturerId} />
          <SelectField id={roomId} label="Ruangan" value={formState.roomId} options={modalState.options.rooms} placeholder="Pilih ruangan" onChange={(value) => onChange((current) => ({ ...current, roomId: value }))} error={fieldErrors.roomId} />
        </div>
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          <label className="block" htmlFor={dayId}><span className="text-sm font-semibold text-[color:var(--color-foreground)]">Hari</span><select id={dayId} value={formState.day} onChange={(event) => onChange((current) => ({ ...current, day: event.target.value }))} className="mt-2 w-full rounded-[1rem] border border-[color:var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[color:var(--color-primary)] focus:ring-3 focus:ring-[rgba(17,40,75,0.08)]"><option value="">Pilih hari</option>{dayOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select><FieldError message={fieldErrors.day} /></label>
          <TimeField id={startTimeId} label="Jam Mulai" value={formState.startTime} onChange={(value) => onChange((current) => ({ ...current, startTime: value }))} error={fieldErrors.startTime} />
          <TimeField id={endTimeId} label="Jam Selesai" value={formState.endTime} onChange={(value) => onChange((current) => ({ ...current, endTime: value }))} error={fieldErrors.endTime} />
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <TimeField id={cutoffId} label="Batas Waktu Kehadiran" value={formState.onTimeCutoff} onChange={(value) => onChange((current) => ({ ...current, onTimeCutoff: value }))} error={fieldErrors.onTimeCutoff} />
          <label className="block" htmlFor={statusId}><span className="text-sm font-semibold text-[color:var(--color-foreground)]">Status Aktif</span><select id={statusId} value={String(formState.active)} onChange={(event) => onChange((current) => ({ ...current, active: event.target.value === "true" }))} className="mt-2 w-full rounded-[1rem] border border-[color:var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[color:var(--color-primary)] focus:ring-3 focus:ring-[rgba(17,40,75,0.08)]"><option value="true">Aktif</option><option value="false">Nonaktif</option></select></label>
        </div>
      </form>
    );
  })();

  const footer = (() => {
    if (modalState.status === "loading") return <button type="button" onClick={onClose} className="inline-flex items-center justify-center rounded-full border border-[color:var(--color-border)] bg-white px-5 py-3 text-sm font-semibold text-[color:var(--color-foreground)] transition hover:bg-[color:var(--color-surface-muted)]">Tutup</button>;
    if (modalState.status === "error") return <><button type="button" onClick={onClose} className="inline-flex items-center justify-center rounded-full border border-[color:var(--color-border)] bg-white px-5 py-3 text-sm font-semibold text-[color:var(--color-foreground)] transition hover:bg-[color:var(--color-surface-muted)]">Tutup</button><button type="button" onClick={onRetry} className="inline-flex items-center justify-center rounded-full bg-[color:var(--color-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--color-primary-strong)]">Coba Lagi</button></>;
    return <><button type="button" onClick={onClose} disabled={isSubmitting} className="inline-flex items-center justify-center rounded-full border border-[color:var(--color-border)] bg-white px-5 py-3 text-sm font-semibold text-[color:var(--color-foreground)] transition hover:bg-[color:var(--color-surface-muted)] disabled:cursor-not-allowed disabled:bg-[color:var(--color-surface-muted)] disabled:text-[color:var(--color-muted)] disabled:border disabled:border-[color:var(--color-border-strong)]">Batal</button><button type="submit" form="class-schedule-form" disabled={isSubmitting} className="inline-flex items-center justify-center rounded-full bg-[color:var(--color-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--color-primary-strong)] disabled:cursor-not-allowed disabled:bg-[color:var(--color-surface-muted)] disabled:text-[color:var(--color-muted)] disabled:border disabled:border-[color:var(--color-border-strong)]">{isSubmitting ? "Menyimpan..." : mode === "create" ? "Simpan Jadwal" : "Simpan Perubahan"}</button></>;
  })();

  return <ModalShell open={isOpen} onClose={onClose} title={mode === "create" ? "Tambah Jadwal Kuliah" : "Edit Jadwal Kuliah"} description={mode === "create" ? "Lengkapi jadwal kuliah dengan data master yang sudah tersedia untuk kelas, mata kuliah, dosen, dan ruangan." : "Perbarui jadwal kuliah tanpa mengubah struktur data akademik yang sudah ada."} footer={footer}>{body}</ModalShell>;
}

function buildTableRows(schedules: ClassScheduleListItem[], onEdit: (schedule: ClassScheduleListItem) => void, onDelete: (schedule: ClassScheduleListItem) => void): DataTableRow[] {
  return schedules.map((schedule) => ({
    key: schedule.id,
    cells: [
      <span key="day" className="font-medium text-[color:var(--color-foreground)]">{formatDay(schedule.day)}</span>,
      <div key="subject"><p className="font-semibold text-[color:var(--color-foreground)]">{schedule.subject}</p><p className="mt-1 text-xs text-[color:var(--color-muted)]">{schedule.class}</p></div>,
      <span key="lecturer" className="text-[color:var(--color-foreground)]">{schedule.lecturer}</span>,
      <span key="room" className="text-[color:var(--color-foreground)]">{schedule.room}</span>,
      <span key="time" className="font-medium text-[color:var(--color-foreground)]">{schedule.startTime} - {schedule.endTime}</span>,
      <span key="cutoff" className="font-medium text-[color:var(--color-foreground)]">{schedule.onTimeCutoff}</span>,
      <StatusBadge key="status" label={schedule.active ? "Aktif" : "Nonaktif"} tone={schedule.active ? "success" : "neutral"} />,
      <div key="actions" className="flex flex-wrap gap-2"><button type="button" onClick={() => onEdit(schedule)} className="inline-flex items-center rounded-full border border-[color:var(--color-border)] px-3 py-1.5 text-xs font-semibold text-[color:var(--color-foreground)] transition hover:bg-[color:var(--color-surface-muted)]">Edit</button><button type="button" onClick={() => onDelete(schedule)} className="inline-flex items-center rounded-full border border-[rgba(220,38,38,0.12)] bg-[color:var(--color-danger-soft)] px-3 py-1.5 text-xs font-semibold text-[color:var(--color-danger)] transition hover:bg-[rgba(254,226,226,0.78)]">Hapus</button></div>,
    ],
  }));
}

export function ClassSchedulesPage() {
  const [tableData, setTableData] = useState<ClassScheduleListResponse>({ schedules: [] });
  const [filters, setFilters] = useState<ScheduleFilters>(defaultFilters);
  const [draftFilters, setDraftFilters] = useState<ScheduleFilters>(defaultFilters);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isLoadingTable, setIsLoadingTable] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<FloatingToastNotice>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<ClassScheduleListItem | null>(null);
  const [modalState, setModalState] = useState<ScheduleModalState>({ status: "closed" });
  const [formState, setFormState] = useState<ScheduleFormState>(defaultFormState);
  const [fieldErrors, setFieldErrors] = useState<ClassScheduleFieldErrors>({});
  const [formError, setFormError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function loadSchedules(nextFilters: ScheduleFilters, initial = false) {
    if (initial) setIsLoadingInitial(true); else setIsLoadingTable(true);
    setLoadError(null);
    try {
      const data = await requestJson<ClassScheduleListResponse>(buildSchedulesUrl(nextFilters), { method: "GET" });
      setTableData(data);
      setFilters(nextFilters);
    } catch (error) {
      const typedError = error as RequestError;
      if (initial) setLoadError(typedError.message ?? "Data jadwal kuliah gagal dimuat.");
      else setNotice({ tone: "danger", message: typedError.message ?? "Data jadwal kuliah gagal dimuat." });
    } finally {
      if (initial) setIsLoadingInitial(false); else setIsLoadingTable(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    async function loadInitialSchedules() {
      try {
        const data = await requestJson<ClassScheduleListResponse>(buildSchedulesUrl(defaultFilters), { method: "GET" });
        if (cancelled) return;
        setTableData(data);
        setFilters(defaultFilters);
      } catch (error) {
        if (cancelled) return;
        const typedError = error as RequestError;
        setLoadError(typedError.message ?? "Data jadwal kuliah gagal dimuat.");
      } finally {
        if (!cancelled) setIsLoadingInitial(false);
      }
    }
    void loadInitialSchedules();
    return () => { cancelled = true; };
  }, []);

  async function loadModalOptions(mode: ScheduleModalMode, schedule?: ClassScheduleListItem | null) {
    setModalState({ status: "loading", mode });
    setSelectedSchedule(schedule ?? null);
    setFormState(createDefaultFormState(schedule));
    setFieldErrors({});
    setFormError("");
    try {
      const data = await requestJson<ClassScheduleOptionsResponse>("/api/admin/class-schedules/options", { method: "GET" });
      setModalState({ status: "ready", mode, options: data });
    } catch (error) {
      const typedError = error as RequestError;
      setModalState({ status: "error", mode, message: typedError.message ?? "Opsi form jadwal kuliah belum dapat dimuat saat ini." });
    }
  }

  function closeModal() {
    setModalState({ status: "closed" });
    setSelectedSchedule(null);
    setFormState(defaultFormState);
    setFieldErrors({});
    setFormError("");
    setIsSubmitting(false);
  }

  function validateScheduleForm() {
    const nextErrors: ClassScheduleFieldErrors = {};
    if (!formState.subjectId) nextErrors.subjectId = "Pilih mata kuliah terlebih dahulu.";
    if (!formState.classId) nextErrors.classId = "Pilih kelas terlebih dahulu.";
    if (!formState.lecturerId) nextErrors.lecturerId = "Pilih dosen terlebih dahulu.";
    if (!formState.roomId) nextErrors.roomId = "Pilih ruangan terlebih dahulu.";
    if (!formState.day) nextErrors.day = "Pilih hari terlebih dahulu.";
    if (!formState.startTime) nextErrors.startTime = "Jam mulai wajib diisi.";
    if (!formState.endTime) nextErrors.endTime = "Jam selesai wajib diisi.";
    if (!formState.onTimeCutoff) nextErrors.onTimeCutoff = "Batas waktu kehadiran wajib diisi.";

    const startMinutes = parseTimeToMinutes(formState.startTime);
    const endMinutes = parseTimeToMinutes(formState.endTime);
    const cutoffMinutes = parseTimeToMinutes(formState.onTimeCutoff);

    if (formState.startTime && formState.endTime && !Number.isNaN(startMinutes) && !Number.isNaN(endMinutes) && startMinutes >= endMinutes) {
      nextErrors.startTime = "Jam mulai harus lebih awal dari jam selesai.";
    }

    if (formState.startTime && formState.endTime && formState.onTimeCutoff && !Number.isNaN(startMinutes) && !Number.isNaN(endMinutes) && !Number.isNaN(cutoffMinutes) && (cutoffMinutes < startMinutes || cutoffMinutes > endMinutes)) {
      nextErrors.onTimeCutoff = "Batas waktu kehadiran harus berada di antara jam mulai dan jam selesai.";
    }

    if (
      !nextErrors.form &&
      formState.subjectId && formState.classId && formState.lecturerId && formState.roomId && formState.day && formState.startTime && formState.endTime && formState.onTimeCutoff &&
      !Number.isNaN(startMinutes) && !Number.isNaN(endMinutes) && !Number.isNaN(cutoffMinutes) &&
      startMinutes < endMinutes && cutoffMinutes >= startMinutes && cutoffMinutes <= endMinutes &&
      isScheduleConflict(tableData.schedules, formState, selectedSchedule?.id)
    ) {
      nextErrors.form = "Jadwal bentrok dengan data lain pada kelas, dosen, atau ruangan yang sama.";
    }

    setFieldErrors(nextErrors);
    setFormError(nextErrors.form ?? "");
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmitSchedule() {
    if (!validateScheduleForm()) return;
    if (modalState.status !== "ready") return;
    const scheduleId = selectedSchedule?.id;
    if (modalState.mode === "edit" && !scheduleId) {
      setFormError("Data jadwal kuliah yang akan diedit tidak ditemukan.");
      return;
    }

    setIsSubmitting(true);
    setFieldErrors({});
    setFormError("");

    try {
      const response = await requestJson<{ message: string }>(modalState.mode === "create" ? "/api/admin/class-schedules" : `/api/admin/class-schedules/${scheduleId ?? ""}`, {
        method: modalState.mode === "create" ? "POST" : "PATCH",
        body: JSON.stringify({
          subjectId: formState.subjectId,
          classId: formState.classId,
          lecturerId: formState.lecturerId,
          roomId: formState.roomId,
          day: formState.day,
          startTime: formState.startTime,
          endTime: formState.endTime,
          onTimeCutoff: formState.onTimeCutoff,
          isActive: formState.active,
        }),
      });
      closeModal();
      setNotice({ tone: "success", message: response.message });
      await loadSchedules(filters);
    } catch (error) {
      const typedError = error as RequestError;
      setFormError(typedError.message ?? "Jadwal kuliah gagal disimpan.");
      setFieldErrors(typedError.fieldErrors ?? {});
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteSchedule() {
    if (!selectedSchedule) return;
    setIsDeleting(true);
    try {
      const response = await requestJson<{ message: string }>(`/api/admin/class-schedules/${selectedSchedule.id}`, { method: "DELETE" });
      setIsDeleteModalOpen(false);
      setSelectedSchedule(null);
      setNotice({ tone: "success", message: response.message });
      await loadSchedules(filters);
    } catch (error) {
      const typedError = error as RequestError;
      setNotice({ tone: "danger", message: typedError.message ?? "Jadwal kuliah gagal dihapus." });
    } finally {
      setIsDeleting(false);
    }
  }

  const rows = buildTableRows(tableData.schedules, (schedule) => void loadModalOptions("edit", schedule), (schedule) => { setSelectedSchedule(schedule); setIsDeleteModalOpen(true); });

  return (
    <section className="space-y-5">
      <FloatingToast notice={notice} onDismiss={() => setNotice(null)} />
      <PageTitle
        eyebrow="Akademik"
        title="Jadwal Kuliah"
        description="Kelola jadwal perkuliahan yang digunakan oleh sistem absensi RFID dengan sumber master data yang sudah ada."
        actions={<button type="button" onClick={() => void loadModalOptions("create")} className="inline-flex items-center justify-center rounded-full bg-[color:var(--color-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--color-primary-strong)]">+ Tambah Jadwal</button>}
      />

      <section className="rounded-[1.75rem] bg-white px-6 py-5 shadow-[0_20px_45px_rgba(15,23,42,0.06)]">
        <form className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_auto_auto]" onSubmit={async (event) => { event.preventDefault(); await loadSchedules({ ...draftFilters }); }}>
          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted)]">Cari Jadwal</span>
            <input value={draftFilters.search} onChange={(event) => setDraftFilters((current) => ({ ...current, search: event.target.value }))} placeholder="Cari mata kuliah, kelas, dosen, ruangan, atau hari..." className="mt-2 w-full rounded-[1rem] border border-[color:var(--color-border)] bg-white px-4 py-3 text-sm outline-none transition focus:border-[color:var(--color-primary)] focus:ring-3 focus:ring-[rgba(17,40,75,0.08)]" />
          </label>
          <button type="submit" disabled={isLoadingTable || isLoadingInitial} className="mt-auto inline-flex items-center justify-center rounded-full bg-[color:var(--color-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--color-primary-strong)] disabled:cursor-not-allowed disabled:bg-[color:var(--color-surface-muted)] disabled:text-[color:var(--color-muted)] disabled:border disabled:border-[color:var(--color-border-strong)]">{isLoadingTable ? "Memuat..." : "Terapkan Filter"}</button>
          <button type="button" onClick={async () => { setDraftFilters(defaultFilters); await loadSchedules(defaultFilters); }} className="mt-auto inline-flex items-center justify-center rounded-full border border-[color:var(--color-border)] bg-white px-5 py-3 text-sm font-semibold text-[color:var(--color-foreground)] transition hover:bg-[color:var(--color-surface-muted)]">Reset</button>
        </form>
      </section>

      {isLoadingInitial ? (
        <section className="rounded-[1.75rem] bg-white px-6 py-8 shadow-[0_20px_45px_rgba(15,23,42,0.06)] lg:px-7"><div className="space-y-4"><div className="h-5 w-48 animate-pulse rounded-full bg-[color:var(--color-surface-muted)]" /><div className="h-4 w-full animate-pulse rounded-full bg-[color:var(--color-surface-muted)]" /><div className="h-4 w-10/12 animate-pulse rounded-full bg-[color:var(--color-surface-muted)]" /><div className="h-4 w-8/12 animate-pulse rounded-full bg-[color:var(--color-surface-muted)]" /></div></section>
      ) : loadError ? (
        <EmptyState title="Data jadwal kuliah belum dapat dimuat" description={loadError} icon={<DashboardIcon name="schedules" className="h-7 w-7" />} action={<button type="button" onClick={() => { void loadSchedules(filters, true); }} className="inline-flex items-center justify-center rounded-full bg-[color:var(--color-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--color-primary-strong)]">Coba Lagi</button>} />
      ) : tableData.schedules.length === 0 && filters.search.trim() === "" ? (
        <EmptyState title="Belum ada jadwal kuliah" description="Tambahkan jadwal kuliah pertama untuk mulai menghubungkan mata kuliah, kelas, dosen, dan ruangan pada proses absensi RFID." icon={<DashboardIcon name="schedules" className="h-7 w-7" />} action={<button type="button" onClick={() => void loadModalOptions("create")} className="inline-flex items-center justify-center rounded-full bg-[color:var(--color-primary)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--color-primary-strong)]">+ Tambah Jadwal</button>} />
      ) : (
        <DataTable title="Daftar Jadwal Kuliah" description="Seluruh jadwal kuliah aktif maupun nonaktif ditampilkan dari satu endpoint admin." columns={[{ key: "day", label: "Hari", className: "w-[120px]" }, { key: "subject", label: "Mata Kuliah", className: "w-[250px]" }, { key: "lecturer", label: "Dosen", className: "w-[220px]" }, { key: "room", label: "Ruangan", className: "w-[180px]" }, { key: "time", label: "Jam", className: "w-[140px]" }, { key: "cutoff", label: "Batas Waktu Kehadiran", className: "w-[170px]" }, { key: "status", label: "Status", className: "w-[120px]" }, { key: "actions", label: "Aksi", className: "w-[150px]" }]} rows={rows} emptyMessage="Tidak ada jadwal yang cocok dengan filter saat ini." actions={isLoadingTable ? <span className="text-sm text-[color:var(--color-muted)]">Memuat data terbaru...</span> : null} />
      )}

      <ScheduleFormModal
        modalState={modalState}
        formState={formState}
        fieldErrors={fieldErrors}
        formError={formError}
        isSubmitting={isSubmitting}
        onClose={closeModal}
        onRetry={() => { if (modalState.status !== "closed") void loadModalOptions(modalState.mode, selectedSchedule); }}
        onChange={setFormState}
        onSubmit={() => { void handleSubmitSchedule(); }}
      />

      <ConfirmationModal
        open={isDeleteModalOpen}
        title="Hapus Jadwal Kuliah"
        description={selectedSchedule ? `Jadwal ${formatDay(selectedSchedule.day)} - ${selectedSchedule.subject} akan dihapus permanen dari master data.` : "Jadwal kuliah akan dihapus permanen dari master data."}
        confirmLabel="Hapus"
        tone="danger"
        isLoading={isDeleting}
        onCancel={() => { if (!isDeleting) { setIsDeleteModalOpen(false); setSelectedSchedule(null); } }}
        onConfirm={() => { void handleDeleteSchedule(); }}
      />
    </section>
  );
}