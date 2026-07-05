"use client";

import { useEffect, type ReactNode } from "react";

type ConfirmationModalTone = "primary" | "danger";

type ConfirmationModalProps = {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: ConfirmationModalTone;
  isLoading?: boolean;
  icon?: ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
};

const confirmToneClasses: Record<ConfirmationModalTone, string> = {
  primary: "bg-[color:var(--color-accent)] hover:bg-[color:var(--color-accent-strong)]",
  danger: "bg-[color:var(--color-danger)] hover:bg-[rgb(185,28,28)]",
};

const iconToneClasses: Record<ConfirmationModalTone, string> = {
  primary: "bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent-strong)]",
  danger: "bg-[color:var(--color-danger-soft)] text-[color:var(--color-danger)]",
};

export function ConfirmationModal({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Batal",
  tone = "primary",
  isLoading = false,
  icon,
  onCancel,
  onConfirm,
}: ConfirmationModalProps) {
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
      onClick={onCancel}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirmation-modal-title"
        className="w-full max-w-lg rounded-[2rem] border border-white/70 bg-white p-6 shadow-[0_28px_80px_rgba(15,23,42,0.18)]"
        onClick={(event) => event.stopPropagation()}
      >
        {icon ? (
          <div className={`mb-5 flex h-14 w-14 items-center justify-center rounded-[1.25rem] ${iconToneClasses[tone]}`}>
            {icon}
          </div>
        ) : null}
        <h2
          id="confirmation-modal-title"
          className="text-2xl font-semibold text-[color:var(--color-foreground)]"
        >
          {title}
        </h2>
        <p className="mt-3 text-sm leading-7 text-[color:var(--color-muted)]">
          {description}
        </p>
        <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="inline-flex items-center justify-center rounded-full border border-[color:var(--color-border)] bg-white px-5 py-3 text-sm font-semibold text-[color:var(--color-foreground)] transition hover:bg-[color:var(--color-surface-muted)] disabled:cursor-not-allowed disabled:bg-[color:var(--color-surface-muted)] disabled:text-[color:var(--color-muted)] disabled:border disabled:border-[color:var(--color-border-strong)]"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={[
              "inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-70",
              confirmToneClasses[tone],
            ].join(" ")}
          >
            {isLoading ? "Memproses..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
