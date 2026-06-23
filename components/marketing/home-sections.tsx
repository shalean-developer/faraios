"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  ClipboardList,
  CreditCard,
  Globe,
  Headphones,
  HelpCircle,
  Lock,
  Rocket,
  Sparkles,
} from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  faqItems,
  formatZar,
  pricingPlans,
  trustBadges,
  type TrustBadgeRecord,
} from "@/lib/data/pricing";
import type { Feature, Industry } from "@/types/database";

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

const HOW_IT_WORKS = [
  {
    step: "1",
    title: "Tell us about your business",
    desc: "Pick your industry, pages, and style in a short onboarding flow.",
    icon: ClipboardList,
  },
  {
    step: "2",
    title: "We design & build",
    desc: "Our team crafts your site while you track progress in your dashboard.",
    icon: Sparkles,
  },
  {
    step: "3",
    title: "Review & refine",
    desc: "Share feedback until the site matches your brand and goals.",
    icon: BadgeCheck,
  },
  {
    step: "4",
    title: "Launch & grow",
    desc: "Go live on your domain with hosting and ongoing support included.",
    icon: Rocket,
  },
];

type HomeMarketingSectionsProps = {
  industries: Industry[];
  features: Feature[];
  onGetStarted: () => void;
  onViewExamples: () => void;
};

export function HomeMarketingSections({
  industries,
  features,
  onGetStarted,
  onViewExamples,
}: HomeMarketingSectionsProps) {
  const starter = pricingPlans[0];
  const popular = pricingPlans.find((p) => p.is_popular) ?? pricingPlans[1];

  return (
    <>
      <section className="border-y border-gray-100 bg-white px-4 py-10 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-8 gap-y-3 text-center text-sm text-gray-600">
          <span>
            Live in as little as <strong className="text-gray-900">14 days</strong>
          </span>
          <span className="hidden h-4 w-px bg-gray-200 sm:block" aria-hidden />
          <span>
            Plans from{" "}
            <strong className="text-gray-900">{formatZar(starter.monthly_price)}/mo</strong>
          </span>
          <span className="hidden h-4 w-px bg-gray-200 sm:block" aria-hidden />
          <span>
            <strong className="text-gray-900">No hidden fees</strong>
          </span>
        </div>
      </section>

      <section className="bg-gray-50 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="mb-12 text-center"
          >
            <motion.h2 variants={fadeUp} className="text-2xl font-extrabold text-gray-900 sm:text-3xl">
              How it works
            </motion.h2>
            <motion.p variants={fadeUp} className="mt-2 text-gray-500">
              From first click to live website — we handle the technical work.
            </motion.p>
          </motion.div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {HOW_IT_WORKS.map((item) => (
              <motion.div
                key={item.step}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                  <item.icon className="h-5 w-5" />
                </div>
                <p className="text-xs font-bold uppercase tracking-widest text-violet-600">
                  Step {item.step}
                </p>
                <h3 className="mt-2 font-bold text-gray-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500">{item.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {features.length > 0 ? (
        <section className="px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-10 text-center">
              <h2 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">
                Built-in capabilities
              </h2>
              <p className="mt-2 text-gray-500">
                Optional features you can enable during onboarding.
              </p>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.id}
                  className="rounded-2xl border border-violet-100 bg-gradient-to-br from-white to-violet-50/50 p-6 text-center shadow-sm"
                >
                  <h3 className="font-bold text-gray-900">{feature.name}</h3>
                  <p className="mt-2 text-sm text-gray-500">
                    Available on your workspace when you need it.
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="bg-gray-50 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-10 text-center">
            <h2 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">
              Simple, transparent pricing
            </h2>
            <p className="mt-2 text-gray-500">
              One-time setup plus a monthly plan. Most teams start on{" "}
              <strong className="text-gray-800">{popular.name}</strong>.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {pricingPlans.map((plan) => (
              <div
                key={plan.id}
                className={`relative rounded-2xl border bg-white p-6 shadow-sm ${
                  plan.is_popular
                    ? "border-violet-300 ring-2 ring-violet-200"
                    : "border-gray-100"
                }`}
              >
                {plan.is_popular ? (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-violet-600 px-3 py-0.5 text-xs font-bold text-white">
                    Most popular
                  </span>
                ) : null}
                <h3 className="text-lg font-bold text-gray-900">{plan.name}</h3>
                <p className="mt-1 text-sm text-gray-500">{plan.description}</p>
                <p className="mt-4 text-3xl font-extrabold text-gray-900">
                  {formatZar(plan.monthly_price)}
                  <span className="text-base font-medium text-gray-500">/mo</span>
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  {formatZar(plan.setup_price)} setup
                </p>
                <ul className="mt-5 space-y-2 text-sm text-gray-600">
                  {plan.features.slice(0, 4).map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-800 shadow-sm transition-all hover:border-violet-200 hover:shadow-md"
            >
              Compare all plans & FAQ
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-gray-100 bg-white px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
            {trustBadges.map((badge) => (
              <div
                key={badge.id}
                className="flex items-start gap-3 rounded-xl border border-gray-100 p-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50">
                  {trustIcon(badge.icon)}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{badge.label}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{badge.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-gray-100 bg-white px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
          >
            <motion.h2
              variants={fadeUp}
              className="mb-2 text-center text-2xl font-extrabold text-gray-900 sm:text-3xl"
            >
              Industries we serve
            </motion.h2>
            <motion.p variants={fadeUp} className="mb-10 text-center text-gray-500">
              Templates and defaults tuned for your type of business.
            </motion.p>
            {industries.length === 0 ? (
              <motion.p
                variants={fadeUp}
                className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-12 text-center text-sm text-gray-500"
              >
                Industry options will appear here once your workspace catalog is
                configured.
              </motion.p>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {industries.map((ind) => (
                  <motion.div
                    key={ind.id}
                    variants={fadeUp}
                    className="rounded-2xl border border-gray-100 bg-gradient-to-br from-white to-violet-50/40 p-6 shadow-sm transition-shadow hover:shadow-md"
                  >
                    <h3 className="font-bold text-gray-900">{ind.name}</h3>
                    {ind.description ? (
                      <p className="mt-2 text-sm leading-relaxed text-gray-500">
                        {ind.description}
                      </p>
                    ) : null}
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </section>

      <section className="bg-gray-50 px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <h2 className="text-2xl font-extrabold text-gray-900 sm:text-3xl">
                Marketplace businesses
              </h2>
              <p className="mt-2 text-gray-500">
                Discover real FaraiOS clients and book services online.
              </p>
            </div>
            <button
              type="button"
              onClick={onViewExamples}
              className="text-sm font-semibold text-violet-600 hover:text-violet-800"
            >
              Browse marketplace →
            </button>
          </div>
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              { name: "Luxe Interiors Co.", desc: "Interior design studio showcase" },
              { name: "GreenLeaf Dental", desc: "Patient-focused practice site" },
              { name: "Urban Fitness Hub", desc: "Gym & class discovery" },
            ].map((ex) => (
              <button
                key={ex.name}
                type="button"
                onClick={onViewExamples}
                className="overflow-hidden rounded-2xl border border-gray-100 bg-white text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex h-32 items-center justify-center bg-gradient-to-br from-violet-100 to-indigo-100">
                  <Globe className="h-8 w-8 text-violet-400" />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900">{ex.name}</h3>
                  <p className="mt-1 text-sm text-gray-500">{ex.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl">
          <div className="mb-10 text-center">
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
          </div>
          <Accordion className="space-y-3">
            {faqItems.map((faq) => (
              <AccordionItem key={faq.id} value={faq.id}>
                <AccordionTrigger>{faq.question}</AccordionTrigger>
                <AccordionContent>{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      <section className="px-4 pb-8 pt-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            variants={stagger}
            className="rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-700 p-12 shadow-2xl shadow-violet-200"
          >
            <motion.h2
              variants={fadeUp}
              className="mb-4 text-3xl font-extrabold text-white"
            >
              Ready to launch your website?
            </motion.h2>
            <motion.p variants={fadeUp} className="mb-8 text-lg text-violet-100">
              Join businesses that trust FaraiOS to build their online presence —
              live in as little as 14 days.
            </motion.p>
            <motion.button
              variants={fadeUp}
              type="button"
              onClick={onGetStarted}
              className="group inline-flex items-center gap-2 rounded-xl bg-white px-10 py-3.5 text-base font-bold text-violet-700 shadow-lg transition-colors hover:bg-violet-50"
            >
              Get Started
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </motion.button>
          </motion.div>
        </div>
      </section>
    </>
  );
}
