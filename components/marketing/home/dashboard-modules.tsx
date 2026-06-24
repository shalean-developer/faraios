"use client";

import { motion } from "framer-motion";
import {
  BarChart3,
  Globe,
  Users,
  Wallet,
  CalendarDays,
  LineChart,
} from "lucide-react";

import { fadeUp, sectionScrollClass, stagger } from "@/components/marketing/home/motion";
import { DASHBOARD_MODULES } from "@/lib/data/home-marketing";

const MODULE_ICONS = [CalendarDays, Wallet, Globe, LineChart, Users, BarChart3] as const;

export function DashboardModules() {
  return (
    <section
      id="modules"
      className={`bg-gray-50 px-4 py-20 sm:px-6 lg:px-8 ${sectionScrollClass}`}
    >
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="mb-12 text-center"
        >
          <motion.h2 variants={fadeUp} className="text-2xl font-extrabold text-gray-900 sm:text-3xl">
            One dashboard. Every part of your business.
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-2 text-gray-500">
            Six connected modules that mirror how service businesses actually operate.
          </motion.p>
        </motion.div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {DASHBOARD_MODULES.map((mod, i) => {
            const Icon = MODULE_ICONS[i] ?? CalendarDays;
            return (
              <motion.div
                key={mod.title}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeUp}
                className="rounded-2xl border border-violet-100 bg-gradient-to-br from-white to-violet-50/50 p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-violet-100">
                  <Icon className="h-6 w-6 text-violet-600" />
                </div>
                <h3 className="text-lg font-bold text-gray-900">{mod.title}</h3>
                <p className="mt-1 text-sm font-medium text-violet-600">{mod.items}</p>
                <p className="mt-3 text-sm leading-relaxed text-gray-500">{mod.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
