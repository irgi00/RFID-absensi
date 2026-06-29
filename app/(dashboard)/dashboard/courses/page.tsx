import { ModulePlaceholder } from "@/components/dashboard/module-placeholder";
import { modulePlaceholders } from "@/lib/dashboard-config";

export default function CoursesPage() {
  return <ModulePlaceholder content={modulePlaceholders.courses} />;
}
