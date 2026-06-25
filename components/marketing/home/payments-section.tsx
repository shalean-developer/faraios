"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Check } from "lucide-react";

import { landingSectionTitle } from "@/components/marketing/home/landing-styles";
import { fadeUp, sectionScrollClass, stagger } from "@/components/marketing/home/motion";
import { PaymentsDashboardPreview } from "@/components/marketing/home/ui-mockups";
import { PAYMENTS_FEATURES } from "@/lib/data/home-marketing";

export function PaymentsSection() {
  return (
    <section
      className={`bg-[#0f2744] px-4 py-20 sm:px-6 lg:px-8 ${sectionScrollClass}`}
    >
      <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
        >
          <motion.h2 variants={fadeUp} className={`${landingSectionTitle} text-white`}>
            Integrated payments and revenue tracking
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 text-lg leading-relaxed text-blue-100">
            Quote, invoice, and track payments without leaving FaraiOS. See your revenue, pending
            invoices, and business health in one dashboard.
          </motion.p>
          <motion.ul variants={fadeUp} className="mt-8 space-y-3">
            {PAYMENTS_FEATURES.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-blue-50">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                {item}
              </li>
            ))}
          </motion.ul>
          <motion.div variants={fadeUp} className="mt-8">
            <Link
              href="/pricing"
              className="group inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-400"
            >
              View pricing
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </motion.div>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-sm"
        >
          <PaymentsDashboardPreview />
        </motion.div>
      </div>
    </section>
  );
}
