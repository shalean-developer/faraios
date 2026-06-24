"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, KeyRound } from "lucide-react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { authCallbackUrl } from "@/lib/auth/safe-next-path";

type ForgotPasswordFormProps = {
  initialEmail?: string | null;
};

export function ForgotPasswordForm({ initialEmail }: ForgotPasswordFormProps) {
  const router = useRouter();
  const [email, setEmail] = useState(initialEmail ?? "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    const trimmed = email.trim();
    if (!trimmed) {
      setError("Enter your email address.");
      return;
    }

    setPending(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        trimmed,
        { redirectTo: `${window.location.origin}${authCallbackUrl("/auth/reset-password")}` }
      );

      if (resetError) {
        setError(resetError.message);
        return;
      }

      setSent(true);
    } finally {
      setPending(false);
    }
  };

  if (sent) {
    return (
      <div className="space-y-4">
        <p className="rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          If an account exists for <strong>{email.trim()}</strong>, we sent a
          password reset link. Check your inbox and spam folder.
        </p>
        <Link
          href="/auth/sign-in"
          className="inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:brightness-110"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="space-y-4">
      {error ? (
        <p
          className="rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <div className="space-y-1.5">
        <label
          htmlFor="reset-email"
          className="block text-xs font-bold uppercase tracking-widest text-slate-500"
        >
          Email address
        </label>
        <input
          id="reset-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm text-slate-800 outline-none transition-all focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
          required
          autoComplete="email"
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:brightness-110 disabled:opacity-60"
      >
        <KeyRound className="h-4 w-4" aria-hidden />
        {pending ? "Sending link..." : "Send reset link"}
      </button>

      <button
        type="button"
        onClick={() => router.push("/auth/sign-in")}
        className="inline-flex w-full items-center justify-center gap-2 text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden />
        Back to sign in
      </button>
    </form>
  );
}
