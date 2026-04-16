import type { Metadata } from "next";
import { FaraiAuthPage } from "@/components/auth/farai-auth-page";

export const metadata: Metadata = {
  title: "Sign up — FaraiOS",
  description: "Create your FaraiOS account.",
};

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <FaraiAuthPage
      initialMode="signup"
      redirectTo="/app"
      initialError={
        error === "auth"
          ? "Could not complete sign-up. Try again."
          : undefined
      }
    />
  );
}
