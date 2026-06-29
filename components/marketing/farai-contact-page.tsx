"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Mail, MapPin, MessageSquare } from "lucide-react";

import {
  landingContainer,
  landingGreenBtn,
  landingSectionPad,
  marketingCtaCard,
} from "@/components/marketing/home/landing-styles";
import { fadeUp } from "@/components/marketing/home/motion";
import { MarketingPageHero } from "@/components/marketing/marketing-page-hero";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { cn } from "@/lib/utils";

const SUPPORT_EMAIL = "support@faraios.com";

export function FaraiContactPage() {
  return (
    <MarketingPageShell>
      <main>
        <MarketingPageHero
          align="left"
          title="Contact FaraiOS"
          description="Questions about onboarding, pricing, or your workspace? Our team is here to help."
        />

        <section className={cn(landingSectionPad, "bg-white pt-0")}>
          <div className={cn(landingContainer, "max-w-3xl")}>
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="space-y-4"
            >
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="flex items-start gap-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-6 transition hover:border-emerald-200 hover:bg-emerald-50/50"
              >
                <Mail className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <div>
                  <p className="font-semibold text-slate-900">Email support</p>
                  <p className="mt-1 text-sm text-slate-600">{SUPPORT_EMAIL}</p>
                  <p className="mt-2 text-xs text-slate-500">
                    We typically respond within one business day.
                  </p>
                </div>
              </a>

              <div className="flex items-start gap-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-6">
                <MessageSquare className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <div>
                  <p className="font-semibold text-slate-900">Existing customers</p>
                  <p className="mt-1 text-sm text-slate-600">
                    Use the Support section in your workspace dashboard for account-specific
                    help, or submit a feature request from your dashboard.
                  </p>
                  <Link
                    href="/auth/sign-in"
                    className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-emerald-700 hover:text-emerald-900"
                  >
                    Sign in to your workspace
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-2xl border border-slate-100 bg-slate-50/80 p-6">
                <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                <div>
                  <p className="font-semibold text-slate-900">Based in South Africa</p>
                  <p className="mt-1 text-sm text-slate-600">
                    FaraiOS is built for local service businesses, with ZAR pricing and
                    Paystack billing support.
                  </p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className={cn("mt-12 text-center", marketingCtaCard)}
            >
              <p className="text-sm font-semibold text-emerald-700">Ready to get started?</p>
              <Link href="/auth/sign-up" className={cn(landingGreenBtn, "mt-4")}>
                Create your workspace
                <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.div>
          </div>
        </section>
      </main>
    </MarketingPageShell>
  );
}
