import type { Metadata } from "next";

import { AuthFormCard } from "@/components/auth/auth-form-card";
import { AuthPageShell } from "@/components/auth/auth-page-shell";

import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  title: "Create New Password | Shalean",
  description: "Set a new password for your Shalean workspace.",
};

export default function ResetPasswordPage() {
  return (
    <AuthPageShell>
      <AuthFormCard
        title="Create a new password"
        subtitle="Choose a secure password to continue managing your Shalean workspace."
      >
        <ResetPasswordForm />
      </AuthFormCard>
    </AuthPageShell>
  );
}
