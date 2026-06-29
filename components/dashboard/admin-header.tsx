"use client";

import { usePathname } from "next/navigation";

import type { AuthenticatedAdmin } from "@/lib/admins";
import { adminNavigation, getDashboardNavigationItem } from "@/lib/dashboard-config";

import { DashboardIcon } from "./dashboard-icon";

type AdminHeaderProps = {
  admin: AuthenticatedAdmin;
};

const longDateFormatter = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
});

const shortDateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function getInitials(fullName: string) {
  return fullName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function AdminHeader({ admin }: AdminHeaderProps) {
  const pathname = usePathname();
  const currentSection = getDashboardNavigationItem(pathname) ?? adminNavigation[0];
  const initials = getInitials(admin.fullName);
  const breadcrumb =
    currentSection.href === "/dashboard"
      ? "Dashboard"
      : `Dashboard / ${currentSection.label}`;
  const lastLoginLabel = admin.lastLoginAt
    ? shortDateTimeFormatter.format(new Date(admin.lastLoginAt))
    : "Baru login";

  return (
    <header className="rounded-[1.75rem] bg-[rgba(255,255,255,0.92)] px-6 py-5 shadow-[0_20px_45px_rgba(15,23,42,0.06)] backdrop-blur">
      <div className="flex flex-col gap-5 2xl:flex-row 2xl:items-center 2xl:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--color-muted)]">
            {breadcrumb}
          </p>
          <h1 className="mt-2 truncate text-[1.65rem] font-semibold tracking-tight text-[color:var(--color-foreground)]">
            {currentSection.label}
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[color:var(--color-muted)]">
            {currentSection.description}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="rounded-[1.15rem] bg-[color:var(--color-surface)] px-4 py-3 shadow-[inset_0_0_0_1px_rgba(226,232,240,0.8)]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted)]">
              Hari ini
            </p>
            <p className="mt-1 text-sm font-semibold text-[color:var(--color-foreground)]">
              {longDateFormatter.format(new Date())}
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-[1.15rem] bg-[color:var(--color-surface)] px-4 py-3 shadow-[inset_0_0_0_1px_rgba(226,232,240,0.8)]">
            <span className="flex h-10 w-10 items-center justify-center rounded-[0.95rem] bg-[color:var(--color-primary-soft)] text-[color:var(--color-primary)]">
              <DashboardIcon name="bell" className="h-4.5 w-4.5" />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--color-muted)]">
                Notifikasi
              </p>
              <p className="mt-1 text-sm font-semibold text-[color:var(--color-foreground)]">
                Pemantauan sistem aktif
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-[1.15rem] bg-[color:var(--color-primary)] px-3.5 py-3 text-white shadow-[0_16px_35px_rgba(17,40,75,0.24)]">
            <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-white/14 text-sm font-semibold">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{admin.fullName}</p>
              <p className="mt-1 text-xs text-white/72">Login terakhir {lastLoginLabel}</p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
