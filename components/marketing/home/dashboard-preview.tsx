"use client";

import { motion } from "framer-motion";
import {
  Activity,
  BarChart3,
  CalendarDays,
  DollarSign,
  FileText,
  LayoutDashboard,
  LineChart,
  Megaphone,
  Sparkles,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

import { fadeUp, sectionScrollClass, stagger } from "@/components/marketing/home/motion";
import {
  DASHBOARD_PREVIEW_ACTIVITY,
  DASHBOARD_PREVIEW_CARDS,
  DASHBOARD_PREVIEW_INSIGHT,
  DASHBOARD_PREVIEW_SIDEBAR,
  type DashboardPreviewCard,
} from "@/lib/data/home-marketing";
import { cn } from "@/lib/utils";

const SIDEBAR_ICONS = [
  LayoutDashboard,
  CalendarDays,
  Wallet,
  LineChart,
  Users,
  BarChart3,
] as const;

const CARD_ICONS = {
  bookings: CalendarDays,
  revenue: DollarSign,
  leads: Megaphone,
  quotes: FileText,
  customers: Users,
  health: Activity,
} as const;

const CARD_STYLES: Record<
  DashboardPreviewCard["icon"],
  { iconBg: string; iconColor: string; accent: string }
> = {
  bookings: {
    iconBg: "bg-violet-100",
    iconColor: "text-violet-600",
    accent: "from-violet-500/10 to-violet-500/0",
  },
  revenue: {
    iconBg: "bg-emerald-100",
    iconColor: "text-emerald-600",
    accent: "from-emerald-500/10 to-emerald-500/0",
  },
  leads: {
    iconBg: "bg-pink-100",
    iconColor: "text-pink-600",
    accent: "from-pink-500/10 to-pink-500/0",
  },
  quotes: {
    iconBg: "bg-indigo-100",
    iconColor: "text-indigo-600",
    accent: "from-indigo-500/10 to-indigo-500/0",
  },
  customers: {
    iconBg: "bg-slate-100",
    iconColor: "text-slate-600",
    accent: "from-slate-500/10 to-slate-500/0",
  },
  health: {
    iconBg: "bg-violet-100",
    iconColor: "text-violet-600",
    accent: "from-violet-500/10 to-violet-500/0",
  },
};

function trendClass(tone: DashboardPreviewCard["trendTone"]) {
  switch (tone) {
    case "up":
      return "text-emerald-600";
    case "alert":
      return "text-amber-600";
    default:
      return "text-slate-500";
  }
}

function MiniSparkline({
  values,
  className,
}: {
  values: readonly number[];
  className?: string;
}) {
  const max = Math.max(...values, 1);
  return (
    <div className={cn("flex h-8 items-end gap-0.5", className)} aria-hidden>
      {values.map((value, index) => (
        <div
          key={`${value}-${index}`}
          className="w-1.5 rounded-full bg-violet-300/80 transition-all"
          style={{ height: `${Math.max(18, (value / max) * 100)}%` }}
        />
      ))}
    </div>
  );
}

export function DashboardPreview() {
  return (
    <section className={cn("relative px-4 pb-20 pt-4 sm:px-6 lg:px-8", sectionScrollClass)}>
      <div className="pointer-events-none absolute inset-x-0 top-8 mx-auto h-64 max-w-4xl rounded-full bg-violet-200/30 blur-3xl" />

      <div className="relative mx-auto max-w-6xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="mb-10 text-center"
        >
          <motion.p
            variants={fadeUp}
            className="text-xs font-bold uppercase tracking-widest text-violet-600"
          >
            Workspace preview
          </motion.p>
          <motion.h2
            variants={fadeUp}
            className="mt-3 text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl"
          >
            Run your business from one dashboard
          </motion.h2>
          <motion.p variants={fadeUp} className="mx-auto mt-2 max-w-2xl text-gray-500">
            Bookings, customers, quotes, invoices, and growth tools — connected in a single
            operating system built for service teams.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeUp}
          className="relative"
        >
          <div className="absolute -inset-1 rounded-[1.35rem] bg-gradient-to-br from-violet-400/30 via-indigo-300/20 to-violet-500/30 blur-sm" />

          <div className="relative overflow-hidden rounded-[1.25rem] border border-violet-200/80 bg-white shadow-2xl shadow-violet-200/40 lg:[transform:perspective(1200px)_rotateX(2deg)]">
            <div className="border-b border-gray-100 bg-gradient-to-r from-slate-50 to-violet-50/60 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-400/90" />
                  <div className="h-3 w-3 rounded-full bg-amber-400/90" />
                  <div className="h-3 w-3 rounded-full bg-emerald-400/90" />
                  <span className="ml-2 text-xs font-medium text-gray-500">
                    Shalean Workspace
                  </span>
                </div>
                <span className="hidden rounded-full border border-violet-200 bg-white px-2.5 py-0.5 text-[10px] font-semibold text-violet-700 sm:inline">
                  app.faraios.com
                </span>
              </div>
            </div>

            <div className="flex flex-col lg:flex-row">
              <div className="border-b border-gray-100 bg-slate-50/90 p-4 lg:w-56 lg:border-b-0 lg:border-r">
                <div className="mb-4 flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-md shadow-violet-200">
                    <Sparkles className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-900">My Business</p>
                    <p className="text-[10px] font-medium text-gray-400">Business plan</p>
                  </div>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:pb-0">
                  {DASHBOARD_PREVIEW_SIDEBAR.map((item, i) => {
                    const Icon = SIDEBAR_ICONS[i] ?? LayoutDashboard;
                    const active = i === 0;
                    return (
                      <div
                        key={item}
                        className={cn(
                          "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                          active
                            ? "bg-white font-semibold text-violet-700 shadow-sm ring-1 ring-violet-100"
                            : "text-gray-500"
                        )}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span className="whitespace-nowrap">{item}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex-1 bg-gradient-to-br from-white via-white to-violet-50/40 p-4 sm:p-6">
                <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-violet-600">
                      Home
                    </p>
                    <h3 className="mt-0.5 text-xl font-bold tracking-tight text-gray-900">
                      Overview
                    </h3>
                    <p className="mt-1 text-xs text-gray-500">
                      Operations, revenue, and growth at a glance.
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    All systems go
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {DASHBOARD_PREVIEW_CARDS.map((card) => {
                    const Icon = CARD_ICONS[card.icon];
                    const style = CARD_STYLES[card.icon];
                    return (
                      <div
                        key={card.label}
                        className={cn(
                          "group relative overflow-hidden rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:border-violet-100 hover:shadow-md",
                          "bg-gradient-to-br to-white",
                          style.accent
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div
                            className={cn(
                              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                              style.iconBg
                            )}
                          >
                            <Icon className={cn("h-4 w-4", style.iconColor)} />
                          </div>
                          <MiniSparkline values={card.sparkline} className="opacity-70" />
                        </div>
                        <p className="mt-3 text-xs font-medium text-gray-500">{card.label}</p>
                        <p className="mt-1 text-2xl font-bold tracking-tight text-gray-900">
                          {card.value}
                        </p>
                        <p
                          className={cn(
                            "mt-1 flex items-center gap-1 text-xs font-medium",
                            trendClass(card.trendTone)
                          )}
                        >
                          {card.trendTone === "up" ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : null}
                          {card.trend}
                        </p>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 grid gap-4 lg:grid-cols-5">
                  <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm lg:col-span-3">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        Recent activity
                      </p>
                      <span className="text-[10px] font-medium text-violet-600">Live feed</span>
                    </div>
                    <ul className="space-y-3">
                      {DASHBOARD_PREVIEW_ACTIVITY.map((item) => (
                        <li
                          key={item.text}
                          className="flex items-start justify-between gap-3 border-b border-gray-50 pb-3 last:border-0 last:pb-0"
                        >
                          <p className="text-sm text-gray-700">{item.text}</p>
                          <span className="shrink-0 text-[10px] font-medium text-gray-400">
                            {item.time}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50/90 via-white to-white p-4 shadow-sm lg:col-span-2">
                    <div className="flex gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-violet-100">
                        <Sparkles className="h-4 w-4 text-violet-600" />
                      </div>
                      <div>
                        <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-600">
                          AI insight
                        </p>
                        <p className="mt-1 text-sm font-semibold text-gray-900">
                          {DASHBOARD_PREVIEW_INSIGHT.title}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-gray-500">
                          {DASHBOARD_PREVIEW_INSIGHT.body}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
