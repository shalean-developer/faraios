"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Globe, LayoutDashboard, Sparkles, Users } from "lucide-react";

import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { loadMarketingNavAuth } from "@/lib/auth/marketing-nav-auth";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.4, 0, 0.2, 1] as const },
  },
};

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
    desc: "Cleaning, beauty, tech support, tourism, trades, and more — industry presets on day one.",
  },
];

export function FaraiAboutPage() {
  const [navAuth, setNavAuth] = useState({
    isAuthenticated: false,
    companySlug: null as string | null,
    isPlatformAdmin: false,
  });

  useEffect(() => {
    loadMarketingNavAuth(getSupabaseBrowserClient()).then(setNavAuth);
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-white">
      <MarketingNav
        isAuthenticated={navAuth.isAuthenticated}
        companySlug={navAuth.companySlug}
        isPlatformAdmin={navAuth.isPlatformAdmin}
        onLogout={async () => {
          await getSupabaseBrowserClient().auth.signOut();
          window.location.href = "/";
        }}
      />

      <main className="px-4 pb-20 pt-28 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <motion.div initial="hidden" animate="visible" variants={fadeUp}>
            <span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-1.5 text-xs font-semibold text-violet-700">
              <Sparkles className="h-3.5 w-3.5" />
              About Shalean
            </span>
            <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
              The business operating system for local service teams
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-relaxed text-gray-600">
              Shalean helps service businesses run day-to-day operations — bookings,
              customers, quotes, invoices, payments, marketing, and reporting — from a
              single workspace. Websites and hosting are optional frontends that plug
              directly into your operations.
            </p>
          </motion.div>

          <motion.section
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="mt-16 grid gap-6 sm:grid-cols-3"
          >
            {VALUES.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-gray-100 bg-gray-50/80 p-6"
              >
                <item.icon className="h-6 w-6 text-violet-600" />
                <h2 className="mt-4 text-base font-semibold text-gray-900">{item.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{item.desc}</p>
              </div>
            ))}
          </motion.section>

          <motion.section
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="mt-16 rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-indigo-50/80 p-8 sm:p-10"
          >
            <h2 className="text-xl font-bold text-gray-900">Who we serve</h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-gray-600">
              Shalean is designed for owner-operators and small teams who sell services
              locally — from cleaning companies and spas to IT support and tour operators.
              Industry modules seed your booking forms, services, and growth defaults so
              you can start fast without rebuilding software for every vertical.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/auth/sign-up"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-200 transition hover:-translate-y-0.5"
              >
                Start your workspace
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/platform/contact"
                className="inline-flex items-center rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
              >
                Contact us
              </Link>
            </div>
          </motion.section>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
