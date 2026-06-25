"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  CalendarDays,
  CreditCard,
  Globe,
  LayoutDashboard,
  LineChart,
  Users,
} from "lucide-react";

import { landingGreenBtn, landingSectionTitle } from "@/components/marketing/home/landing-styles";
import { fadeUp, sectionScrollClass, stagger } from "@/components/marketing/home/motion";
import { BookingWidgetPreview } from "@/components/marketing/home/ui-mockups";
import { EVERYTHING_FEATURES } from "@/lib/data/home-marketing";

const FEATURE_ICONS = [
  CalendarDays,
  Users,
  CreditCard,
  LayoutDashboard,
  Globe,
  LineChart,
] as const;

export function EverythingFeatureSection() {
  return (
    <section className={`bg-white px-4 py-20 sm:px-6 lg:px-8 ${sectionScrollClass}`}>
      <div className="mx-auto grid max-w-7xl items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
        >
          <motion.h2 variants={fadeUp} className={landingSectionTitle}>
            Everything you need to run your service business better
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-4 text-lg text-slate-600">
            One connected workspace for bookings, customers, payments, and growth — without
            juggling spreadsheets and separate apps.
          </motion.p>

          <motion.ul variants={fadeUp} className="mt-8 space-y-5">
            {EVERYTHING_FEATURES.map((feature, i) => {
              const Icon = FEATURE_ICONS[i] ?? LayoutDashboard;
              return (
                <li key={feature.title} className="flex gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50">
                    <Icon className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-900">{feature.title}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-slate-600">
                      {feature.description}
                    </p>
                  </div>
                </li>
              );
            })}
          </motion.ul>

          <motion.div variants={fadeUp} className="mt-8">
            <Link href="/features" className={landingGreenBtn}>
              Explore all features
            </Link>
          </motion.div>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="relative"
        >
          <div className="absolute -inset-4 rounded-3xl bg-gradient-to-br from-blue-100/60 to-emerald-100/40 blur-2xl" />
          <div className="relative max-w-md lg:ml-auto">
            <BookingWidgetPreview />
          </div>
        </motion.div>
      </div>
    </section>
  );
}
