import type { Metadata } from "next";
import { FaraiAuthPage } from "@/components/auth/farai-auth-page";
import { safeNextPath } from "@/lib/auth/safe-next-path";

export const metadata: Metadata = {
  title: "Sign up — FaraiOS",
  description: "Create your FaraiOS account and start building your business website.",
};

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  return (
    <FaraiAuthPage
      initialMode="signup"
      redirectTo={safeNextPath(next)}
      initialError={
        error === "auth"
          ? "Could not complete sign-up. Try again."
          : undefined
      }
    />
  );
}
