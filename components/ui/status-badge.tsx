import type { ReactNode } from "react";

export type StatusBadgeTone =
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "neutral";

type StatusBadgeProps = {
  label: string;
  tone?: StatusBadgeTone;
  icon?: ReactNode;
};

const toneClasses: Record<StatusBadgeTone, string> = {
  primary:
    "border-[rgba(29,78,216,0.14)] bg-[color:var(--color-accent-soft)] text-[color:var(--color-accent-strong)]",
  success:
    "border-[rgba(5,150,105,0.14)] bg-[color:var(--color-success-soft)] text-[color:var(--color-success)]",
  warning:
    "border-[rgba(217,119,6,0.14)] bg-[color:var(--color-warning-soft)] text-[color:var(--color-warning)]",
  danger:
    "border-[rgba(220,38,38,0.14)] bg-[color:var(--color-danger-soft)] text-[color:var(--color-danger)]",
  neutral:
    "border-[rgba(100,116,139,0.14)] bg-[color:var(--color-neutral-soft)] text-[color:var(--color-muted)]",
};

export function StatusBadge({
  label,
  tone = "neutral",
  icon,
}: StatusBadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
        toneClasses[tone],
      ].join(" ")}
    >
      {icon}
      {label}
    </span>
  );
}
