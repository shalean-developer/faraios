"use client";

import { useState } from "react";
import Link from "next/link";

import { authCallbackUrl, authHref } from "@/lib/auth/safe-next-path";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

type VerifyEmailActionsProps = {
  email: string | null;
  redirectTo: string;
};

export function VerifyEmailActions({ email, redirectTo }: VerifyEmailActionsProps) {
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
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: {
          emailRedirectTo: `${window.location.origin}${authCallbackUrl(redirectTo)}`,
        },
      });

      if (error) {
        setResendError(error.message);
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
        href={authHref("/auth/sign-in", redirectTo)}
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
        suppressHydrationWarning
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
