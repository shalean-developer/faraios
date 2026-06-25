import type { Metadata } from "next";
import { MailCheck } from "lucide-react";

import { AuthFormCard } from "@/components/auth/auth-form-card";
import { AuthPageShell } from "@/components/auth/auth-page-shell";
import { safeNextPath } from "@/lib/auth/safe-next-path";

import { VerifyEmailActions } from "./verify-email-actions";

export const metadata: Metadata = {
  title: "Verify Email | Shalean",
  description: "Confirm your email to activate your Shalean workspace.",
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
    <AuthPageShell>
      <AuthFormCard
        title="Check your email"
        subtitle="We've sent a verification link to your email. Click the link to activate your workspace and continue."
      >
        <div className="mb-6 flex justify-center">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-700"
            aria-hidden
          >
            <MailCheck className="h-7 w-7" />
          </div>
        </div>

        {safeEmail ? (
          <p className="mb-6 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center text-sm text-slate-700">
            We sent a link to: <span className="font-semibold">{safeEmail}</span>
          </p>
        ) : null}

        <VerifyEmailActions email={safeEmail} redirectTo={redirectTo} />
      </AuthFormCard>
    </AuthPageShell>
  );
}
