"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Globe,
  HelpCircle,
  Server,
  Shield,
  Star,
  Zap,
} from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  landingContainer,
  landingGreenBtnLg,
  landingSectionPad,
  landingSectionPadCompact,
  marketingBadge,
} from "@/components/marketing/home/landing-styles";
import { fadeUp, stagger } from "@/components/marketing/home/motion";
import { MarketingCtaBand } from "@/components/marketing/marketing-cta-band";
import { MarketingPageHero } from "@/components/marketing/marketing-page-hero";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import { useMarketingNavAuth } from "@/components/marketing/use-marketing-nav-auth";
import {
  formatZar,
  hostingFaqItems,
  hostingPlans,
} from "@/lib/data/hosting";
import { companyHostingPath } from "@/lib/paths/company";
import { cn } from "@/lib/utils";

export function FaraiHostingPage() {
  const auth = useMarketingNavAuth();

  const ctaHref = (planSlug: string) => {
    if (auth.isAuthenticated && auth.companySlug) {
      return `${companyHostingPath(auth.companySlug)}?plan=${planSlug}`;
    }
    return `/auth/sign-up?next=${encodeURIComponent(`/onboarding?redirect=hosting&hostingPlan=${planSlug}`)}`;
  };

  return (
    <MarketingPageShell active="hosting">
      <main>
        <MarketingPageHero
          badge={
            <span className={marketingBadge}>
              <Server className="h-3.5 w-3.5" />
              FaraiOS Cloud Hosting
            </span>
          }
          title={
            <>
              Host your sites on <span className="text-emerald-700">FaraiOS</span>
            </>
          }
          description="Fast, secure cloud hosting with free SSL, daily backups, and global CDN. Buy a plan and go live in minutes."
        />

        <section className={cn(landingSectionPadCompact, "border-y border-slate-100 bg-white")}>
          <div className={landingContainer}>
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-center text-sm text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <Zap className="h-4 w-4 text-emerald-600" />
                <strong className="text-slate-900">99.9% uptime</strong>
              </span>
              <span className="hidden h-4 w-px bg-slate-200 sm:block" aria-hidden />
              <span className="inline-flex items-center gap-1.5">
                <Shield className="h-4 w-4 text-emerald-600" />
                <strong className="text-slate-900">Free SSL</strong>
              </span>
              <span className="hidden h-4 w-px bg-slate-200 sm:block" aria-hidden />
              <span className="inline-flex items-center gap-1.5">
                <Globe className="h-4 w-4 text-emerald-600" />
                <strong className="text-slate-900">Global CDN</strong>
              </span>
            </div>
          </div>
        </section>

        <section className={cn(landingSectionPad, "bg-white pt-12")}>
          <div className={landingContainer}>
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
                      ? "border-emerald-300 ring-2 ring-emerald-200"
                      : "border-slate-100"
                  )}
                >
                  {plan.is_popular ? (
                    <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-emerald-600 px-3 py-0.5 text-xs font-bold text-white">
                      <Star className="h-3 w-3 fill-white" />
                      Most popular
                    </span>
                  ) : null}

                  <h2 className="text-lg font-bold text-slate-900">{plan.name}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{plan.description}</p>

                  <div className="mt-5">
                    <p className="text-3xl font-extrabold text-slate-900">
                      {formatZar(plan.monthly_price)}
                      <span className="text-base font-medium text-slate-500">/mo</span>
                    </p>
                  </div>

                  <p className="mb-3 mt-6 text-xs font-bold uppercase tracking-widest text-emerald-600">
                    What&apos;s included
                  </p>
                  <ul className="flex-1 space-y-2.5">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2 text-sm text-slate-600">
                        <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        {feature}
                      </li>
                    ))}
                  </ul>

                  <Link
                    href={ctaHref(plan.slug)}
                    className={cn(
                      "mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all",
                      plan.is_popular
                        ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200 hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-xl hover:shadow-emerald-300"
                        : "border border-slate-200 bg-white text-slate-800 hover:border-emerald-200 hover:bg-emerald-50"
                    )}
                  >
                    {auth.isAuthenticated ? "Buy hosting" : "Get started"}
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
              className="mx-auto max-w-2xl pb-8"
            >
              <motion.div variants={fadeUp} className="mb-10 text-center">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-emerald-700">
                  <HelpCircle className="h-3.5 w-3.5" />
                  FAQ
                </span>
                <h2 className="mt-4 text-2xl font-extrabold text-slate-900 sm:text-3xl">
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
          </div>
        </section>

        <MarketingCtaBand
          title="Ready to host with FaraiOS?"
          description="Secure cloud hosting with SSL, backups, and support included."
        >
          <Link href={ctaHref("shared-pro")} className={cn(landingGreenBtnLg, "group")}>
            Buy Shared Pro
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </MarketingCtaBand>
      </main>
    </MarketingPageShell>
  );
}
