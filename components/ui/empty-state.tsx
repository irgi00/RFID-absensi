import type { ReactNode } from "react";

type EmptyStateProps = {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
};

export function EmptyState({
  title,
  description,
  action,
  icon,
}: EmptyStateProps) {
  return (
    <section className="rounded-[1.75rem] bg-white px-8 py-10 text-center shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
      <div className="mx-auto flex max-w-2xl flex-col items-center">
        {icon ? (
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-[1.4rem] bg-[color:var(--color-primary-soft)] text-[color:var(--color-primary)]">
            {icon}
          </div>
        ) : null}
        <h2 className="text-[1.65rem] font-semibold tracking-tight text-[color:var(--color-foreground)]">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-7 text-[color:var(--color-muted)] sm:text-[15px]">
          {description}
        </p>
        {action ? <div className="mt-6">{action}</div> : null}
      </div>
    </section>
  );
}
