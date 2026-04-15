import { Suspense } from "react";
import { ChevronRight, Globe } from "lucide-react";

import { OnboardingForm } from "@/components/onboarding/OnboardingForm";
import { Navbar } from "@/components/Navbar";
import { listFeatures } from "@/lib/services/features";
import { listIndustries } from "@/lib/services/industries";

import { GetStartedFallback } from "./get-started-fallback";

export const metadata = {
  title: "Get Started — FaraiOS",
  description:
    "Tell us about your business. FaraiOS will generate your system and workspace.",
};

type SearchProps = {
  searchParams: Promise<{ plan?: string }>;
};

async function GetStartedContent({ plan }: { plan: string | undefined }) {
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

export default async function GetStartedPage({ searchParams }: SearchProps) {
  const { plan } = await searchParams;
  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <Navbar />
      <div className="mx-auto max-w-3xl px-6 py-10 md:py-16">
        <nav
          className="mb-10 flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
          aria-label="Breadcrumb"
        >
          <Globe
            className="size-4 shrink-0 text-[#7C3AED]"
            aria-hidden
          />
          <span className="font-medium text-[#7C3AED]">
            Custom Website Service
          </span>
          <ChevronRight className="size-4 shrink-0 opacity-60" aria-hidden />
          <span className="text-foreground/80">Submit Requirements</span>
        </nav>

        <header className="mb-10 space-y-4">
          <h1 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-[2.35rem] md:leading-tight">
            Let&apos;s Build Your Business System
          </h1>
          <p className="max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            Share a few details about your business. FaraiOS will generate your
            tailored website structure, recommended pages, and workspace—so our
            team (and your future dashboard) can move fast with clarity.
          </p>
        </header>

        <Suspense fallback={<GetStartedFallback />}>
          <GetStartedContent plan={plan} />
        </Suspense>
      </div>
    </div>
  );
}
