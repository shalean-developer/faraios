"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Globe, LayoutDashboard, Sparkles, Users } from "lucide-react";

import {
  landingContainer,
  landingGreenBtn,
  landingSectionPad,
  landingSectionTitle,
  marketingBadge,
  marketingCtaCard,
} from "@/components/marketing/home/landing-styles";
import { fadeUp } from "@/components/marketing/home/motion";
import { MarketingPageHero } from "@/components/marketing/marketing-page-hero";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { cn } from "@/lib/utils";

const VALUES = [
  {
    icon: LayoutDashboard,
    title: "Operations first",
    desc: "Bookings, customers, services, and team workflows in one workspace — not scattered tools.",
  },
  {
    icon: Globe,
    title: "Websites as a channel",
    desc: "Optional done-for-you sites and hosting connect to your live booking and lead pipeline.",
  },
  {
    icon: Users,
    title: "Built for service teams",
    desc: "Cleaning, electrical, tech support, tourism, trades, and more — industry presets on day one.",
  },
];

export function FaraiAboutPage() {
  return (
    <MarketingPageShell>
      <main>
        <MarketingPageHero
          align="left"
          badge={
            <span className={marketingBadge}>
              <Sparkles className="h-3.5 w-3.5" />
              About FaraiOS
            </span>
          }
          title="The business operating system for local service teams"
          description="FaraiOS helps service businesses run day-to-day operations — bookings, customers, quotes, invoices, payments, marketing, and reporting — from a single workspace. Websites and hosting are optional frontends that plug directly into your operations."
        />

        <section className={cn(landingSectionPad, "bg-white")}>
          <div className={landingContainer}>
            <motion.section
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className="grid gap-6 sm:grid-cols-3"
            >
              {VALUES.map((item) => (
                <div
                  key={item.title}
                  className="rounded-2xl border border-slate-100 bg-slate-50/80 p-6"
                >
                  <item.icon className="h-6 w-6 text-emerald-600" />
                  <h2 className="mt-4 text-base font-semibold text-slate-900">{item.title}</h2>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.desc}</p>
                </div>
              ))}
            </motion.section>

            <motion.section
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={fadeUp}
              className={cn("mt-16", marketingCtaCard, "text-left")}
            >
              <h2 className={landingSectionTitle}>Who we serve</h2>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
                FaraiOS is designed for owner-operators and small teams who sell services
                locally — from cleaning companies and electricians to IT support and tour
                operators. Industry modules seed your booking forms, services, and growth
                defaults so you can start fast without rebuilding software for every vertical.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/auth/sign-up" className={landingGreenBtn}>
                  Start your workspace
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/platform/contact"
                  className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Contact us
                </Link>
              </div>
            </motion.section>
          </div>
        </section>
      </main>
    </MarketingPageShell>
  );
}
