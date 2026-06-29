import type { SummaryCard as SummaryCardType } from "@/types";

import { StatusBadge } from "@/components/ui/status-badge";

import { DashboardIcon } from "./dashboard-icon";

type SummaryCardProps = {
  card: SummaryCardType;
};

const toneClasses: Record<
  SummaryCardType["tone"],
  {
    panel: string;
    icon: string;
    badgeTone: "primary" | "success" | "warning" | "neutral";
  }
> = {
  primary: {
    panel: "bg-white ring-1 ring-[rgba(17,40,75,0.08)]",
    icon: "bg-[color:var(--color-primary)] text-white shadow-[0_14px_28px_rgba(17,40,75,0.2)]",
    badgeTone: "primary",
  },
  success: {
    panel: "bg-white ring-1 ring-[rgba(5,150,105,0.08)]",
    icon: "bg-[color:var(--color-success)] text-white shadow-[0_14px_28px_rgba(5,150,105,0.18)]",
    badgeTone: "success",
  },
  warning: {
    panel: "bg-white ring-1 ring-[rgba(217,119,6,0.08)]",
    icon: "bg-[color:var(--color-warning)] text-white shadow-[0_14px_28px_rgba(217,119,6,0.16)]",
    badgeTone: "warning",
  },
  neutral: {
    panel: "bg-white ring-1 ring-[rgba(100,116,139,0.08)]",
    icon: "bg-[color:var(--color-primary-soft)] text-[color:var(--color-primary)] shadow-[0_12px_22px_rgba(15,23,42,0.06)]",
    badgeTone: "neutral",
  },
};

export function SummaryCard({ card }: SummaryCardProps) {
  const tone = toneClasses[card.tone];

  return (
    <article className={`rounded-[1.75rem] p-5 shadow-[0_18px_40px_rgba(15,23,42,0.05)] ${tone.panel}`}>
      <div className="flex items-center justify-between gap-3">
        <div className={`flex h-12 w-12 items-center justify-center rounded-[1rem] ${tone.icon}`}>
          <DashboardIcon name={card.icon} className="h-5 w-5" />
        </div>
        {card.badge ? <StatusBadge label={card.badge} tone={tone.badgeTone} /> : null}
      </div>
      <div className="mt-5">
        <p className="text-sm font-medium text-[color:var(--color-muted)]">{card.label}</p>
        <strong className="mt-2 block text-[2rem] font-semibold tracking-tight text-[color:var(--color-foreground)]">
          {card.value}
        </strong>
      </div>
      <p className="mt-3 text-sm leading-6 text-[color:var(--color-muted)]">
        {card.hint}
      </p>
    </article>
  );
}
