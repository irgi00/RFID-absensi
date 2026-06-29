"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { isDashboardNavigationActive } from "@/lib/dashboard-config";
import type { SidebarItem } from "@/types";

import { DashboardIcon } from "./dashboard-icon";

type SidebarNavProps = {
  items: SidebarItem[];
};

export function SidebarNav({ items }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="space-y-2">
      {items.map((item) => {
        const isActive = isDashboardNavigationActive(item.href, pathname);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={[
              "group flex items-center gap-3 rounded-[1rem] border px-3 py-3 text-sm transition",
              isActive
                ? "border-white/16 bg-white text-[color:var(--color-primary)] shadow-[0_14px_30px_rgba(255,255,255,0.12)]"
                : "border-transparent text-white/74 hover:border-white/10 hover:bg-white/8 hover:text-white",
            ].join(" ")}
          >
            <span
              className={[
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-[0.9rem] border transition",
                isActive
                  ? "border-[rgba(17,40,75,0.08)] bg-[color:var(--color-primary-soft)] text-[color:var(--color-primary)]"
                  : "border-white/10 bg-white/6 text-white/78 group-hover:border-white/16 group-hover:bg-white/10",
              ].join(" ")}
            >
              <DashboardIcon name={item.icon} className="h-4.5 w-4.5" />
            </span>
            <span className="min-w-0 flex-1 truncate font-medium">{item.label}</span>
            <span
              className={[
                "h-2 w-2 rounded-full transition",
                isActive ? "bg-[color:var(--color-accent)] shadow-[0_0_0_4px_rgba(29,78,216,0.12)]" : "bg-transparent",
              ].join(" ")}
            />
          </Link>
        );
      })}
    </nav>
  );
}
