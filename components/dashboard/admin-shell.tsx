import type { ReactNode } from "react";

import type { AuthenticatedAdmin } from "@/lib/admins";

import { AdminHeader } from "./admin-header";
import { AdminSidebar } from "./admin-sidebar";

type AdminShellProps = {
  admin: AuthenticatedAdmin;
  children: ReactNode;
};

export function AdminShell({ admin, children }: AdminShellProps) {
  return (
    <div className="min-h-screen">
      <div className="mx-auto flex w-full max-w-[1500px] flex-col gap-5 px-4 py-5 sm:px-6 xl:flex-row xl:px-8 xl:py-6">
        <AdminSidebar admin={admin} />

        <div className="flex min-h-[72vh] min-w-0 flex-1 flex-col gap-5">
          <AdminHeader admin={admin} />
          <main className="min-w-0 flex-1 pb-4">{children}</main>
        </div>
      </div>
    </div>
  );
}
