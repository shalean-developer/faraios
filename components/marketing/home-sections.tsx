"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { DashboardModules } from "@/components/marketing/home/dashboard-modules";
import { EverythingIncluded } from "@/components/marketing/home/everything-included";
import { FinalCta } from "@/components/marketing/home/final-cta";
import { HomeFaq } from "@/components/marketing/home/home-faq";
import { HowItWorks } from "@/components/marketing/home/how-it-works";
import { IndustriesSection } from "@/components/marketing/home/industries-section";
import { PricingPreview } from "@/components/marketing/home/pricing-preview";
import { SocialProof } from "@/components/marketing/home/social-proof";
import { WebsiteHosting } from "@/components/marketing/home/website-hosting";

type HomeMarketingSectionsProps = {
  onGetStarted: () => void;
};

export function HomeMarketingSections({ onGetStarted }: HomeMarketingSectionsProps) {
  return (
    <>
      <SocialProof />
      <HowItWorks />
      <EverythingIncluded />
      <DashboardModules />
      <IndustriesSection />
      <WebsiteHosting />
      <PricingPreview />
      <HomeFaq />
      <section className="border-t border-gray-100 bg-white px-4 py-10 sm:px-6 lg:px-8">
        <p className="mx-auto max-w-xl text-center text-sm text-gray-500">
          Looking to book a local service?{" "}
          <Link
            href="/marketplace"
            className="font-semibold text-violet-600 transition-colors hover:text-violet-800"
          >
            Browse the FaraiOS marketplace
            <ArrowRight className="ml-0.5 inline h-3.5 w-3.5" />
          </Link>
        </p>
      </section>
      <FinalCta onGetStarted={onGetStarted} />
    </>
  );
}
