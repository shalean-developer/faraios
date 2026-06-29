"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Briefcase } from "lucide-react";

import { IndustriesSection } from "@/components/marketing/home/industries-section";
import { landingGreenBtnLg, marketingBadge } from "@/components/marketing/home/landing-styles";
import { fadeUp } from "@/components/marketing/home/motion";
import { MarketingCtaBand } from "@/components/marketing/marketing-cta-band";
import { MarketingPageHero } from "@/components/marketing/marketing-page-hero";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { cn } from "@/lib/utils";

type Props = {
  highlightSlug?: string;
};

export function FaraiIndustriesPage({ highlightSlug }: Props) {
  const highlighted = highlightSlug?.trim() || undefined;

  return (
    <MarketingPageShell active="industries">
      <main>
        <MarketingPageHero
          badge={
            <span className={marketingBadge}>
              <Briefcase className="h-3.5 w-3.5" />
              Industries we serve
            </span>
          }
          title="Built for how your industry works"
          description="FaraiOS ships with presets for cleaning, electrical, tourism, technology, trades, and more — so your workspace matches your business from day one."
        >
          {highlighted ? (
            <motion.p
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              className="mt-4 text-sm font-medium text-emerald-700"
            >
              Showing details for your selected industry below.
            </motion.p>
          ) : null}
        </MarketingPageHero>

        <IndustriesSection highlightSlug={highlighted} />

        <MarketingCtaBand
          title="Don't see your industry?"
          description="FaraiOS is flexible enough for most local service businesses. Start your workspace and customize services, pages, and workflows to fit."
        >
          <Link href="/auth/sign-up" className={cn(landingGreenBtnLg, "group")}>
            Start your workspace
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </MarketingCtaBand>
      </main>
    </MarketingPageShell>
  );
}
