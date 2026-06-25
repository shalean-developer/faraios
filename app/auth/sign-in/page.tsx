import type { Metadata } from "next";
import { FaraiAuthPage } from "@/components/auth/farai-auth-page";
import { safeNextPath } from "@/lib/auth/safe-next-path";

export const metadata: Metadata = {
  title: "Sign In | Shalean",
  description: "Sign in to your Shalean workspace.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; reset?: string; next?: string }>;
}) {
  const { error, reset, next } = await searchParams;
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
        reset === "success"
          ? "Password updated. Sign in with your new password."
          : undefined
      }
    />
  );
}
