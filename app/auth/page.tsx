import type { Metadata } from "next";

import { FaraiAuthPage } from "@/components/auth/farai-auth-page";

export const metadata: Metadata = {
  title: "Sign in — FaraiOS",
  description: "Log in or create your FaraiOS account.",
};

function safeNext(raw: string | undefined): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/dashboard";
  return raw;
}

export default async function AuthPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  return (
    <FaraiAuthPage
      redirectTo={safeNext(next)}
      initialError={
        error === "auth"
          ? "Could not complete sign-in. Try again."
          : undefined
      }
    />
  );
}
