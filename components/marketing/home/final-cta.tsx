"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";

import { fadeUp, stagger } from "@/components/marketing/home/motion";

type FinalCtaProps = {
  onGetStarted: () => void;
};

export function FinalCta({ onGetStarted }: FinalCtaProps) {
  return (
    <section className="px-4 pb-8 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl text-center">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="rounded-3xl bg-gradient-to-br from-violet-600 to-indigo-700 p-8 shadow-2xl shadow-violet-200 sm:p-12"
        >
          <motion.h2
            variants={fadeUp}
            className="mb-4 text-2xl font-extrabold text-white sm:text-3xl"
          >
            Ready to run your service business from one connected workspace?
          </motion.h2>
          <motion.p variants={fadeUp} className="mb-8 text-base text-violet-100 sm:text-lg">
            Start with your workspace today. Add your website, bookings, payments, SEO, and
            marketing when you&apos;re ready.
          </motion.p>
          <motion.div
            variants={fadeUp}
            className="flex flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <button
              type="button"
              onClick={onGetStarted}
              className="group inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-bold text-violet-700 shadow-lg transition-colors hover:bg-violet-50"
            >
              Start your workspace
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>
            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded-xl border border-white/30 bg-white/10 px-8 py-3.5 text-base font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
            >
              View pricing
            </Link>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
