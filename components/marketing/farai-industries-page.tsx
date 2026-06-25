"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Briefcase } from "lucide-react";

import { IndustriesSection } from "@/components/marketing/home/industries-section";
import { fadeUp } from "@/components/marketing/home/motion";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";

type Props = {
  highlightSlug?: string;
};

export function FaraiIndustriesPage({ highlightSlug }: Props) {
  const highlighted = highlightSlug?.trim() || undefined;

  return (
    <MarketingPageShell active="industries">
      <main>
        <section className="border-b border-gray-100 bg-gradient-to-br from-violet-50 via-white to-indigo-50 px-4 pb-12 pt-28 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <motion.div initial="hidden" animate="visible" variants={fadeUp}>
              <span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-1.5 text-xs font-semibold text-violet-700">
                <Briefcase className="h-3.5 w-3.5" />
                Industries we serve
              </span>
              <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
                Built for how your industry works
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-gray-600">
                Shalean ships with presets for cleaning, beauty, tourism, technology,
                trades, and more — so your workspace matches your business from day one.
              </p>
              {highlighted ? (
                <p className="mt-4 text-sm font-medium text-violet-700">
                  Showing details for your selected industry below.
                </p>
              ) : null}
            </motion.div>
          </div>
        </section>

        <IndustriesSection highlightSlug={highlighted} />

        <section className="px-4 pb-20 pt-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="rounded-3xl border border-violet-100 bg-violet-50/80 p-8 sm:p-12">
              <h2 className="mb-4 text-2xl font-extrabold text-gray-900 sm:text-3xl">
                Don&apos;t see your industry?
              </h2>
              <p className="mb-8 text-base text-gray-600">
                Shalean is flexible enough for most local service businesses. Start
                your workspace and customize services, pages, and workflows to fit.
              </p>
              <Link
                href="/auth/sign-up"
                className="group inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-8 py-3.5 text-base font-bold text-white shadow-lg transition-all hover:-translate-y-0.5"
              >
                Start your workspace
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
          </div>
        </section>
      </main>
    </MarketingPageShell>
  );
}
