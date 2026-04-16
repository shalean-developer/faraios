"use client";

import Link from "next/link";
import React, { useState } from "react";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  GitBranch,
  Users,
  Users2,
  Zap,
  Bell,
  Shield,
  BarChart3,
  Settings,
  Layers,
  CheckCircle2,
  TrendingUp,
  Sparkles,
  Trophy,
  Clock,
  ArrowUpRight,
  DollarSign,
  UserCheck,
  CircleDot,
  Clock4,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { AdminAnalyticsData } from "@/types/admin";

type ActiveNav = "dashboard" | "pipeline" | "team" | "clients" | "analytics" | "settings";

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard, href: "/admin/dashboard" },
  { key: "pipeline", label: "Project Pipeline", icon: GitBranch, href: "/admin" },
  { key: "team", label: "Team", icon: Users, href: "/admin/team" },
  { key: "clients", label: "Clients", icon: Users2, href: "/admin/clients" },
] as const;

const SYSTEM_NAV_ITEMS = [
  { key: "analytics", label: "Analytics", icon: BarChart3, href: "/admin/analytics" },
  { key: "settings", label: "Settings", icon: Settings, href: "/admin/settings" },
] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const stagger = { visible: { transition: { staggerChildren: 0.07 } } };

const trophyColors = ["text-amber-400", "text-slate-400", "text-orange-400", "text-slate-300"];

const usdNumberFormat = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

function formatUsd(value: number): string {
  return `$${usdNumberFormat.format(value)}`;
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number; name?: string }[];
  label?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 shadow-xl">
        <p className="mb-0.5 text-xs font-bold text-white">{label}</p>
        {payload.map((entry, i) => (
          <p key={`${entry.name ?? "v"}-${i}`} className="text-xs font-semibold text-indigo-300">
            {entry.name ? `${entry.name}: ` : ""}
            {entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const RevenueTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 shadow-xl">
        <p className="mb-0.5 text-xs font-bold text-white">{label}</p>
        <p className="text-xs font-semibold text-violet-300">{formatUsd(payload[0]!.value)}</p>
      </div>
    );
  }
  return null;
};

const DonutLabel = ({
  viewBox,
  total,
}: {
  viewBox?: { cx: number; cy: number };
  total: number;
}) => {
  const { cx, cy } = viewBox ?? { cx: 0, cy: 0 };
  return (
    <g>
      <text
        x={cx}
        y={cy - 8}
        textAnchor="middle"
        dominantBaseline="middle"
        className="fill-gray-900 text-xl font-extrabold"
        style={{ fontSize: 22, fontWeight: 800 }}
      >
        {total}
      </text>
      <text
        x={cx}
        y={cy + 14}
        textAnchor="middle"
        dominantBaseline="middle"
        style={{ fontSize: 11, fill: "#6b7280", fontWeight: 600 }}
      >
        Projects
      </text>
    </g>
  );
};

export function FaraiAdminAnalytics({
  analytics,
  adminEmail,
  adminDisplayName,
}: {
  analytics: AdminAnalyticsData;
  adminEmail: string | null;
  adminDisplayName: string;
}) {
  const [activeNav] = useState<ActiveNav>("analytics");
  return (
    <div className="flex h-screen w-full overflow-hidden font-sans" style={{ background: "#f8f7ff" }}>
      <aside className="flex h-full w-60 flex-shrink-0 flex-col bg-slate-900">
        <div className="flex h-16 flex-shrink-0 items-center gap-3 border-b border-slate-800 px-5">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0">
            <span className="block text-base font-bold leading-tight tracking-tight text-white">FaraiOS</span>
            <span className="text-[10px] font-semibold uppercase tracking-widest text-indigo-300">Admin</span>
          </div>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-5">
          <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Navigation</p>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.key;
            return (
              <Link key={item.key} href={item.href} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${isActive ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/40" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}>
                <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? "text-white" : "text-slate-500"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}

          <div className="pt-5">
            <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">System</p>
            {SYSTEM_NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeNav === item.key;
              return (
                <Link key={item.key} href={item.href} className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${isActive ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/40" : "text-slate-400 hover:bg-slate-800 hover:text-white"}`}>
                  <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? "text-white" : "text-slate-500"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <div className="flex-shrink-0 border-t border-slate-800 px-4 py-4">
          <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-800 px-3 py-2.5">
            <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
              <Shield className="h-3.5 w-3.5 text-white" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold text-white">{adminDisplayName}</p>
              <p className="truncate text-[10px] text-slate-400">{adminEmail ?? "—"}</p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-16 flex-shrink-0 items-center gap-4 border-b border-gray-100 bg-white px-6 shadow-sm">
          <div className="min-w-0 flex-1">
            <h1 className="text-lg font-extrabold leading-tight tracking-tight text-gray-900">Analytics</h1>
            <p className="mt-0.5 text-xs text-gray-400">Platform-wide insights and performance metrics</p>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600">
            <TrendingUp className="h-3.5 w-3.5" />
            <span>{analytics.monthLabel}</span>
          </div>
          <Link href="/admin/activity" className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-gray-500 transition-all hover:bg-gray-100 hover:text-gray-800">
            <Bell className="h-[18px] w-[18px]" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-indigo-500" />
          </Link>
        </header>

        <main className="flex-1 overflow-y-auto px-6 py-6">
          <motion.div initial="hidden" animate="visible" variants={stagger} className="mx-auto max-w-7xl space-y-5">
            <motion.div variants={fadeUp} className="grid grid-cols-4 gap-4">
              {[
                { label: "Total Projects", value: String(analytics.totalProjects), icon: Layers, iconBg: "bg-indigo-50", iconColor: "text-indigo-600", accent: "from-indigo-500 to-violet-500", sub: "All-time projects" },
                { label: "Completed", value: String(analytics.completedProjects), icon: CheckCircle2, iconBg: "bg-emerald-50", iconColor: "text-emerald-600", accent: "from-emerald-400 to-teal-400", sub: `${analytics.totalProjects > 0 ? Math.round((analytics.completedProjects / analytics.totalProjects) * 100) : 0}% completion rate` },
                { label: "Revenue", value: formatUsd(analytics.revenueTotal), icon: DollarSign, iconBg: "bg-violet-50", iconColor: "text-violet-600", accent: "from-violet-400 to-purple-500", sub: "Estimated setup revenue" },
                { label: "Active Clients", value: String(analytics.activeClients), icon: UserCheck, iconBg: "bg-blue-50", iconColor: "text-blue-600", accent: "from-blue-400 to-indigo-400", sub: "Non-pending projects" },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md">
                    <div className="mb-3 flex items-center justify-between">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${stat.iconBg}`}>
                        <Icon className={`h-4 w-4 ${stat.iconColor}`} />
                      </div>
                      <Sparkles className="h-3.5 w-3.5 text-gray-200" />
                    </div>
                    <p className="mb-0.5 text-2xl font-extrabold text-gray-900">{stat.value}</p>
                    <p className="text-xs font-semibold text-gray-500">{stat.label}</p>
                    <p className="mt-1 flex items-center gap-1 text-[10px] text-gray-400">
                      <ArrowUpRight className="h-3 w-3 text-emerald-400" />
                      <span>{stat.sub}</span>
                    </p>
                    <div className={`mt-3 h-0.5 rounded-full bg-gradient-to-r ${stat.accent} opacity-50`} />
                  </div>
                );
              })}
            </motion.div>

            <motion.div variants={fadeUp} className="grid grid-cols-3 gap-5">
              <div className="col-span-2 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-gray-900">Projects Over Time</h2>
                    <p className="mt-0.5 text-xs text-gray-400">Last 6 months cumulative growth</p>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-lg border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-600">
                    <CircleDot className="h-3 w-3" />
                    <span>6 months</span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={analytics.projectsOverTime} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="indigo-area" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 600 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="value" name="projects" stroke="#6366f1" strokeWidth={2.5} fill="url(#indigo-area)" dot={{ fill: "#6366f1", r: 4, strokeWidth: 2, stroke: "#fff" }} activeDot={{ r: 6, fill: "#6366f1", stroke: "#fff", strokeWidth: 2 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="flex flex-col rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="mb-4">
                  <h2 className="text-sm font-bold text-gray-900">Status Breakdown</h2>
                  <p className="mt-0.5 text-xs text-gray-400">All projects by current status</p>
                </div>
                <div className="flex flex-1 items-center justify-center">
                  <ResponsiveContainer width="100%" height={160}>
                    <PieChart>
                      <Pie data={analytics.statusBreakdown} cx="50%" cy="50%" innerRadius={55} outerRadius={75} dataKey="value" strokeWidth={0} labelLine={false}>
                        {analytics.statusBreakdown.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                        <Label content={<DonutLabel total={analytics.totalProjects} />} position="center" />
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2">
                  {analytics.statusBreakdown.map((entry) => (
                    <div key={entry.name} className="flex items-center gap-1.5">
                      <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: entry.color }} />
                      <span className="truncate text-[10px] font-medium text-gray-500">{entry.name}</span>
                      <span className="ml-auto text-[10px] font-bold text-gray-700">{entry.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            <motion.div variants={fadeUp} className="grid grid-cols-2 gap-5">
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-gray-900">Projects per Developer</h2>
                    <p className="mt-0.5 text-xs text-gray-400">Current team workload distribution</p>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={analytics.developerWorkload} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="dev-bar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#8b5cf6" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 600 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="projects" fill="url(#dev-bar)" radius={[6, 6, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-gray-900">Monthly Revenue</h2>
                    <p className="mt-0.5 text-xs text-gray-400">Estimated setup revenue (last 6 months)</p>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600">
                    <DollarSign className="h-3 w-3" />
                    <span>{formatUsd(analytics.revenueTotal)} total</span>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={analytics.monthlyRevenue} margin={{ top: 4, right: 4, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="rev-bar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#8b5cf6" />
                        <stop offset="100%" stopColor="#6d28d9" />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11, fill: "#94a3b8", fontWeight: 600 }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
                    <Tooltip content={<RevenueTooltip />} />
                    <Bar dataKey="value" fill="url(#rev-bar)" radius={[6, 6, 0, 0]} maxBarSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </motion.div>

            <motion.div variants={fadeUp} className="grid grid-cols-2 gap-5">
              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-gray-900">Top Developers</h2>
                    <p className="mt-0.5 text-xs text-gray-400">Ranked by project completion</p>
                  </div>
                  <Trophy className="h-4 w-4 text-amber-400" />
                </div>
                <div className="space-y-4">
                  {analytics.topDevelopers.map((dev, idx) => (
                    <div key={`${dev.name}-${idx}`} className="flex items-center gap-4">
                      <div className="flex w-6 flex-shrink-0 items-center justify-center">
                        <Trophy className={`h-4 w-4 ${trophyColors[idx] ?? "text-gray-300"}`} />
                      </div>
                      <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500">
                        <span className="text-xs font-bold text-white">{dev.name[0]}</span>
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-center justify-between">
                          <span className="text-xs font-semibold text-gray-800">{dev.name}</span>
                          <span className="text-[10px] font-bold text-gray-400">{dev.projects} project{dev.projects !== 1 ? "s" : ""}</span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-gray-100">
                          <div className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-500" style={{ width: `${dev.progress}%` }} />
                        </div>
                      </div>
                      <span className={`flex-shrink-0 rounded-lg px-2 py-0.5 text-[10px] font-bold ${idx === 0 ? "border border-indigo-100 bg-indigo-50 text-indigo-700" : "border border-gray-100 bg-gray-50 text-gray-500"}`}>
                        {dev.badge}
                      </span>
                    </div>
                  ))}
                  {analytics.topDevelopers.length === 0 ? <p className="text-xs text-gray-400">No assigned developers yet.</p> : null}
                </div>
              </div>

              <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="text-sm font-bold text-gray-900">Activity Log</h2>
                    <p className="mt-0.5 text-xs text-gray-400">Recent project updates and transitions</p>
                  </div>
                  <div className="flex items-center gap-1.5 rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-1 text-xs font-semibold text-gray-500">
                    <Clock4 className="h-3 w-3" />
                    <span>Live</span>
                  </div>
                </div>
                <div className="relative">
                  <div className="absolute bottom-2 left-3 top-2 w-px bg-gray-100" />
                  <div className="space-y-4">
                    {analytics.activityLog.map((entry) => (
                      <div key={entry.id} className="flex items-start gap-4 pl-1">
                        <div className={`relative z-10 mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full ${entry.color} shadow-sm`}>
                          <span className="h-1.5 w-1.5 rounded-full bg-white" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs leading-snug text-gray-700">
                            <strong className="font-semibold text-gray-900">{entry.project}</strong>
                            <span> {entry.action} </span>
                            <span className={`font-semibold ${entry.color.replace("bg-", "text-").replace("-500", "-600")}`}>{entry.status}</span>
                          </p>
                          <div className="mt-0.5 flex items-center gap-1">
                            <Clock className="h-3 w-3 text-gray-300" />
                            <span className="text-[10px] font-medium text-gray-400">{entry.time}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {analytics.activityLog.length === 0 ? <p className="text-xs text-gray-400">No recent activity.</p> : null}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
