import { ModulePlaceholder } from "@/components/dashboard/module-placeholder";
import { modulePlaceholders } from "@/lib/dashboard-config";

export default function LecturersPage() {
  return <ModulePlaceholder content={modulePlaceholders.lecturers} />;
}
