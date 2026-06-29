import { ModulePlaceholder } from "@/components/dashboard/module-placeholder";
import { modulePlaceholders } from "@/lib/dashboard-config";

export default function SchedulesPage() {
  return <ModulePlaceholder content={modulePlaceholders.schedules} />;
}
