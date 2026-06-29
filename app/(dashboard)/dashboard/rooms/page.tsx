import { ModulePlaceholder } from "@/components/dashboard/module-placeholder";
import { modulePlaceholders } from "@/lib/dashboard-config";

export default function RoomsPage() {
  return <ModulePlaceholder content={modulePlaceholders.rooms} />;
}
