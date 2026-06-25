"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Check, X } from "lucide-react";

import { FaraiLogo } from "@/components/brand/farai-logo";
import { fadeUp, sectionScrollClass, stagger } from "@/components/marketing/home/motion";

const faraiBenefits = [
  "Bookings, CRM, and payments in one place",
  "Built for South African service businesses",
  "Website, SEO, and marketing included",
  "Free setup — cancel anytime",
];

const legacyPain = [
  "Multiple disconnected apps",
  "Manual spreadsheets and follow-ups",
  "No online booking for customers",
  "Hidden fees and complex contracts",
];

export function ComparisonSection() {
  return (
    <section className={`bg-slate-50 px-4 py-20 sm:px-6 lg:px-8 ${sectionScrollClass}`}>
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="grid gap-6 md:grid-cols-2"
        >
          <motion.div
            variants={fadeUp}
            className="flex flex-col rounded-3xl bg-[#0f2744] p-8 text-white shadow-xl sm:p-10"
          >
            <div className="mb-6 rounded-xl bg-white px-4 py-3">
              <FaraiLogo size="md" />
            </div>
            <h3 className="text-2xl font-extrabold">Run your business on FaraiOS</h3>
            <p className="mt-2 text-sm text-blue-100">
              The connected workspace built for local service teams.
            </p>
            <ul className="mt-6 flex-1 space-y-3">
              {faraiBenefits.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              href="/auth/sign-up"
              className="group mt-8 inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-400"
            >
              Get started free
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </Link>
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="flex flex-col rounded-3xl bg-gradient-to-br from-red-500 to-red-600 p-8 text-white shadow-xl sm:p-10"
          >
            <div className="mb-6 flex h-12 items-center">
              <span className="text-2xl font-black tracking-tight opacity-90">
                Fragmented tools
              </span>
            </div>
            <h3 className="text-2xl font-extrabold">The old way of running a service business</h3>
            <p className="mt-2 text-sm text-red-100">
              Spreadsheets, WhatsApp, and apps that don&apos;t talk to each other.
            </p>
            <ul className="mt-6 flex-1 space-y-3">
              {legacyPain.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm">
                  <X className="mt-0.5 h-4 w-4 shrink-0 text-red-200" />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-8 text-sm font-medium text-red-100">
              There&apos;s a better way →
            </p>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
