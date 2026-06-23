import { Suspense } from "react";
import { ChevronRight, Globe } from "lucide-react";
import Link from "next/link";

import { OnboardingForm } from "@/components/onboarding/OnboardingForm";
import { Navbar } from "@/components/Navbar";
import { listFeatures } from "@/lib/services/features";
import { listIndustries } from "@/lib/services/industries";
import { GetStartedFallback } from "@/app/get-started/get-started-fallback";

export const metadata = {
  title: "Onboarding — FaraiOS",
  description: "Create your business workspace on FaraiOS.",
};

type SearchProps = {
  searchParams: Promise<{ plan?: string; redirect?: string; hostingPlan?: string }>;
};

export default async function OnboardingPage({ searchParams }: SearchProps) {
  const { plan, redirect, hostingPlan } = await searchParams;
  const [industries, features] = await Promise.all([
    listIndustries(),
    listFeatures(),
  ]);

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <Navbar />
      <div className="mx-auto max-w-3xl px-6 py-10 md:py-16">
        <nav
          className="mb-10 flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
          aria-label="Breadcrumb"
        >
          <Link href="/" className="inline-flex items-center gap-2 hover:text-[#7C3AED]">
            <Globe className="size-4 shrink-0 text-[#7C3AED]" aria-hidden />
            <span className="font-medium text-[#7C3AED]">Home</span>
          </Link>
          <ChevronRight className="size-4 shrink-0 opacity-60" aria-hidden />
          <span className="font-medium text-[#7C3AED]">Onboarding</span>
          <ChevronRight className="size-4 shrink-0 opacity-60" aria-hidden />
          <span className="text-foreground/80">Business setup</span>
        </nav>

        {industries.length === 0 ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
            <p className="font-semibold">Industries are not loaded</p>
            <p className="mt-2 text-amber-800">
              Check your Supabase connection and ensure the{" "}
              <code className="rounded bg-amber-100 px-1">industries</code> table
              is seeded. You need at least one industry before creating a workspace.
            </p>
          </div>
        ) : (
          <Suspense fallback={<GetStartedFallback />}>
            <OnboardingForm
              industries={industries}
              features={features}
              initialPlan={plan ?? null}
              redirectAfter={redirect ?? null}
              hostingPlan={hostingPlan ?? null}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
}
