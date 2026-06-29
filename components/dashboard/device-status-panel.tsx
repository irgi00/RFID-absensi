import type { DashboardDeviceStatus } from "@/lib/dashboard";

import { StatusBadge } from "@/components/ui/status-badge";

import { DashboardIcon } from "./dashboard-icon";

const dateTimeFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
});

function getDeviceBadge(device: DashboardDeviceStatus) {
  if (!device.isActive) {
    return {
      label: "Nonaktif",
      tone: "neutral" as const,
      helper: "Aktifkan perangkat saat siap digunakan.",
    };
  }

  if (device.lastSeenAt) {
    return {
      label: "Aktif",
      tone: "success" as const,
      helper: `Terakhir terlihat ${dateTimeFormatter.format(new Date(device.lastSeenAt))}`,
    };
  }

  return {
    label: "Siap dipasang",
    tone: "warning" as const,
    helper: "Belum ada aktivitas perangkat yang tercatat.",
  };
}

type DeviceStatusPanelProps = {
  devices: DashboardDeviceStatus[];
};

export function DeviceStatusPanel({ devices }: DeviceStatusPanelProps) {
  return (
    <article className="rounded-[1.75rem] bg-white p-6 shadow-[0_18px_40px_rgba(15,23,42,0.05)]">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-lg font-semibold text-[color:var(--color-foreground)]">
            Status Perangkat RFID
          </p>
          <p className="mt-2 text-sm leading-6 text-[color:var(--color-muted)]">
            Ringkasan singkat perangkat yang terdaftar beserta status terakhirnya.
          </p>
        </div>
        <div className="flex h-12 w-12 items-center justify-center rounded-[1rem] bg-[color:var(--color-primary-soft)] text-[color:var(--color-primary)]">
          <DashboardIcon name="devices" className="h-5 w-5" />
        </div>
      </div>

      {devices.length > 0 ? (
        <div className="mt-5 space-y-3">
          {devices.map((device) => {
            const badge = getDeviceBadge(device);
            const roomLabel = device.roomName
              ? `${device.roomName}${device.roomCode ? ` (${device.roomCode})` : ""}`
              : "Ruang belum diatur";

            return (
              <div
                key={device.id}
                className="rounded-[1.2rem] bg-[color:var(--color-surface-muted)] px-4 py-3.5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-[color:var(--color-foreground)]">
                      {device.deviceName}
                    </p>
                    <p className="mt-1 text-xs text-[color:var(--color-muted)]">
                      {device.deviceCode}  -  {roomLabel}
                    </p>
                  </div>
                  <StatusBadge label={badge.label} tone={badge.tone} />
                </div>
                <p className="mt-3 text-xs leading-6 text-[color:var(--color-muted)]">
                  {badge.helper}
                </p>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="mt-5 rounded-[1.2rem] bg-[color:var(--color-surface-muted)] px-4 py-5 text-sm text-[color:var(--color-muted)]">
          Belum ada perangkat RFID yang terdaftar.
        </div>
      )}
    </article>
  );
}
