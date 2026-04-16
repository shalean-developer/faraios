"use client";

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Bell,
  FolderPlus,
  UserCheck,
  UserPlus,
  CheckCircle2,
  StickyNote,
  Upload,
  Filter,
  Check,
  ChevronRight,
  LayoutDashboard,
  GitBranch,
  Users,
  Users2,
  BarChart3,
  Settings,
  Zap,
  Shield,
} from "lucide-react";

import type { AdminActivityCategory, AdminActivityItem } from "@/types/admin";

type ActiveNav = "dashboard" | "pipeline" | "team" | "analytics" | "settings" | "clients";

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

const FILTER_TABS: { key: AdminActivityCategory; label: string }[] = [
  { key: "all", label: "All" },
  { key: "projects", label: "Projects" },
  { key: "team", label: "Team" },
  { key: "clients", label: "Clients" },
];

const ICONS = {
  bell: Bell,
  folderPlus: FolderPlus,
  userCheck: UserCheck,
  userPlus: UserPlus,
  checkCircle2: CheckCircle2,
  stickyNote: StickyNote,
  upload: Upload,
} as const;

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35 } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

const stagger = {
  visible: { transition: { staggerChildren: 0.06 } },
  hidden: {},
};

const emptyAnim = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.35 } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.2 } },
};

export function FaraiActivityFeed({
  items,
  adminEmail,
  adminDisplayName,
}: {
  items: AdminActivityItem[];
  adminEmail: string | null;
  adminDisplayName: string;
}) {
  const [activeNav] = useState<ActiveNav>("dashboard");
  const [activeFilter, setActiveFilter] = useState<AdminActivityCategory>("all");
  const [allRead, setAllRead] = useState(false);

  const filtered = useMemo(
    () =>
      items
        .filter((item) => activeFilter === "all" || item.category === activeFilter)
        .map((item) => ({ ...item, unread: allRead ? false : item.unread })),
    [activeFilter, allRead, items]
  );

  const todayItems = filtered.filter((i) => i.group === "today");
  const weekItems = filtered.filter((i) => i.group === "week");
  const unreadCount = allRead ? 0 : items.filter((i) => i.unread).length;
  const totalFiltered = filtered.length;

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
              return (
                <Link key={item.key} href={item.href} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400 transition-all duration-150 hover:bg-slate-800 hover:text-white">
                  <Icon className="h-4 w-4 flex-shrink-0 text-slate-500" />
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
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="text-sm font-medium text-gray-400">Dashboard</span>
            <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-300" />
            <span className="text-sm font-extrabold tracking-tight text-gray-900">Notifications</span>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            <button type="button" className="flex items-center gap-2 rounded-xl border border-gray-200 px-4 py-2 text-xs font-semibold text-gray-700 transition-all hover:border-gray-300 hover:text-gray-900">
              <Filter className="h-3.5 w-3.5" />
              <span>Filter</span>
            </button>
            <button type="button" onClick={() => setAllRead(true)} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-indigo-200 transition-all hover:bg-indigo-700">
              <Check className="h-3.5 w-3.5" />
              <span>Mark all read</span>
            </button>
            <button type="button" className="relative flex h-9 w-9 items-center justify-center rounded-xl text-gray-500 transition-all hover:bg-gray-100 hover:text-gray-800">
              <Bell className="h-[18px] w-[18px]" />
              {unreadCount > 0 ? <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-indigo-500" /> : null}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto max-w-4xl space-y-5">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="rounded-2xl border border-gray-100 bg-white px-6 py-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h1 className="text-lg font-extrabold tracking-tight text-gray-900">Activity</h1>
                  <p className="mt-0.5 text-xs text-gray-400">Real-time updates across your workspace</p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-xl border border-gray-100 bg-gray-50 px-3 py-1.5 text-xs font-bold text-gray-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                    <span>{items.length} Total</span>
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                    <span>{unreadCount} Unread</span>
                  </span>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-2">
                {FILTER_TABS.map((tab) => (
                  <button key={tab.key} type="button" onClick={() => setActiveFilter(tab.key)} className={`rounded-xl px-4 py-2 text-xs font-bold transition-all duration-150 ${activeFilter === tab.key ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200" : "border border-gray-100 bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700"}`}>
                    {tab.label}
                  </button>
                ))}
              </div>
            </motion.div>

            <AnimatePresence mode="wait">
              {totalFiltered === 0 ? (
                <motion.div key="empty" variants={emptyAnim} initial="hidden" animate="visible" exit="exit" className="flex flex-col items-center justify-center rounded-2xl border border-gray-100 bg-white px-6 py-16 shadow-sm">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50">
                    <Bell className="h-6 w-6 text-indigo-400" />
                  </div>
                  <p className="text-sm font-extrabold tracking-tight text-gray-800">No activity found</p>
                  <p className="mt-1.5 max-w-xs text-center text-xs text-gray-400">There are no notifications matching this filter. Try switching to All.</p>
                </motion.div>
              ) : (
                <motion.div key="feed" className="space-y-4">
                  {[{ label: "Today", rows: todayItems }, { label: "This Week", rows: weekItems }].map((group, gi) =>
                    group.rows.length > 0 ? (
                      <motion.div key={group.label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.38, delay: gi * 0.08 }} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                        <div className="flex items-center gap-3 border-b border-gray-50 px-6 py-4">
                          <h2 className="text-sm font-extrabold tracking-tight text-gray-900">{group.label}</h2>
                          <span className="rounded-lg border border-gray-100 bg-gray-50 px-2 py-0.5 text-[10px] font-bold text-gray-500">{group.rows.length} items</span>
                        </div>
                        <div className="px-6 py-4">
                          <div className="relative">
                            <div className="absolute bottom-2 left-3.5 top-2 w-px bg-gray-100" />
                            <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-5">
                              {group.rows.map((item) => {
                                const Icon = ICONS[item.iconKey];
                                return (
                                  <motion.div key={item.id} variants={fadeUp} className={`flex gap-4 rounded-xl transition-all ${item.unread ? "border border-indigo-100/80 bg-indigo-50/60 -mx-2 px-2 py-2" : ""}`}>
                                    <div className="flex flex-shrink-0 flex-col items-center">
                                      <div className={`z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white shadow-sm ${item.iconBg}`}>
                                        <Icon className={`h-3.5 w-3.5 ${item.iconColor}`} />
                                      </div>
                                    </div>
                                    <div className="min-w-0 flex-1 pb-1">
                                      <div className="flex items-center justify-between gap-2">
                                        <div className="flex min-w-0 items-center gap-2">
                                          <p className="text-xs font-bold leading-tight text-gray-800">{item.title}</p>
                                          {item.unread ? <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-indigo-500" /> : null}
                                        </div>
                                        <span className="flex-shrink-0 text-[10px] font-semibold text-gray-400">{item.time}</span>
                                      </div>
                                      <p className="mt-0.5 text-[11px] leading-relaxed text-gray-500">{item.description}</p>
                                    </div>
                                  </motion.div>
                                );
                              })}
                            </motion.div>
                          </div>
                        </div>
                      </motion.div>
                    ) : null
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
