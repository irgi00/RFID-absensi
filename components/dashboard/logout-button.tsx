"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ConfirmationModal } from "@/components/ui/confirmation-modal";

import { DashboardIcon } from "./dashboard-icon";

type LogoutButtonProps = {
  className?: string;
};

export function LogoutButton({ className = "" }: LogoutButtonProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleLogout() {
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
        cache: "no-store",
      });

      const data = (await response.json().catch(() => null)) as
        | {
            success?: boolean;
            message?: string;
          }
        | null;

      if (!response.ok || !data?.success) {
        throw new Error(data?.message ?? "Logout admin gagal diproses.");
      }

      setIsConfirmOpen(false);
      router.replace("/login");
      router.refresh();
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Sesi admin gagal diakhiri. Coba lagi beberapa saat lagi.",
      );
      setIsConfirmOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setErrorMessage("");
          setIsConfirmOpen(true);
        }}
        disabled={isSubmitting}
        className={[
          "inline-flex items-center justify-center gap-2 rounded-full border border-[color:var(--color-border)] bg-white px-5 py-3 text-sm font-semibold text-[color:var(--color-foreground)] transition hover:bg-[color:var(--color-surface-muted)] disabled:cursor-not-allowed disabled:opacity-60",
          className,
        ].join(" ")}
      >
        <DashboardIcon name="logout" className="h-4 w-4" />
        {isSubmitting ? "Keluar..." : "Keluar"}
      </button>

      {errorMessage ? (
        <div
          role="status"
          aria-live="polite"
          className="mt-3 rounded-[1rem] border border-[rgba(220,38,38,0.16)] bg-[rgba(254,242,242,0.96)] px-4 py-3 text-sm text-[color:var(--color-danger)]"
        >
          {errorMessage}
        </div>
      ) : null}

      <ConfirmationModal
        open={isConfirmOpen}
        title="Keluar dari dashboard?"
        description="Sesi admin akan diakhiri dan Anda akan diarahkan kembali ke halaman login."
        confirmLabel="Ya, keluar"
        cancelLabel="Tetap di dashboard"
        tone="danger"
        isLoading={isSubmitting}
        icon={<DashboardIcon name="logout" className="h-6 w-6" />}
        onCancel={() => {
          if (!isSubmitting) {
            setIsConfirmOpen(false);
          }
        }}
        onConfirm={handleLogout}
      />
    </>
  );
}
