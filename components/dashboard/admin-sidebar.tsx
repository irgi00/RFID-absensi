import type { AuthenticatedAdmin } from "@/lib/admins";
import { adminNavigation } from "@/lib/dashboard-config";

import { BrandMark } from "./brand-mark";
import { LogoutButton } from "./logout-button";
import { SidebarNav } from "./sidebar-nav";

type AdminSidebarProps = {
  admin: AuthenticatedAdmin;
};

function getInitials(fullName: string) {
  return fullName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function AdminSidebar({ admin }: AdminSidebarProps) {
  const initials = getInitials(admin.fullName);

  return (
    <aside className="w-full shrink-0 xl:w-[248px]">
      <div className="xl:sticky xl:top-5">
        <div className="flex flex-col rounded-[1.75rem] bg-[linear-gradient(180deg,#0d1f3a_0%,#132d54_100%)] p-4 text-[color:var(--color-sidebar-foreground)] shadow-[0_28px_60px_rgba(13,31,58,0.24)]">
          <div className="px-1 py-1">
            <BrandMark compact inverted />
          </div>

          <div className="mt-5">
            <p className="px-2 text-[11px] font-semibold uppercase tracking-[0.22em] text-white/52">
              Menu
            </p>
            <div className="mt-3">
              <SidebarNav items={adminNavigation} />
            </div>
          </div>

          <div className="mt-5 border-t border-white/10 pt-4">
            <div className="flex items-center gap-3 px-1">
              <div className="flex h-11 w-11 items-center justify-center rounded-[1rem] bg-white/12 text-sm font-semibold text-white">
                {initials}
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{admin.fullName}</p>
                <p className="mt-1 text-xs text-white/62">@{admin.username}</p>
              </div>
            </div>

            <LogoutButton className="mt-4 w-full justify-center rounded-[1rem] border-white/12 bg-white text-[color:var(--color-primary)] hover:bg-white/92" />
          </div>
        </div>
      </div>
    </aside>
  );
}
