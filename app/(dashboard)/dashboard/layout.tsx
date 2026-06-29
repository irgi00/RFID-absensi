import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/dashboard/admin-shell";
import { getCurrentAdmin } from "@/lib/admins";

type DashboardLayoutProps = {
  children: ReactNode;
};

export default async function DashboardLayout({
  children,
}: DashboardLayoutProps) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect("/login");
  }

  return <AdminShell admin={admin}>{children}</AdminShell>;
}
