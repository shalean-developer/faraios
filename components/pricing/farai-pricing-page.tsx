"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  CreditCard,
  Globe,
  Headphones,
  HelpCircle,
  Lock,
  Sparkles,
  Star,
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
  faqItems,
  formatZar,
  pricingPlans,
  trustBadges,
  type TrustBadgeRecord,
} from "@/lib/data/pricing";
import { loadMarketingNavAuth } from "@/lib/auth/marketing-nav-auth";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

function trustIcon(icon: TrustBadgeRecord["icon"]) {
  const className = "h-5 w-5 text-violet-600";
  switch (icon) {
    case "lock":
      return <Lock className={className} />;
    case "badge":
      return <BadgeCheck className={className} />;
    case "headphones":
      return <Headphones className={className} />;
    case "globe":
      return <Globe className={className} />;
    case "card":
      return <CreditCard className={className} />;
    default:
      return null;
  }
}

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

export function FaraiPricingPage() {
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

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-white font-sans">
      <MarketingNav
        isAuthenticated={isAuthenticated}
        companySlug={companySlug}
        isPlatformAdmin={isPlatformAdmin}
        active="pricing"
        onLogout={handleLogout}
      />

      <main className="mx-auto w-full max-w-6xl px-4 pb-8 pt-24 sm:px-6 lg:px-8">
        <motion.section
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="relative overflow-hidden pb-14 pt-8 text-center"
        >
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-violet-50 via-white to-indigo-50" />
          <div className="relative">
            <motion.div variants={fadeUp} className="mb-5">
              <span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-100 px-4 py-1.5 text-xs font-semibold text-violet-700">
                <Sparkles className="h-3.5 w-3.5" />
                Simple, transparent pricing
              </span>
            </motion.div>

            <motion.h1
              variants={fadeUp}
              className="mb-5 text-4xl font-extrabold leading-tight tracking-tight text-gray-900 sm:text-5xl lg:text-6xl"
            >
              Invest in your{" "}
              <span className="bg-gradient-to-r from-violet-600 to-indigo-600 bg-clip-text text-transparent">
                digital future
              </span>
            </motion.h1>

            <motion.p
              variants={fadeUp}
              className="mx-auto max-w-2xl text-lg leading-relaxed text-gray-500 sm:text-xl"
            >
              Every plan includes a professionally crafted website built for your
              business. Choose the package that fits your growth stage.
            </motion.p>
          </div>
        </motion.section>

        <section className="mb-12 border-y border-gray-100 py-8">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-center text-sm text-gray-600">
            <span>
              Live in as little as <strong className="text-gray-900">14 days</strong>
            </span>
            <span className="hidden h-4 w-px bg-gray-200 sm:block" aria-hidden />
            <span>
              <strong className="text-gray-900">No hidden fees</strong>
            </span>
            <span className="hidden h-4 w-px bg-gray-200 sm:block" aria-hidden />
            <span>
              <strong className="text-gray-900">Dedicated support</strong>
            </span>
          </div>
        </section>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="mb-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-5"
        >
          {trustBadges.map((badge) => (
            <motion.div
              key={badge.id}
              variants={fadeUp}
              className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50">
                {trustIcon(badge.icon)}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{badge.label}</p>
                <p className="mt-0.5 text-xs text-gray-500">{badge.sub}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="mb-20 grid grid-cols-1 gap-6 md:grid-cols-3"
        >
          {pricingPlans.map((plan) => (
            <motion.article
              key={plan.id}
              variants={fadeUp}
              className={cn(
                "relative flex flex-col rounded-2xl border bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
                plan.is_popular
                  ? "border-violet-300 ring-2 ring-violet-200"
                  : "border-gray-100"
              )}
            >
              {plan.is_popular ? (
                <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-violet-600 px-3 py-0.5 text-xs font-bold text-white">
                  <Star className="h-3 w-3 fill-white" />
                  Most popular
                </span>
              ) : null}

              <h2 className="text-lg font-bold text-gray-900">{plan.name}</h2>
              <p className="mt-1 text-sm leading-relaxed text-gray-500">
                {plan.description}
              </p>

              <div className="mt-5 space-y-1">
                <p className="text-3xl font-extrabold text-gray-900">
                  {formatZar(plan.monthly_price)}
                  <span className="text-base font-medium text-gray-500">/mo</span>
                </p>
                <p className="text-xs text-gray-400">
                  {formatZar(plan.setup_price)} one-time setup
                </p>
              </div>

              <p className="mb-3 mt-6 text-xs font-bold uppercase tracking-widest text-violet-600">
                What&apos;s included
              </p>
              <ul className="flex-1 space-y-2.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm text-gray-600">
                    <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href={`/auth/sign-up?next=${encodeURIComponent(`/onboarding?plan=${plan.slug}`)}`}
                className={cn(
                  "mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all",
                  plan.is_popular
                    ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-violet-300"
                    : "border border-gray-200 bg-white text-gray-800 hover:border-violet-200 hover:bg-violet-50"
                )}
              >
                Get Started
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
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-violet-700">
              <HelpCircle className="h-3.5 w-3.5" />
              FAQ
            </span>
            <h2 className="mt-4 text-2xl font-extrabold text-gray-900 sm:text-3xl">
              Got questions?
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Everything you need to know before getting started.
            </p>
          </motion.div>

          <Accordion className="space-y-3">
            {faqItems.map((faq) => (
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
            className="rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-700 p-10 text-center shadow-2xl shadow-violet-200 sm:p-12"
          >
            <h3 className="text-2xl font-extrabold text-white sm:text-3xl">
              Ready to launch your website?
            </h3>
            <p className="mx-auto mt-4 max-w-md text-base text-violet-100">
              Join businesses that trust FaraiOS to build their online presence —
              live in as little as 14 days.
            </p>
            <Link
              href="/auth/sign-up?next=/onboarding%3Fplan%3Dbusiness"
              className="group mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-bold text-violet-700 shadow-lg transition-colors hover:bg-violet-50"
            >
              Get Started — Most Popular
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </motion.div>
        </motion.section>
      </main>

      <MarketingFooter />
    </div>
  );
}
