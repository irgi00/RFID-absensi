import { ModulePlaceholder } from "@/components/dashboard/module-placeholder";
import { modulePlaceholders } from "@/lib/dashboard-config";

export default function DevicesPage() {
  return <ModulePlaceholder content={modulePlaceholders.devices} />;
}
