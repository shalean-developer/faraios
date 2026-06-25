"use client";

import { motion } from "framer-motion";

import { landingSectionSubtitle, landingSectionTitle } from "@/components/marketing/home/landing-styles";
import { fadeUp, sectionScrollClass, stagger } from "@/components/marketing/home/motion";
import {
  BrowserMockup,
  MiniBookingScreen,
  PhoneMockup,
} from "@/components/marketing/home/ui-mockups";

export function BookingSystemSection() {
  return (
    <section
      className={`bg-gradient-to-b from-sky-50 to-blue-50/50 px-4 py-20 sm:px-6 lg:px-8 ${sectionScrollClass}`}
    >
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="mb-14 text-center"
        >
          <motion.h2 variants={fadeUp} className={landingSectionTitle}>
            A complete booking system for your business
          </motion.h2>
          <motion.p variants={fadeUp} className={`mx-auto max-w-2xl ${landingSectionSubtitle}`}>
            Give customers a professional booking experience on desktop and mobile — while your
            team sees every job in the Shalean dashboard.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="relative flex flex-col items-center justify-center gap-8 lg:flex-row lg:items-end lg:gap-12"
        >
          <BrowserMockup title="yourbusiness.faraios.com/book" className="w-full max-w-2xl">
            <div className="grid gap-4 p-6 sm:grid-cols-2">
              <div className="space-y-3">
                <p className="text-sm font-bold text-slate-900">Book a service</p>
                <div className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-600">
                  House cleaning
                </div>
                <div className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-600">
                  Thu, 26 Jun · 09:00
                </div>
                <div className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-400">
                  Your name & contact
                </div>
                <div className="rounded-xl bg-emerald-600 py-2.5 text-center text-sm font-semibold text-white">
                  Confirm booking
                </div>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Summary
                </p>
                <p className="mt-2 text-sm font-bold text-slate-900">House cleaning</p>
                <p className="text-xs text-slate-500">3 hours · R850</p>
                <div className="mt-4 space-y-2">
                  <div className="h-2 rounded-full bg-emerald-200" />
                  <div className="h-2 w-3/4 rounded-full bg-emerald-100" />
                </div>
              </div>
            </div>
          </BrowserMockup>

          <PhoneMockup className="shrink-0 lg:-mb-6">
            <MiniBookingScreen />
          </PhoneMockup>
        </motion.div>
      </div>
    </section>
  );
}
