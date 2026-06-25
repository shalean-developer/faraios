import type { Metadata } from "next";
import { FaraiAuthPage } from "@/components/auth/farai-auth-page";
import { safeNextPath } from "@/lib/auth/safe-next-path";

export const metadata: Metadata = {
  title: "Create Account | FaraiOS",
  description:
    "Create your FaraiOS workspace to manage bookings, customers, payments, websites, SEO, marketing, and your team.",
};

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string; plan?: string }>;
}) {
  const { error, next, plan } = await searchParams;
  const redirectTo =
    safeNextPath(next) ??
    (plan ? `/onboarding?plan=${encodeURIComponent(plan)}` : undefined);

  return (
    <FaraiAuthPage
      initialMode="signup"
      redirectTo={redirectTo}
      initialError={
        error === "auth"
          ? "Could not complete sign-up. Try again."
          : undefined
      }
    />
  );
}
