type BrandMarkProps = {
  compact?: boolean;
  inverted?: boolean;
};

export function BrandMark({ compact = false, inverted = false }: BrandMarkProps) {
  const sizeClass = compact ? "h-11 w-11 rounded-2xl" : "h-14 w-14 rounded-[1.35rem]";
  const foregroundClass = inverted ? "text-white" : "text-[color:var(--color-primary)]";
  const subtitleClass = inverted
    ? "text-white/72"
    : "text-[color:var(--color-muted)]";

  return (
    <div className="flex items-center gap-4">
      <div
        className={[
          "relative flex items-center justify-center overflow-hidden",
          sizeClass,
          inverted
            ? "bg-[linear-gradient(135deg,rgba(255,255,255,0.16),rgba(255,255,255,0.08))] ring-1 ring-white/20"
            : "bg-[linear-gradient(145deg,#1d4ed8_0%,#16325b_100%)] shadow-[0_18px_40px_rgba(22,50,91,0.28)]",
        ].join(" ")}
      >
        <span className="absolute inset-[20%] rounded-[1rem] border border-white/24" />
        <span className="absolute inset-[31%] rounded-[0.85rem] border border-white/22" />
        <span className="absolute h-3.5 w-3.5 rounded-full bg-white shadow-[0_0_22px_rgba(255,255,255,0.48)]" />
      </div>
      <div className="min-w-0">
        <p className={`text-sm font-semibold uppercase tracking-[0.26em] ${subtitleClass}`}>
          Sistem Absensi
        </p>
        <p className={`text-lg font-semibold tracking-tight ${foregroundClass}`}>
          Mahasiswa RFID
        </p>
      </div>
    </div>
  );
}
