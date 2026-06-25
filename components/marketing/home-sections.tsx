"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { BookingSystemSection } from "@/components/marketing/home/booking-system-section";
import { ComparisonSection } from "@/components/marketing/home/comparison-section";
import { EverythingFeatureSection } from "@/components/marketing/home/everything-feature-section";
import { FeatureGridSection } from "@/components/marketing/home/feature-grid-section";
import { FinalCta } from "@/components/marketing/home/final-cta";
import { IndustriesSection } from "@/components/marketing/home/industries-section";
import { MobileFeaturesSection } from "@/components/marketing/home/mobile-features-section";
import { PaymentsSection } from "@/components/marketing/home/payments-section";
import { SocialProof } from "@/components/marketing/home/social-proof";
import { TestimonialSection } from "@/components/marketing/home/testimonial-section";

type HomeMarketingSectionsProps = {
  onGetStarted: () => void;
};

export function HomeMarketingSections({ onGetStarted }: HomeMarketingSectionsProps) {
  return (
    <>
      <SocialProof />
      <EverythingFeatureSection />
      <ComparisonSection />
      <BookingSystemSection />
      <FeatureGridSection />
      <TestimonialSection />
      <MobileFeaturesSection />
      <PaymentsSection />
      <IndustriesSection />
      <section className="border-t border-slate-100 bg-white px-4 py-10 sm:px-6 lg:px-8">
        <p className="mx-auto max-w-xl text-center text-sm text-slate-500">
          Looking to book a local service?{" "}
          <Link
            href="/marketplace"
            className="font-semibold text-emerald-600 transition-colors hover:text-emerald-800"
          >
            Browse the Shalean marketplace
            <ArrowRight className="ml-0.5 inline h-3.5 w-3.5" />
          </Link>
        </p>
      </section>
      <FinalCta onGetStarted={onGetStarted} />
    </>
  );
}
