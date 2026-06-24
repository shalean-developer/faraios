import type { Metadata } from "next";

import { AuthFormCard } from "@/components/auth/auth-form-card";
import { AuthPageShell } from "@/components/auth/auth-page-shell";

import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = {
  title: "Reset Password | FaraiOS",
  description:
    "Request a secure password reset link for your FaraiOS workspace.",
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
    <AuthPageShell>
      <AuthFormCard
        title="Reset your password"
        subtitle="Enter your email and we'll send you a secure link to access your workspace."
      >
        <ForgotPasswordForm initialEmail={initialEmail} />
      </AuthFormCard>
    </AuthPageShell>
  );
}
