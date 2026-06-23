import type { Metadata } from "next";
import { KeyRound } from "lucide-react";

import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = {
  title: "Reset Password — FaraiOS",
  description: "Request a password reset link for your FaraiOS account.",
};

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  const initialEmail =
    typeof email === "string" && email.length > 0 ? email : null;

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f9fc] px-4 py-12">
      <section className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/70">
        <div className="mb-6 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
            <KeyRound className="h-7 w-7" aria-hidden />
          </div>
        </div>

        <h1 className="text-center text-2xl font-extrabold tracking-tight text-slate-900">
          Reset your password
        </h1>
        <p className="mt-3 text-center text-sm text-slate-600">
          Enter your email and we&apos;ll send you a link to choose a new
          password.
        </p>

        <div className="mt-8">
          <ForgotPasswordForm initialEmail={initialEmail} />
        </div>
      </section>
    </main>
  );
}
