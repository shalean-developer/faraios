"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Mail, MapPin, MessageSquare } from "lucide-react";
import { useEffect, useState } from "react";

import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { loadMarketingNavAuth } from "@/lib/auth/marketing-nav-auth";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.4, 0, 0.2, 1] as const },
  },
};

const SUPPORT_EMAIL = "support@faraios.com";

export function FaraiContactPage() {
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
        <div className="mx-auto max-w-3xl">
          <motion.div initial="hidden" animate="visible" variants={fadeUp}>
            <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-5xl">
              Contact FaraiOS
            </h1>
            <p className="mt-4 text-lg text-gray-600">
              Questions about onboarding, pricing, or your workspace? Our team is here to
              help.
            </p>
          </motion.div>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={fadeUp}
            className="mt-12 space-y-4"
          >
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="flex items-start gap-4 rounded-2xl border border-gray-100 bg-gray-50/80 p-6 transition hover:border-violet-200 hover:bg-violet-50/50"
            >
              <Mail className="mt-0.5 h-5 w-5 shrink-0 text-violet-600" />
              <div>
                <p className="font-semibold text-gray-900">Email support</p>
                <p className="mt-1 text-sm text-gray-600">{SUPPORT_EMAIL}</p>
                <p className="mt-2 text-xs text-gray-500">
                  We typically respond within one business day.
                </p>
              </div>
            </a>

            <div className="flex items-start gap-4 rounded-2xl border border-gray-100 bg-gray-50/80 p-6">
              <MessageSquare className="mt-0.5 h-5 w-5 shrink-0 text-violet-600" />
              <div>
                <p className="font-semibold text-gray-900">Existing customers</p>
                <p className="mt-1 text-sm text-gray-600">
                  Use the Support section in your workspace dashboard for account-specific
                  help, or submit a feature request from your dashboard.
                </p>
                <Link
                  href="/auth/sign-in"
                  className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-violet-700 hover:text-violet-900"
                >
                  Sign in to your workspace
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>

            <div className="flex items-start gap-4 rounded-2xl border border-gray-100 bg-gray-50/80 p-6">
              <MapPin className="mt-0.5 h-5 w-5 shrink-0 text-violet-600" />
              <div>
                <p className="font-semibold text-gray-900">Based in South Africa</p>
                <p className="mt-1 text-sm text-gray-600">
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
            className="mt-12 rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-indigo-50/80 p-8 text-center"
          >
            <p className="text-sm font-semibold text-violet-700">Ready to get started?</p>
            <Link
              href="/auth/sign-up"
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-200"
            >
              Create your workspace
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </div>
      </main>

      <MarketingFooter />
    </div>
  );
}
