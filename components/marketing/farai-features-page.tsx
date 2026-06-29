"use client";

import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";

import { DashboardModules } from "@/components/marketing/home/dashboard-modules";
import { EverythingIncluded } from "@/components/marketing/home/everything-included";
import { HowItWorks } from "@/components/marketing/home/how-it-works";
import { landingGreenBtnLg } from "@/components/marketing/home/landing-styles";
import { MarketingCtaBand } from "@/components/marketing/marketing-cta-band";
import { MarketingPageHero } from "@/components/marketing/marketing-page-hero";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { marketingBadge } from "@/components/marketing/home/landing-styles";
import { cn } from "@/lib/utils";

export function FaraiFeaturesPage() {
  return (
    <MarketingPageShell active="features">
      <main>
        <MarketingPageHero
          badge={
            <span className={marketingBadge}>
              <Sparkles className="h-3.5 w-3.5" />
              Platform features
            </span>
          }
          title="Everything your service business needs"
          description="Bookings, customers, payments, websites, SEO, marketing, and team tools — connected in one FaraiOS workspace."
        />

        <EverythingIncluded />
        <DashboardModules />
        <HowItWorks />

        <MarketingCtaBand
          title="Ready to run your business from one workspace?"
          description="Start free and add modules as you grow."
        >
          <Link href="/auth/sign-up" className={cn(landingGreenBtnLg, "group")}>
            Start your workspace
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white px-8 py-3.5 text-base font-semibold text-slate-800 shadow-sm transition-colors hover:border-emerald-200 hover:bg-emerald-50"
          >
            View pricing
          </Link>
        </MarketingCtaBand>
      </main>
    </MarketingPageShell>
  );
}
