import type { ReactNode } from "react";

export type DataTableColumn = {
  key: string;
  label: string;
  className?: string;
};

export type DataTableRow = {
  key: string;
  cells: ReactNode[];
};

type DataTableProps = {
  title: string;
  description?: string;
  columns: DataTableColumn[];
  rows: DataTableRow[];
  actions?: ReactNode;
  emptyMessage?: string;
};

export function DataTable({
  title,
  description,
  columns,
  rows,
  actions,
  emptyMessage = "Belum ada data untuk ditampilkan.",
}: DataTableProps) {
  return (
    <section className="overflow-hidden rounded-[1.75rem] bg-white shadow-[0_20px_45px_rgba(15,23,42,0.06)]">
      <div className="flex flex-col gap-4 px-6 py-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <h2 className="text-lg font-semibold text-[color:var(--color-foreground)]">
            {title}
          </h2>
          {description ? (
            <p className="mt-2 text-sm leading-6 text-[color:var(--color-muted)]">
              {description}
            </p>
          ) : null}
        </div>
        {actions ? <div className="flex items-center gap-3">{actions}</div> : null}
      </div>

      <div className="overflow-x-auto border-t border-[color:var(--color-border)]">
        <table className="min-w-full border-separate border-spacing-0">
          <thead>
            <tr className="bg-[color:var(--color-surface-muted)]">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={[
                    "border-b border-[color:var(--color-border)] px-6 py-3.5 text-left text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--color-muted)]",
                    column.className ?? "",
                  ].join(" ")}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((row) => (
                <tr
                  key={row.key}
                  className="group transition hover:bg-[rgba(244,247,251,0.88)]"
                >
                  {row.cells.map((cell, index) => (
                    <td
                      key={`${row.key}-${columns[index]?.key ?? index}`}
                      className={[
                        "border-b border-[color:var(--color-border)] px-6 py-4 text-sm align-top text-[color:var(--color-foreground)]",
                        columns[index]?.className ?? "",
                      ].join(" ")}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-6 py-10 text-center text-sm text-[color:var(--color-muted)]"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
