import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-10 sm:px-6 lg:px-8">
      <section className="grid w-full gap-8 overflow-hidden rounded-[36px] border border-[color:var(--color-border)] bg-[color:var(--color-surface)] p-8 shadow-[0_24px_80px_rgba(15,118,110,0.08)] lg:grid-cols-[1.25fr_0.9fr] lg:p-10">
        <div className="space-y-6">
          <span className="inline-flex rounded-full bg-[color:var(--color-accent-soft)] px-4 py-2 text-sm font-semibold text-[color:var(--color-accent-strong)]">
            Tahap 2 sedang dibangun
          </span>
          <div className="space-y-4">
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-[color:var(--color-foreground)] sm:text-5xl">
              Fondasi web absensi RFID sudah disiapkan untuk Next.js App Router
              dan Neon PostgreSQL.
            </h1>
            <p className="max-w-2xl text-base leading-8 text-[color:var(--color-muted)] sm:text-lg">
              Halaman ini menjadi pintu awal proyek Sistem Absensi Mahasiswa
              RFID. Pada tahap kedua, fokusnya ada pada koneksi database,
              autentikasi admin, dan dashboard yang mulai membaca data nyata.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full bg-[color:var(--color-accent)] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--color-accent-strong)]"
            >
              Login Admin
            </Link>
            <a
              href="#cakupan"
              className="inline-flex items-center justify-center rounded-full border border-[color:var(--color-border)] px-6 py-3 text-sm font-semibold text-[color:var(--color-foreground)] transition hover:bg-[color:var(--color-surface-muted)]"
            >
              Lihat Cakupan Tahap 2
            </a>
          </div>
        </div>

        <div
          id="cakupan"
          className="rounded-[28px] bg-[linear-gradient(160deg,rgba(15,118,110,0.12),rgba(255,255,255,0.92))] p-6"
        >
          <div className="rounded-[24px] border border-white/70 bg-white/85 p-6 shadow-sm backdrop-blur">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-[color:var(--color-muted)]">
              Cakupan saat ini
            </p>
            <ul className="mt-5 space-y-4 text-sm leading-7 text-[color:var(--color-foreground)]">
              <li>Struktur App Router untuk area dashboard dan halaman modul.</li>
              <li>Skema SQL Neon lengkap untuk entitas inti absensi RFID.</li>
              <li>Koneksi database langsung dengan `@neondatabase/serverless`.</li>
              <li>Autentikasi admin awal dan dashboard berbahasa Indonesia.</li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}
