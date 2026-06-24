"use client";

import { motion } from "framer-motion";
import {
  BarChart3,
  CalendarDays,
  Globe,
  LayoutDashboard,
  LineChart,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";

import { fadeUp, stagger } from "@/components/marketing/home/motion";
import {
  DASHBOARD_PREVIEW_CARDS,
  DASHBOARD_PREVIEW_SIDEBAR,
} from "@/lib/data/home-marketing";

const SIDEBAR_ICONS = [
  LayoutDashboard,
  CalendarDays,
  Wallet,
  Globe,
  LineChart,
  Users,
  BarChart3,
] as const;

export function DashboardPreview() {
  return (
    <section className="px-4 pb-20 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xl shadow-violet-100/50"
        >
          <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-red-400" />
              <div className="h-3 w-3 rounded-full bg-amber-400" />
              <div className="h-3 w-3 rounded-full bg-emerald-400" />
              <span className="ml-2 text-xs font-medium text-gray-500">
                FaraiOS Workspace
              </span>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row">
            <div className="border-b border-gray-100 bg-gray-50/80 p-4 lg:w-52 lg:border-b-0 lg:border-r">
              <div className="mb-3 hidden items-center gap-2 lg:flex">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-600">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <span className="text-sm font-bold text-gray-900">My Business</span>
              </div>

              <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-1 lg:overflow-visible lg:pb-0">
                {DASHBOARD_PREVIEW_SIDEBAR.map((item, i) => {
                  const Icon = SIDEBAR_ICONS[i] ?? LayoutDashboard;
                  const active = i === 0;
                  return (
                    <div
                      key={item}
                      className={`flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                        active
                          ? "bg-violet-100 font-semibold text-violet-700"
                          : "text-gray-600"
                      }`}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      <span className="whitespace-nowrap">{item}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 bg-gradient-to-br from-white to-violet-50/30 p-4 sm:p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-900">Overview</h2>
                <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                  All systems go
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {DASHBOARD_PREVIEW_CARDS.map((card) => (
                  <motion.div
                    key={card.label}
                    variants={fadeUp}
                    className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm"
                  >
                    <p className="text-xs font-medium text-gray-500">{card.label}</p>
                    <p className="mt-1 text-2xl font-bold text-gray-900">{card.value}</p>
                    <p className="mt-1 text-xs text-gray-400">{card.trend}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
