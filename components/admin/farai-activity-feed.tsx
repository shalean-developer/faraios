"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  FolderPlus,
  UserCheck,
  UserPlus,
  CheckCircle2,
  StickyNote,
  Upload,
  Check,
  Shield,
  LifeBuoy,
  Lightbulb,
} from "lucide-react";

import { AdminPageShell } from "@/components/admin/admin-page-shell";
import {
  riseOutlineButtonClassName,
  risePrimaryButtonClassName,
  riseStatCardClassName,
  riseTableClassName,
} from "@/lib/ui/rise-dashboard-styles";
import type { AdminActivityCategory, AdminActivityItem } from "@/types/admin";

const FILTER_TABS: { key: AdminActivityCategory; label: string }[] = [
  { key: "all", label: "All" },
  { key: "platform", label: "Platform" },
  { key: "operations", label: "Operations" },
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
  shield: Shield,
  lifeBuoy: LifeBuoy,
  lightbulb: Lightbulb,
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

export function FaraiActivityFeed({ items }: { items: AdminActivityItem[] }) {
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
    <AdminPageShell
      title="Activity"
      description="Audit logs, support, feature requests, pipeline, and client events"
      maxWidthClassName="max-w-4xl"
      actions={
        <button
          type="button"
          onClick={() => setAllRead(true)}
          className={risePrimaryButtonClassName}
        >
          <Check className="h-3.5 w-3.5" />
          <span>Mark all read</span>
        </button>
      }
    >
      <div className={`${riseStatCardClassName} px-6 py-5`}>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            <span>{items.length} Total</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-[#5a8dee]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#5a8dee]" />
            <span>{unreadCount} Unread</span>
          </span>
        </div>
        <div className="mt-5 flex flex-wrap items-center gap-2">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveFilter(tab.key)}
              className={
                activeFilter === tab.key
                  ? risePrimaryButtonClassName
                  : riseOutlineButtonClassName
              }
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {totalFiltered === 0 ? (
          <motion.div
            key="empty"
            variants={emptyAnim}
            initial="hidden"
            animate="visible"
            exit="exit"
            className={`flex flex-col items-center justify-center ${riseStatCardClassName} px-6 py-16`}
          >
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100">
              <Bell className="h-6 w-6 text-[#5a8dee]" />
            </div>
            <p className="text-sm font-extrabold tracking-tight text-slate-800">No activity found</p>
            <p className="mt-1.5 max-w-xs text-center text-xs text-slate-500">
              There are no notifications matching this filter. Try switching to All.
            </p>
          </motion.div>
        ) : (
          <motion.div key="feed" className="space-y-4">
            {[
              { label: "Today", rows: todayItems },
              { label: "This Week", rows: weekItems },
            ].map((group, gi) =>
              group.rows.length > 0 ? (
                <motion.div
                  key={group.label}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.38, delay: gi * 0.08 }}
                  className={riseTableClassName}
                >
                  <div className="flex items-center gap-3 border-b border-slate-100 px-6 py-4">
                    <h2 className="text-sm font-extrabold tracking-tight text-slate-900">{group.label}</h2>
                    <span className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-500">
                      {group.rows.length} items
                    </span>
                  </div>
                  <div className="px-6 py-4">
                    <div className="relative">
                      <div className="absolute bottom-2 left-3.5 top-2 w-px bg-slate-100" />
                      <motion.div variants={stagger} initial="hidden" animate="visible" className="space-y-5">
                        {group.rows.map((item) => {
                          const Icon = ICONS[item.iconKey];
                          return (
                            <motion.div
                              key={item.id}
                              variants={fadeUp}
                              className={`flex gap-4 rounded-xl transition-all ${item.unread ? "-mx-2 border border-slate-200 bg-slate-50 px-2 py-2" : ""}`}
                            >
                              <div className="flex flex-shrink-0 flex-col items-center">
                                <div
                                  className={`z-10 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white shadow-sm ${item.iconBg}`}
                                >
                                  <Icon className={`h-3.5 w-3.5 ${item.iconColor}`} />
                                </div>
                              </div>
                              <div className="min-w-0 flex-1 pb-1">
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex min-w-0 items-center gap-2">
                                    {item.href ? (
                                      <Link
                                        href={item.href}
                                        className="text-xs font-bold leading-tight text-slate-800 hover:text-[#5a8dee]"
                                      >
                                        {item.title}
                                      </Link>
                                    ) : (
                                      <p className="text-xs font-bold leading-tight text-slate-800">{item.title}</p>
                                    )}
                                    {item.unread ? (
                                      <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#5a8dee]" />
                                    ) : null}
                                  </div>
                                  <span className="flex-shrink-0 text-[10px] font-semibold text-slate-400">
                                    {item.time}
                                  </span>
                                </div>
                                <p className="mt-0.5 text-[11px] leading-relaxed text-slate-500">
                                  {item.description}
                                </p>
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
    </AdminPageShell>
  );
}
