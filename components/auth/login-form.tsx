"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

function MailIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M4 7.5C4 6.67 4.67 6 5.5 6H18.5C19.33 6 20 6.67 20 7.5V16.5C20 17.33 19.33 18 18.5 18H5.5C4.67 18 4 17.33 4 16.5V7.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M5 8L12 13L19 8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M8 10V7.8C8 5.7 9.8 4 12 4C14.2 4 16 5.7 16 7.8V10"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <rect
        x="5"
        y="10"
        width="14"
        height="10"
        rx="2.4"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M12 14.2V15.8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M5 12H19"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M13 6L19 12L13 18"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M2.5 12C4.6 8.3 8 6 12 6C16 6 19.4 8.3 21.5 12C19.4 15.7 16 18 12 18C8 18 4.6 15.7 2.5 12Z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  ) : (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M3 3L21 21"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M10.6 6.2C11.1 6.1 11.5 6 12 6C16 6 19.4 8.3 21.5 12C20.7 13.4 19.7 14.6 18.6 15.6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14.1 14.3C13.6 14.8 12.8 15.1 12 15.1C10.3 15.1 8.9 13.7 8.9 12C8.9 11.2 9.2 10.5 9.7 9.9"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.1 17.2C4.7 16 3.5 14.2 2.5 12C3.7 9.9 5.2 8.3 7 7.1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const redirectTarget = useMemo(() => {
    const nextPath = searchParams.get("next");

    if (nextPath && nextPath.startsWith("/")) {
      return nextPath;
    }

    return "/dashboard";
  }, [searchParams]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrorMessage("");
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const identifier = String(formData.get("identifier") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          identifier,
          password,
        }),
      });

      const data = (await response.json().catch(() => null)) as
        | {
            message?: string;
          }
        | null;

      if (!response.ok) {
        setErrorMessage(data?.message ?? "Login admin gagal diproses.");
        return;
      }

      router.replace(redirectTarget);
      router.refresh();
    } catch {
      setErrorMessage("Koneksi ke server gagal. Coba lagi beberapa saat lagi.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <div className="space-y-2.5">
        <label
          htmlFor="identifier"
          className="text-sm font-semibold text-[color:var(--color-foreground)]"
        >
          Email
        </label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[color:var(--color-muted)]">
            <MailIcon />
          </span>
          <input
            id="identifier"
            name="identifier"
            type="text"
            autoComplete="username"
            required
            disabled={isSubmitting}
            placeholder="admin@universitas.ac.id"
            className="w-full rounded-[1rem] border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-muted)] py-4 pr-4 pl-12 text-base text-[color:var(--color-foreground)] outline-none transition placeholder:text-[color:var(--color-muted)] focus:border-[color:var(--color-accent)] focus:bg-white focus:ring-4 focus:ring-[rgba(29,78,216,0.12)] disabled:cursor-not-allowed disabled:opacity-70"
          />
        </div>
      </div>

      <div className="space-y-2.5">
        <div className="flex items-center justify-between gap-3">
          <label
            htmlFor="password"
            className="text-sm font-semibold text-[color:var(--color-foreground)]"
          >
            Kata Sandi
          </label>
        </div>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-[color:var(--color-muted)]">
            <LockIcon />
          </span>
          <input
            id="password"
            name="password"
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            required
            disabled={isSubmitting}
            placeholder="Masukkan kata sandi"
            className="w-full rounded-[1rem] border border-[color:var(--color-border-strong)] bg-[color:var(--color-surface-muted)] py-4 pr-14 pl-12 text-base text-[color:var(--color-foreground)] outline-none transition placeholder:text-[color:var(--color-muted)] focus:border-[color:var(--color-accent)] focus:bg-white focus:ring-4 focus:ring-[rgba(29,78,216,0.12)] disabled:cursor-not-allowed disabled:opacity-70"
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            className="absolute inset-y-0 right-4 flex items-center text-[color:var(--color-muted)] transition hover:text-[color:var(--color-primary)]"
            aria-label={showPassword ? "Sembunyikan kata sandi" : "Tampilkan kata sandi"}
          >
            <EyeIcon open={showPassword} />
          </button>
        </div>
      </div>

      {errorMessage ? (
        <div className="rounded-[1rem] border border-[rgba(220,38,38,0.16)] bg-[rgba(254,242,242,0.96)] px-4 py-3 text-sm leading-6 text-[rgb(153,27,27)]">
          {errorMessage}
        </div>
      ) : null}

      <label className="flex items-center gap-3 text-sm text-[color:var(--color-muted)]">
        <input
          type="checkbox"
          checked={rememberMe}
          onChange={(event) => setRememberMe(event.target.checked)}
          className="h-4 w-4 rounded-[0.35rem] border border-[color:var(--color-border-strong)] text-[color:var(--color-primary)] focus:ring-[color:var(--color-accent)]"
        />
        Ingat saya
      </label>

      <button
        type="submit"
        disabled={isSubmitting}
        className="inline-flex w-full items-center justify-center gap-2 rounded-[1rem] bg-[color:var(--color-primary)] px-5 py-4 text-base font-semibold text-white transition hover:bg-[color:var(--color-primary-strong)] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isSubmitting ? "Memproses..." : "Masuk"}
        <ArrowRightIcon />
      </button>


    </form>
  );
}
