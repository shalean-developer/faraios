import type { Metadata } from "next";
import { Lock } from "lucide-react";

import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  title: "Choose New Password — FaraiOS",
  description: "Set a new password for your FaraiOS account.",
};

export default function ResetPasswordPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#f8f9fc] px-4 py-12">
      <section className="w-full max-w-md rounded-3xl border border-slate-100 bg-white p-8 shadow-xl shadow-slate-200/70">
        <div className="mb-6 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
            <Lock className="h-7 w-7" aria-hidden />
          </div>
        </div>

        <h1 className="text-center text-2xl font-extrabold tracking-tight text-slate-900">
          Choose a new password
        </h1>
        <p className="mt-3 text-center text-sm text-slate-600">
          Enter and confirm your new password below.
        </p>

        <div className="mt-8">
          <ResetPasswordForm />
        </div>
      </section>
    </main>
  );
}
