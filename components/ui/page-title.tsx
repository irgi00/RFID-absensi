import type { ReactNode } from "react";

type PageTitleProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  meta?: ReactNode;
  actions?: ReactNode;
};

export function PageTitle({
  eyebrow,
  title,
  description,
  meta,
  actions,
}: PageTitleProps) {
  return (
    <section className="rounded-[1.75rem] bg-white px-6 py-6 shadow-[0_20px_45px_rgba(15,23,42,0.06)] lg:px-7">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-3xl">
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--color-muted)]">
              {eyebrow}
            </p>
          ) : null}
          <h1 className="mt-3 text-[1.9rem] font-semibold tracking-tight text-[color:var(--color-foreground)] sm:text-[2.1rem]">
            {title}
          </h1>
          {description ? (
            <p className="mt-3 max-w-2xl text-sm leading-7 text-[color:var(--color-muted)] sm:text-[15px]">
              {description}
            </p>
          ) : null}
          {meta ? <div className="mt-4 flex flex-wrap gap-2">{meta}</div> : null}
        </div>

        {actions ? (
          <div className="flex flex-wrap items-center gap-3 xl:max-w-[26rem] xl:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
    </section>
  );
}
