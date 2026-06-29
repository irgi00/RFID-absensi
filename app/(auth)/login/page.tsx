import Image from "next/image";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/auth/login-form";
import { getCurrentAdmin } from "@/lib/admins";

function AcademicLoginMark() {
  return (
    <div className="flex flex-col items-center">
      <div className="flex h-[7.5rem] w-[7.5rem] items-center justify-center overflow-hidden rounded-[2rem] shadow-[0_22px_48px_rgba(17,40,75,0.24)]">
        <Image
          src="/logo.png"
          alt="Logo Sistem Akses Akademik"
          priority
          className="h-full w-full object-cover"
        />
      </div>
      <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[rgba(17,40,75,0.08)] bg-white/72 px-4 py-2 text-sm font-semibold text-[color:var(--color-primary)] shadow-[0_10px_28px_rgba(15,23,42,0.04)] backdrop-blur">
        <svg
          className="h-4 w-4"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            d="M10 2.5L16 4.7V9.1C16 13.2 13.4 16 10 17.5C6.6 16 4 13.2 4 9.1V4.7L10 2.5Z"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M7.8 9.9L9.2 11.3L12.4 8.1"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Sistem Akses Akademik
      </div>
    </div>
  );
}

export default async function LoginPage() {
  const admin = await getCurrentAdmin();

  if (admin) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="w-full max-w-[540px]">
        <AcademicLoginMark />
        <div className="mt-8 rounded-[2rem] border border-[color:var(--color-border)] bg-white px-5 py-6 shadow-[0_28px_70px_rgba(15,23,42,0.08)] sm:px-8 sm:py-8">
          <div className="text-center">
            <h1 className="text-[2rem] font-semibold tracking-tight text-[color:var(--color-foreground)] sm:text-[2.2rem]">
              Masuk ke Dashboard
            </h1>
            <p className="mt-3 text-[15px] leading-7 text-[color:var(--color-muted)]">
              Kelola kehadiran mahasiswa secara real-time
            </p>
          </div>

          <div className="mt-8">
            <LoginForm />
          </div>
        </div>
      </div>
    </main>
  );
}
