"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  CreditCard,
  Globe,
  Headphones,
  HelpCircle,
  Lock,
  MessageCircle,
  Sparkles,
  Star,
} from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { MarketingCtaBand } from "@/components/marketing/marketing-cta-band";
import { MarketingPageHero } from "@/components/marketing/marketing-page-hero";
import { MarketingPageShell } from "@/components/marketing/marketing-page-shell";
import {
  landingContainer,
  landingGreenBtnLg,
  landingSectionPad,
  landingSectionPadCompact,
  marketingBadge,
} from "@/components/marketing/home/landing-styles";
import {
  faqItems,
  formatServicePrice,
  formatZar,
  growthServices,
  hostingAddOns,
  pricingPlans,
  trustBadges,
  websiteServices,
  type TrustBadgeRecord,
} from "@/lib/data/pricing";
import { cn } from "@/lib/utils";

function trustIcon(icon: TrustBadgeRecord["icon"]) {
  const className = "h-5 w-5 text-emerald-600";
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

function signUpHref(planSlug: string) {
  return `/auth/sign-up?plan=${encodeURIComponent(planSlug)}`;
}

export function FaraiPricingPage() {
  return (
    <MarketingPageShell active="pricing">
      <main>
        <MarketingPageHero
          badge={
            <span className={marketingBadge}>
              <Sparkles className="h-3.5 w-3.5" />
              Business Operating System
            </span>
          }
          title={
            <>
              Simple pricing for{" "}
              <span className="text-emerald-700">service businesses</span>
            </>
          }
          description="Start with the tools you need today. Add websites, hosting, SEO, and marketing as your business grows."
        />

        <section className={cn(landingSectionPadCompact, "border-y border-slate-100 bg-white")}>
          <div className={landingContainer}>
            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-center text-sm text-slate-600">
            <span>
              <strong className="text-gray-900">Workspace first</strong> — no website required
            </span>
            <span className="hidden h-4 w-px bg-gray-200 sm:block" aria-hidden />
            <span>
              <strong className="text-gray-900">No hidden fees</strong>
            </span>
            <span className="hidden h-4 w-px bg-gray-200 sm:block" aria-hidden />
            <span>
              <strong className="text-gray-900">Upgrade anytime</strong>
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
          className="mb-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-5"
        >
          {trustBadges.map((badge) => (
            <motion.div
              key={badge.id}
              variants={fadeUp}
              className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-50">
                {trustIcon(badge.icon)}
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-900">{badge.label}</p>
                <p className="mt-0.5 text-xs text-gray-500">{badge.sub}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Main workspace plans */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="mb-24"
        >
          <motion.div variants={fadeUp} className="mb-10 text-center">
            <h2 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">
              Workspace plans
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Your business operating system — bookings, CRM, revenue, and team in one place.
            </p>
          </motion.div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {pricingPlans.map((plan) => (
              <motion.article
                key={plan.id}
                variants={fadeUp}
                className={cn(
                  "relative flex flex-col rounded-2xl border bg-white p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md",
                  plan.is_popular
                    ? "z-10 scale-[1.02] border-emerald-300 shadow-lg shadow-emerald-100 ring-2 ring-emerald-200 md:-mt-2 md:mb-2"
                    : "border-gray-100"
                )}
              >
                {plan.is_popular ? (
                  <span className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full bg-emerald-600 px-3 py-0.5 text-xs font-bold text-white">
                    <Star className="h-3 w-3 fill-white" />
                    Most Popular
                  </span>
                ) : null}

                <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                <p className="mt-1 text-sm leading-relaxed text-gray-500">
                  {plan.description}
                </p>

                <div className="mt-5">
                  <p className="text-3xl font-extrabold text-gray-900">
                    {formatZar(plan.monthly_price)}
                    <span className="text-base font-medium text-gray-500">/month</span>
                  </p>
                </div>

                <p className="mb-3 mt-6 text-xs font-bold uppercase tracking-widest text-emerald-600">
                  Includes
                </p>
                <ul className="flex-1 space-y-2.5">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-gray-600">
                      <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                      {feature}
                    </li>
                  ))}
                </ul>

                <div className="mt-6 border-t border-gray-100 pt-5">
                  <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                    Best for
                  </p>
                  <ul className="mt-2 space-y-1">
                    {plan.best_for.map((item) => (
                      <li key={item} className="text-xs text-gray-500">
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <Link
                  href={signUpHref(plan.slug)}
                  className={cn(
                    "mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold transition-all",
                    plan.is_popular
                      ? "bg-emerald-600 text-white shadow-lg shadow-emerald-200 hover:-translate-y-0.5 hover:bg-emerald-700 hover:shadow-xl hover:shadow-emerald-300"
                      : "border border-gray-200 bg-white text-gray-800 hover:border-emerald-200 hover:bg-emerald-50"
                  )}
                >
                  {plan.cta_label}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </motion.article>
            ))}
          </div>
        </motion.section>

        {/* Website services */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="mb-20 rounded-3xl border border-gray-100 bg-gray-50/80 p-6 sm:p-10"
        >
          <motion.div variants={fadeUp} className="mb-8 text-center">
            <h2 className="text-xl font-extrabold text-gray-900 sm:text-2xl">
              Need a website too?
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm leading-relaxed text-gray-500">
              FaraiOS is not just a website builder. You can use the workspace on its own,
              connect an existing website, or ask us to build one for you.
            </p>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-3">
            {websiteServices.map((service) => (
              <motion.article
                key={service.id}
                variants={fadeUp}
                className="flex flex-col rounded-xl border border-gray-200 bg-white p-5"
              >
                <h3 className="font-bold text-gray-900">{service.name}</h3>
                <p className="mt-2 text-lg font-extrabold text-gray-900">
                  {service.price_label ?? `${formatZar(service.price)} once-off`}
                </p>
                <ul className="mt-4 flex-1 space-y-2">
                  {service.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2 text-sm text-gray-600">
                      <BadgeCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </motion.article>
            ))}
          </div>

          <motion.div variants={fadeUp} className="mt-8 text-center">
            <Link
              href="/platform/contact"
              className="inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-white px-6 py-2.5 text-sm font-semibold text-emerald-700 shadow-sm transition-all hover:border-emerald-300 hover:bg-emerald-50"
            >
              Request Website Setup
              <ArrowRight className="h-4 w-4" />
            </Link>
          </motion.div>
        </motion.section>

        {/* Hosting add-ons */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="mb-20"
        >
          <motion.div variants={fadeUp} className="mb-6 text-center">
            <h2 className="text-lg font-bold text-gray-700 sm:text-xl">
              Optional hosting add-ons
            </h2>
            <p className="mt-2 text-sm text-gray-500">
              Hosting is optional. You can host with FaraiOS or connect an existing website.
            </p>
          </motion.div>

          <div className="mx-auto grid max-w-3xl gap-3 sm:grid-cols-3">
            {hostingAddOns.map((hosting) => (
              <motion.div
                key={hosting.id}
                variants={fadeUp}
                className="rounded-lg border border-gray-100 bg-white px-4 py-3 text-center"
              >
                <p className="text-sm font-medium text-gray-700">{hosting.name}</p>
                <p className="mt-1 text-base font-bold text-gray-900">
                  {formatZar(hosting.monthly_price)}
                  <span className="text-xs font-normal text-gray-500">/month</span>
                </p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* Growth services */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="mb-20 rounded-3xl border border-emerald-100 bg-emerald-50/40 p-6 sm:p-10"
        >
          <motion.div variants={fadeUp} className="mb-8 text-center">
            <h2 className="text-xl font-extrabold text-gray-900 sm:text-2xl">
              Growth services
            </h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm text-gray-500">
              Get help with SEO, content, reviews, and paid marketing when you are ready to grow.
            </p>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {growthServices.map((service) => (
              <motion.article
                key={service.id}
                variants={fadeUp}
                className="rounded-xl border border-emerald-100 bg-white p-4"
              >
                <h3 className="text-sm font-bold text-gray-900">{service.name}</h3>
                <p className="mt-2 text-sm font-extrabold text-emerald-700">
                  {formatServicePrice(service.price, service.billing, service.price_label)}
                </p>
              </motion.article>
            ))}
          </div>

          <motion.div variants={fadeUp} className="mt-8 text-center">
            <Link
              href="/platform/contact"
              className="inline-flex items-center gap-2 rounded-xl bg-white px-6 py-2.5 text-sm font-semibold text-emerald-700 shadow-sm ring-1 ring-emerald-200 transition-all hover:bg-emerald-50"
            >
              <MessageCircle className="h-4 w-4" />
              Talk to FaraiOS
            </Link>
          </motion.div>
        </motion.section>

        {/* FAQ */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="mx-auto max-w-2xl pb-16"
        >
          <motion.div variants={fadeUp} className="mb-10 text-center">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-widest text-emerald-700">
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
          </div>
        </section>

        <MarketingCtaBand
          title="Ready to run your business from one workspace?"
          description="Start with the Business plan — bookings, CRM, quotes, invoices, and growth tools for growing service teams."
        >
          <Link href={signUpHref("business")} className={cn(landingGreenBtnLg, "group")}>
            Start Business Plan
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </MarketingCtaBand>
      </main>
    </MarketingPageShell>
  );
}
