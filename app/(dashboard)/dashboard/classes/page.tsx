import { ModulePlaceholder } from "@/components/dashboard/module-placeholder";
import { modulePlaceholders } from "@/lib/dashboard-config";

export default function ClassesPage() {
  return <ModulePlaceholder content={modulePlaceholders.classes} />;
}
