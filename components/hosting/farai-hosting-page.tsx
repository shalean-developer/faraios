"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Globe,
  HelpCircle,
  Server,
  Shield,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import {
  formatZar,
  hostingFaqItems,
  hostingPlans,
} from "@/lib/data/hosting";
import { companyHostingPath } from "@/lib/paths/company";
import { loadMarketingNavAuth } from "@/lib/auth/marketing-nav-auth";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.4, 0, 0.2, 1] as const },
  },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
};

export function FaraiHostingPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [companySlug, setCompanySlug] = useState<string | null>(null);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadAuth = async () => {
      const supabase = getSupabaseBrowserClient();
      const auth = await loadMarketingNavAuth(supabase);

      if (!mounted) return;
      setIsAuthenticated(auth.isAuthenticated);
      setCompanySlug(auth.companySlug);
      setIsPlatformAdmin(auth.isPlatformAdmin);
    };

    void loadAuth();
    return () => {
      mounted = false;
    };
  }, []);

  const handleLogout = async () => {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
    setIsAuthenticated(false);
    setCompanySlug(null);
    setIsPlatformAdmin(false);
    window.location.href = "/";
  };

  const ctaHref = (planSlug: string) => {
    if (isAuthenticated && companySlug) {
      return `${companyHostingPath(companySlug)}?plan=${planSlug}`;
    }
    return `/auth/sign-up?next=${encodeURIComponent(`/onboarding?redirect=hosting&hostingPlan=${planSlug}`)}`;
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-white font-sans">
      <MarketingNav
        isAuthenticated={isAuthenticated}
        companySlug={companySlug}
        isPlatformAdmin={isPlatformAdmin}
        active="hosting"
        onLogout={handleLogout}
      />

      <main className="mx-auto w-full max-w-6xl px-4 pb-8 pt-24 sm:px-6 lg:px-8">
        <motion.section
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="relative overflow-hidden pb-14 pt-8 text-center"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-indigo-50 via-white to-violet-50" />
          <div className="relative">
            <motion.div variants={fadeUp} className="mb-5">
              <span className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-indigo-100 px-4 py-1.5 text-xs font-semibold text-indigo-700">
                <Server className="h-3.5 w-3.5" />
                FaraiOS Cloud Hosting
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="mb-5 text-4xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-5xl lg:text-6xl"
            >
              Host your sites on{" "}
              <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                FaraiOS
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mx-auto max-w-2xl text-lg leading-relaxed text-gray-500 sm:text-xl"
            >
              Fast, secure cloud hosting with free SSL, daily backups, and global CDN.
              Buy a plan and go live in minutes.
            </motion.p>
          </div>
        </motion.section>

        <section className="mb-12 border-y border-gray-100 py-8">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-center text-sm text-gray-600">
            <span className="inline-flex items-center gap-1.5">
              <Zap className="h-4 w-4 text-indigo-600" />
              <strong className="text-gray-900">99.9% uptime</strong>
            </span>
            <span className="hidden h-4 w-px bg-gray-200 sm:block" aria-hidden />
            <span className="inline-flex items-center gap-1.5">
              <Shield className="h-4 w-4 text-indigo-600" />
              <strong className="text-gray-900">Free SSL</strong>
            </span>
            <span className="hidden h-4 w-px bg-gray-200 sm:block" aria-hidden />
            <span className="inline-flex items-center gap-1.5">
              <Globe className="h-4 w-4 text-indigo-600" />
              <strong className="text-gray-900">Global CDN</strong>
            </span>
          </div>
        </section>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="mb-20 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4"
        >
          {hostingPlans.map((plan) => (
            <motion.article
              key={plan.id}
              variants={fadeUp}
              className={cn(
                "relative flex flex-col rounded-2xl border bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
                plan.is_popular
                  ? "border-indigo-300 ring-2 ring-indigo-200"
                  : "border-gray-100"
              )}
            >
              {plan.is_popular ? (
                <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-indigo-600 px-3 py-0.5 text-xs font-bold text-white">
                  <Star className="h-3 w-3 fill-white" />
                  Most popular
                </span>
              ) : null}

              <h2 className="text-lg font-bold text-gray-900">{plan.name}</h2>
              <p className="mt-1 text-sm leading-relaxed text-gray-500">
                {plan.description}
              </p>

              <div className="mt-5">
                <p className="text-3xl font-extrabold text-gray-900">
                  {formatZar(plan.monthly_price)}
                  <span className="text-base font-medium text-gray-500">/mo</span>
                </p>
              </div>

              <p className="mb-3 mt-6 text-xs font-bold uppercase tracking-widest text-indigo-600">
                What&apos;s included
              </p>
              <ul className="flex-1 space-y-2.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-gray-600">
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href={ctaHref(plan.slug)}
                className={cn(
                  "mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all",
                  plan.is_popular
                    ? "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-300"
                    : "border border-gray-200 bg-white text-gray-800 hover:border-indigo-200 hover:bg-indigo-50"
                )}
              >
                {isAuthenticated ? "Buy hosting" : "Get started"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </motion.article>
          ))}
        </motion.div>

        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="mx-auto max-w-2xl pb-16"
        >
          <motion.div variants={fadeUp} className="mb-10 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-indigo-700">
              <HelpCircle className="h-3.5 w-3.5" />
              FAQ
            </span>
            <h2 className="mt-4 text-2xl font-extrabold text-gray-900 sm:text-3xl">
              Hosting questions
            </h2>
          </motion.div>

          <Accordion className="space-y-3">
            {hostingFaqItems.map((faq) => (
              <AccordionItem key={faq.id} value={faq.id}>
                <AccordionTrigger>{faq.question}</AccordionTrigger>
                <AccordionContent>{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.section>

        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="pb-12"
        >
          <motion.div
            variants={fadeUp}
            className="rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-700 p-10 text-center shadow-2xl shadow-indigo-200 sm:p-12"
          >
            <h3 className="text-2xl font-extrabold text-white sm:text-3xl">
              Ready to host with FaraiOS?
            </h3>
            <p className="mx-auto mt-4 max-w-md text-base text-indigo-100">
              Secure cloud hosting with SSL, backups, and support included.
            </p>
            <Link
              href={ctaHref("shared-pro")}
              className="group mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-bold text-indigo-700 shadow-lg transition-colors hover:bg-indigo-50"
            >
              Buy Shared Pro
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </motion.section>
      </main>

      <MarketingFooter />
    </div>
  );
}
