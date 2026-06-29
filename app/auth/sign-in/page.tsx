import type { Metadata } from "next";
import { FaraiAuthPage } from "@/components/auth/farai-auth-page";
import { safeNextPath } from "@/lib/auth/safe-next-path";

export const metadata: Metadata = {
  title: "Sign In | FaraiOS",
  description: "Sign in to your FaraiOS workspace.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reset?: string; next?: string; reason?: string }>;
}) {
  const { error, reset, next, reason } = await searchParams;
  return (
    <FaraiAuthPage
      initialMode="login"
      redirectTo={safeNextPath(next)}
      initialError={
        error === "auth"
          ? "Could not complete sign-in. Try again."
          : undefined
      }
      initialInfo={
        reason === "session-expired"
          ? "Your session expired. Please sign in again."
          : reset === "success"
            ? "Password updated. Sign in with your new password."
            : undefined
      }
    />
  );
}
