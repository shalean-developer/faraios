"use client";

import { useState } from "react";
import Link from "next/link";

type VerifyEmailActionsProps = {
  email: string | null;
};

export function VerifyEmailActions({ email }: VerifyEmailActionsProps) {
  const [isResending, setIsResending] = useState(false);
  const [resendMessage, setResendMessage] = useState<string | null>(null);
  const [resendError, setResendError] = useState<string | null>(null);

  const resendEmail = async () => {
    if (!email) {
      setResendError("Add your email in the URL to resend verification.");
      setResendMessage(null);
      return;
    }

    setIsResending(true);
    setResendError(null);
    setResendMessage(null);
    try {
      const response = await fetch("/api/auth/resend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = (await response.json()) as { error?: string };

      if (!response.ok) {
        setResendError(payload.error ?? "Could not resend verification email.");
        return;
      }

      setResendMessage("Email resent successfully.");
    } catch {
      setResendError("Could not resend verification email.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="mt-8 space-y-3">
      <Link
        href="/auth/sign-in"
        className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:brightness-110"
      >
        Go to Login
      </Link>

      <button
        type="button"
        onClick={() => {
          void resendEmail();
        }}
        disabled={isResending}
        className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isResending ? "Resending..." : "Resend email"}
      </button>

      <a
        href="https://mail.google.com"
        target="_blank"
        rel="noreferrer"
        className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50"
      >
        Open Gmail
      </a>

      {resendMessage ? (
        <p className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
          {resendMessage}
        </p>
      ) : null}
      {resendError ? (
        <p className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
          {resendError}
        </p>
      ) : null}
    </div>
  );
}
