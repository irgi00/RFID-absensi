"use client";

import { useEffect } from "react";

export type FloatingToastNotice =
  | {
      tone: "success" | "danger";
      message: string;
    }
  | null;

type FloatingToastProps = {
  notice: FloatingToastNotice;
  onDismiss?: () => void;
  durationMs?: number;
};

export function FloatingToast({
  notice,
  onDismiss,
  durationMs = 3200,
}: FloatingToastProps) {
  useEffect(() => {
    if (!notice || !onDismiss) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      onDismiss();
    }, durationMs);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [durationMs, notice, onDismiss]);

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
                <path d="M12 8v4" />
                <path d="M12 16h.01" />
                <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
              </svg>
            )}
          </span>

          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-[color:var(--color-foreground)]">
              {notice.tone === "success" ? "Berhasil" : "Perlu perhatian"}
            </p>
            <p className="mt-1 text-sm leading-6 text-[color:var(--color-muted)]">
              {notice.message}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
