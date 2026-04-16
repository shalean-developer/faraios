import type { Metadata } from "next";
import { FaraiAuthPage } from "@/components/auth/farai-auth-page";

export const metadata: Metadata = {
  title: "Sign in — FaraiOS",
  description: "Sign in to your FaraiOS account.",
};

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <FaraiAuthPage
      initialMode="login"
      redirectTo="/app"
      initialError={
        error === "auth"
          ? "Could not complete sign-in. Try again."
          : undefined
      }
    />
  );
}
