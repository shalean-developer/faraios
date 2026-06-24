"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";

import { DashboardModules } from "@/components/marketing/home/dashboard-modules";
import { EverythingIncluded } from "@/components/marketing/home/everything-included";
import { HowItWorks } from "@/components/marketing/home/how-it-works";
import { fadeUp } from "@/components/marketing/home/motion";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";

export function FaraiFeaturesPage() {
  return (
    <MarketingPageShell active="features">
      <main>
        <section className="border-b border-gray-100 bg-gradient-to-br from-violet-50 via-white to-indigo-50 px-4 pb-12 pt-28 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-4xl text-center">
            <motion.div initial="hidden" animate="visible" variants={fadeUp}>
              <span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-1.5 text-xs font-semibold text-violet-700">
                <Sparkles className="h-3.5 w-3.5" />
                Platform features
              </span>
              <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
                Everything your service business needs
              </h1>
              <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-gray-600">
                Bookings, customers, payments, websites, SEO, marketing, and team
                tools — connected in one FaraiOS workspace.
              </p>
            </motion.div>
          </div>
        </section>

        <EverythingIncluded />
        <DashboardModules />
        <HowItWorks />

        <section className="px-4 pb-20 pt-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <div className="rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-700 p-8 shadow-2xl shadow-violet-200 sm:p-12">
              <h2 className="mb-4 text-2xl font-extrabold text-white sm:text-3xl">
                Ready to run your business from one workspace?
              </h2>
              <p className="mb-8 text-base text-violet-100 sm:text-lg">
                Start free and add modules as you grow.
              </p>
              <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link
                  href="/auth/sign-up"
                  className="group inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-bold text-violet-700 shadow-lg transition-colors hover:bg-violet-50"
                >
                  Start your workspace
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center justify-center rounded-xl border border-white/30 bg-white/10 px-8 py-3.5 text-base font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
                >
                  View pricing
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </MarketingPageShell>
  );
}
