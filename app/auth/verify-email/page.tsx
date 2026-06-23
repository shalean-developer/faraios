import type { Metadata } from "next";
import Link from "next/link";
import { MailCheck, Zap } from "lucide-react";

import { safeNextPath } from "@/lib/auth/safe-next-path";

import { VerifyEmailActions } from "./verify-email-actions";

export const metadata: Metadata = {
  title: "Verify Email — FaraiOS",
  description: "Confirm your email to continue.",
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; next?: string }>;
}) {
  const { email, next } = await searchParams;
  const safeEmail = typeof email === "string" && email.length > 0 ? email : null;
  const redirectTo = safeNextPath(next);

  return (
    <div className="min-h-screen bg-[#f8f9fc] font-sans">
      <header className="border-b border-gray-100 bg-white/90 px-4 py-4 shadow-sm backdrop-blur-md sm:px-6">
        <div className="mx-auto flex max-w-md items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600">
              <Zap className="h-4 w-4 text-white" aria-hidden />
            </span>
            <span className="text-lg font-bold tracking-tight text-gray-900">
              FaraiOS
            </span>
          </Link>
          <Link
            href="/"
            className="text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            Home
          </Link>
        </div>
      </header>

      <main className="flex items-center justify-center px-4 py-12">
        <section className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/70">
          <div className="mb-6 flex justify-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
              <MailCheck className="h-7 w-7" aria-hidden />
            </div>
          </div>

          <h1 className="text-center text-2xl font-extrabold tracking-tight text-slate-900">
            Check your email
          </h1>
          <p className="mt-3 text-center text-sm text-slate-600">
            We&apos;ve sent a verification link to your email. Click the link to
            activate your account and continue.
          </p>
          {safeEmail ? (
            <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center text-sm text-slate-700">
              We sent a link to: <span className="font-semibold">{safeEmail}</span>
            </p>
          ) : null}

          <VerifyEmailActions email={safeEmail} redirectTo={redirectTo} />
        </section>
      </main>
    </div>
  );
}
