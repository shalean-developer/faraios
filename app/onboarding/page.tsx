import { Suspense } from "react";
import { ChevronRight, Globe } from "lucide-react";
import { OnboardingForm } from "@/components/onboarding/OnboardingForm";
import { Navbar } from "@/components/Navbar";
import { listFeatures } from "@/lib/services/features";
import { listIndustries } from "@/lib/services/industries";
import { GetStartedFallback } from "@/app/get-started/get-started-fallback";

export const metadata = {
  title: "Onboarding — FaraiOS",
  description: "Create your workspace and business setup.",
};

type SearchProps = {
  searchParams: Promise<{ plan?: string }>;
};

async function OnboardingContent({ plan }: { plan: string | undefined }) {
  const [industries, features] = await Promise.all([
    listIndustries(),
    listFeatures(),
  ]);

  return (
    <OnboardingForm
      industries={industries}
      features={features}
      initialPlan={plan ?? null}
    />
  );
}

export default async function OnboardingPage({ searchParams }: SearchProps) {
  const { plan } = await searchParams;
  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <Navbar />
      <div className="mx-auto max-w-3xl px-6 py-10 md:py-16">
        <nav
          className="mb-10 flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
          aria-label="Breadcrumb"
        >
          <Globe className="size-4 shrink-0 text-[#7C3AED]" aria-hidden />
          <span className="font-medium text-[#7C3AED]">Onboarding</span>
          <ChevronRight className="size-4 shrink-0 opacity-60" aria-hidden />
          <span className="text-foreground/80">Start Project</span>
        </nav>
        <Suspense fallback={<GetStartedFallback />}>
          <OnboardingContent plan={plan} />
        </Suspense>
      </div>
    </div>
  );
}
