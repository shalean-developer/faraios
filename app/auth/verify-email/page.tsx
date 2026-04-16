import type { Metadata } from "next";
import { MailCheck } from "lucide-react";

import { VerifyEmailActions } from "./verify-email-actions";

export const metadata: Metadata = {
  title: "Verify Email — FaraiOS",
  description: "Confirm your email to continue.",
};

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  const safeEmail = typeof email === "string" && email.length > 0 ? email : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f9fc] px-4 py-12">
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
          activate your account.
        </p>
        {safeEmail ? (
          <p className="mt-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center text-sm text-slate-700">
            We sent a link to: <span className="font-semibold">{safeEmail}</span>
          </p>
        ) : null}

        <VerifyEmailActions email={safeEmail} />
      </section>
    </main>
  );
}
