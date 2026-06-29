import { ModulePlaceholder } from "@/components/dashboard/module-placeholder";
import { modulePlaceholders } from "@/lib/dashboard-config";

export default function ReportsPage() {
  return <ModulePlaceholder content={modulePlaceholders.reports} />;
}
