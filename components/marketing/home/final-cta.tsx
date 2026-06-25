"use client";

import { motion } from "framer-motion";

import { EmailSignupForm } from "@/components/marketing/home/email-signup-form";
import { fadeUp, stagger } from "@/components/marketing/home/motion";

type FinalCtaProps = {
  onGetStarted: () => void;
};

export function FinalCta({ onGetStarted }: FinalCtaProps) {
  return (
    <section className="px-4 pb-16 pt-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-4xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="rounded-3xl bg-gradient-to-br from-amber-50 via-yellow-50 to-orange-50/60 px-8 py-14 text-center shadow-sm ring-1 ring-amber-100/80 sm:px-12 sm:py-16"
        >
          <motion.h2
            variants={fadeUp}
            className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl"
          >
            Ready to get started?
          </motion.h2>
          <motion.p variants={fadeUp} className="mx-auto mt-4 max-w-xl text-lg text-slate-600">
            Join service businesses running bookings, payments, and growth from one FaraiOS
            workspace.
          </motion.p>
          <motion.div variants={fadeUp} className="mt-8 flex justify-center">
            <EmailSignupForm onGetStarted={onGetStarted} size="lg" />
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
