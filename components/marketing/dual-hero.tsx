"use client";

import { motion } from "framer-motion";
import { BadgeCheck } from "lucide-react";

import { EmailSignupForm } from "@/components/marketing/home/email-signup-form";
import {
  BrowserMockup,
  MiniBookingScreen,
  PhoneMockup,
} from "@/components/marketing/home/ui-mockups";
import {
  HERO_HEADLINE,
  HERO_SUBHEADLINE,
  HERO_TRUST_LINE,
} from "@/lib/data/home-marketing";

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

type Props = {
  onGetStarted?: () => void;
};

export function DualHero({ onGetStarted }: Props) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-amber-50 via-yellow-50/80 to-orange-50/40 px-4 pb-20 pt-28 sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute -right-20 top-20 h-72 w-72 rounded-full bg-amber-200/40 blur-3xl" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-64 w-64 rounded-full bg-emerald-100/50 blur-3xl" />

      <div className="relative mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2 lg:gap-16">
        <motion.div initial="hidden" animate="visible" variants={stagger}>
          <motion.h1
            variants={fadeUp}
            className="text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.25rem]"
          >
            {HERO_HEADLINE}
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="mt-5 max-w-xl text-lg leading-relaxed text-slate-600"
          >
            {HERO_SUBHEADLINE}
          </motion.p>

          <motion.div variants={fadeUp} className="mt-8">
            <EmailSignupForm onGetStarted={onGetStarted} size="lg" />
          </motion.div>

          <motion.p variants={fadeUp} className="mt-5 text-sm text-slate-500">
            <BadgeCheck className="mr-1 inline h-4 w-4 text-emerald-600" />
            {HERO_TRUST_LINE}
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="relative mx-auto w-full max-w-lg lg:max-w-none"
        >
          <div className="relative grid grid-cols-2 gap-4">
            <div className="space-y-4 pt-8">
              <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 shadow-lg">
                <div className="flex h-36 items-end p-4">
                  <div className="rounded-lg bg-white/90 px-3 py-2 text-xs font-semibold text-slate-800 shadow">
                    On-site service
                  </div>
                </div>
              </div>
              <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-sky-400 to-blue-500 shadow-lg">
                <div className="flex h-28 items-end p-4">
                  <div className="rounded-lg bg-white/90 px-3 py-2 text-xs font-semibold text-slate-800 shadow">
                    Team in the field
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <PhoneMockup className="w-full max-w-[200px]">
                <MiniBookingScreen />
              </PhoneMockup>
              <BrowserMockup title="book.yourbusiness.co.za" className="scale-95">
                <div className="p-4">
                  <p className="text-xs font-bold text-slate-900">Book a service</p>
                  <div className="mt-2 space-y-2">
                    <div className="h-8 rounded-lg bg-emerald-50 ring-1 ring-emerald-100" />
                    <div className="h-8 rounded-lg bg-slate-50 ring-1 ring-slate-100" />
                    <div className="h-8 rounded-lg bg-emerald-600" />
                  </div>
                </div>
              </BrowserMockup>
            </div>
          </div>

          <div className="absolute -bottom-4 -left-4 hidden rounded-2xl border border-white/80 bg-white p-3 shadow-xl lg:block">
            <p className="text-xs font-semibold text-slate-900">12 bookings today</p>
            <p className="text-[10px] text-emerald-600">+3 from yesterday</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
