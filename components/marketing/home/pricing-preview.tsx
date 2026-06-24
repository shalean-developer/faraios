"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, BadgeCheck } from "lucide-react";

import { fadeUp, sectionScrollClass, stagger } from "@/components/marketing/home/motion";
import { HOME_PRICING_HIGHLIGHTS } from "@/lib/data/home-marketing";
import { formatZar, pricingPlans } from "@/lib/data/pricing";

export function PricingPreview() {
  return (
    <section
      id="pricing"
      className={`px-4 py-20 sm:px-6 lg:px-8 ${sectionScrollClass}`}
    >
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="mb-10 text-center"
        >
          <motion.h2 variants={fadeUp} className="text-2xl font-extrabold text-gray-900 sm:text-3xl">
            Simple pricing for growing service businesses
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-2 text-gray-500">
            Workspace platform plus optional website design. No hidden fees.
          </motion.p>
        </motion.div>

        <div className="grid gap-6 md:grid-cols-3">
          {pricingPlans.map((plan) => {
            const highlights = HOME_PRICING_HIGHLIGHTS[plan.slug];
            return (
              <motion.div
                key={plan.id}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className={`relative flex flex-col rounded-2xl border bg-white p-6 shadow-sm ${
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
                <ul className="mt-5 flex-1 space-y-2 text-sm text-gray-600">
                  {highlights.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-violet-600" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href={`/auth/sign-up?next=/onboarding?plan=${plan.slug}`}
                  className="mt-6 inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg"
                >
                  Start workspace
                </Link>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-10 text-center">
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-6 py-3 text-sm font-semibold text-gray-800 shadow-sm transition-all hover:border-violet-200 hover:shadow-md"
          >
            Compare all plans &amp; FAQ
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </section>
  );
}
