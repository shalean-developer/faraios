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

import {
  landingContainer,
  landingSectionHeader,
  landingSectionPad,
  landingSectionTitle,
} from "@/components/marketing/home/landing-styles";
import { fadeUp, sectionScrollClass, stagger } from "@/components/marketing/home/motion";
import { DASHBOARD_MODULES } from "@/lib/data/home-marketing";
import { cn } from "@/lib/utils";

const MODULE_ICONS = [CalendarDays, Wallet, Globe, LineChart, Users, BarChart3] as const;

export function DashboardModules() {
  return (
    <section
      id="modules"
      className={cn(landingSectionPad, sectionScrollClass, "bg-slate-50")}
    >
      <div className={landingContainer}>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className={landingSectionHeader}
        >
          <motion.h2 variants={fadeUp} className={landingSectionTitle}>
            One dashboard. Every part of your business.
          </motion.h2>
          <motion.p variants={fadeUp} className="mt-2 text-slate-600">
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
                className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/40 p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50">
                  <Icon className="h-6 w-6 text-emerald-600" />
                </div>
                <h3 className="text-lg font-bold text-slate-900">{mod.title}</h3>
                <p className="mt-1 text-sm font-medium text-emerald-700">{mod.items}</p>
                <p className="mt-3 text-sm leading-relaxed text-slate-600">{mod.description}</p>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
