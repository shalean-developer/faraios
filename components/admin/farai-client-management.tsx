"use client";

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  LayoutDashboard,
  GitBranch,
  Users,
  Zap,
  Bell,
  Shield,
  BarChart3,
  Settings,
  Users2,
  Plus,
  Search,
  X,
  Phone,
  MapPin,
  Calendar,
  Hash,
  ArrowUpRight,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  Pencil,
} from "lucide-react";

import type { AdminClient, AdminClientStats } from "@/types/admin";
import { clientProjectStatusStyles } from "@/lib/constants/admin-status";

type ActiveNav = "dashboard" | "pipeline" | "team" | "analytics" | "settings" | "clients";
type ModalTab = "contact" | "projects" | "notes";

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

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.22 } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15 } },
};

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.2 } },
  exit: { opacity: 0, transition: { duration: 0.15 } },
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function FaraiClientManagement({
  clients,
  stats,
  adminEmail,
  adminDisplayName,
}: {
  clients: AdminClient[];
  stats: AdminClientStats;
  adminEmail: string | null;
  adminDisplayName: string;
}) {
  const [activeNav] = useState<ActiveNav>("clients");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<AdminClient | null>(null);
  const [activeTab, setActiveTab] = useState<ModalTab>("contact");

  const filteredClients = useMemo(
    () =>
      clients.filter((c) => {
        const q = searchQuery.toLowerCase();
        return (
          c.name.toLowerCase().includes(q) ||
          c.business.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q)
        );
      }),
    [clients, searchQuery]
  );

  const statsCards = [
    {
      label: "Total Clients",
      value: String(stats.total),
      color: "text-indigo-600",
      bg: "bg-indigo-50",
      iconColor: "text-indigo-500",
      bar: "from-indigo-500 to-violet-500",
    },
    {
      label: "Active",
      value: String(stats.active),
      color: "text-emerald-600",
      bg: "bg-emerald-50",
      iconColor: "text-emerald-500",
      bar: "from-emerald-400 to-teal-400",
    },
    {
      label: "Inactive",
      value: String(stats.inactive),
      color: "text-gray-500",
      bg: "bg-gray-50",
      iconColor: "text-gray-400",
      bar: "from-gray-300 to-gray-400",
    },
    {
      label: "New This Month",
      value: String(stats.newThisMonth),
      color: "text-blue-600",
      bg: "bg-blue-50",
      iconColor: "text-blue-500",
      bar: "from-blue-400 to-indigo-400",
    },
  ];

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
                {isActive ? <div className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-200" /> : null}
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
            <h1 className="text-lg font-extrabold leading-tight tracking-tight text-gray-900">Clients</h1>
            <p className="mt-0.5 text-xs text-gray-400">Manage all platform clients</p>
          </div>

          <div className="relative w-64 flex-shrink-0">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search clients..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-gray-100 bg-gray-50 py-2 pl-9 pr-4 text-xs font-medium text-gray-700 placeholder:text-gray-400 outline-none transition-all focus:border-indigo-300 focus:bg-white"
            />
          </div>

          <button type="button" className="flex flex-shrink-0 items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-indigo-200 transition-all hover:bg-indigo-700">
            <Plus className="h-3.5 w-3.5" />
            <span>Add Client</span>
          </button>

          <Link href="/admin/activity" className="relative flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl text-gray-500 transition-all hover:bg-gray-100 hover:text-gray-800">
            <Bell className="h-[18px] w-[18px]" />
            <span className="absolute right-2 top-2 h-2 w-2 rounded-full border-2 border-white bg-indigo-500" />
          </Link>
        </header>

        <main className="flex-1 overflow-y-auto px-6 py-6">
          <motion.div initial="hidden" animate="visible" variants={stagger} className="mx-auto max-w-7xl space-y-5">
            <motion.div variants={fadeUp} className="grid grid-cols-4 gap-4">
              {statsCards.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md">
                  <div className="mb-3 flex items-center justify-between">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${stat.bg}`}>
                      <Users2 className={`h-4 w-4 ${stat.iconColor}`} />
                    </div>
                    <ArrowUpRight className="h-3.5 w-3.5 text-gray-200" />
                  </div>
                  <p className={`mb-0.5 text-2xl font-extrabold ${stat.color}`}>{stat.value}</p>
                  <p className="text-xs font-semibold text-gray-500">{stat.label}</p>
                  <div className={`mt-3 h-0.5 rounded-full bg-gradient-to-r ${stat.bar} opacity-50`} />
                </div>
              ))}
            </motion.div>

            <motion.div variants={fadeUp} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-gray-50 px-6 py-4">
                <div>
                  <h2 className="text-sm font-bold text-gray-900">All Clients</h2>
                  <p className="mt-0.5 text-xs text-gray-400">{filteredClients.length} client{filteredClients.length !== 1 ? "s" : ""} found</p>
                </div>
              </div>

              {filteredClients.length === 0 ? (
                <div className="px-6 py-14 text-center">
                  <p className="text-sm font-semibold text-gray-700">No clients found</p>
                  <p className="mt-1 text-xs text-gray-400">Try a different search term.</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-50">
                      <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Client</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Business</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Projects</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Status</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Joined</th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClients.map((client) => (
                    <tr key={client.id} className="border-b border-gray-50 transition-colors duration-100 hover:bg-gray-50">
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-400 to-violet-500 shadow-sm">
                            <span className="text-xs font-bold text-white">{getInitials(client.name)}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-gray-900">{client.name}</p>
                            <p className="truncate text-[10px] text-gray-400">{client.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs font-medium text-gray-700">{client.business}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs font-bold text-gray-900">{client.projectCount}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        {client.status === "Active" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-100 bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-lg border border-gray-100 bg-gray-50 px-2.5 py-1 text-[10px] font-bold text-gray-500">
                            <span className="h-1.5 w-1.5 rounded-full bg-gray-300" />
                            <span>Inactive</span>
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="text-xs font-medium text-gray-500">{client.joined}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => { setSelectedClient(client); setActiveTab("contact"); }} className="flex items-center gap-1 text-xs font-semibold text-indigo-600 transition-colors hover:text-indigo-800">
                            <Eye className="h-3 w-3" />
                            <span>View</span>
                          </button>
                          <span className="text-gray-200">|</span>
                          <button type="button" className="flex items-center gap-1 text-xs font-semibold text-gray-400 transition-colors hover:text-gray-700">
                            <Pencil className="h-3 w-3" />
                            <span>Edit</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </motion.div>
          </motion.div>
        </main>
      </div>

      <AnimatePresence>
        {selectedClient ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div key="backdrop" variants={backdropVariants} initial="hidden" animate="visible" exit="exit" onClick={() => setSelectedClient(null)} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />
            <motion.div key="modal" variants={modalVariants} initial="hidden" animate="visible" exit="exit" className="relative z-10 w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl shadow-slate-900/20">
              <div className="bg-gradient-to-br from-indigo-600 to-violet-600 px-6 pb-5 pt-6">
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl border border-white/30 bg-white/20 shadow-lg backdrop-blur-sm">
                      <span className="text-lg font-extrabold text-white">{getInitials(selectedClient.name)}</span>
                    </div>
                    <div>
                      <h2 className="text-base font-extrabold leading-tight text-white">{selectedClient.name}</h2>
                      <p className="mt-0.5 text-xs text-indigo-200">{selectedClient.email}</p>
                    </div>
                  </div>
                  <button type="button" onClick={() => setSelectedClient(null)} className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl bg-white/10 text-white/80 transition-all hover:bg-white/20 hover:text-white">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex gap-1 rounded-xl bg-white/10 p-1">
                  {(["contact", "projects", "notes"] as ModalTab[]).map((tab) => (
                    <button key={tab} type="button" onClick={() => setActiveTab(tab)} className={`flex-1 rounded-lg py-1.5 text-xs font-semibold capitalize transition-all duration-150 ${activeTab === tab ? "bg-white text-indigo-700 shadow-sm" : "text-white/70 hover:text-white"}`}>
                      {tab === "contact" ? "Contact Info" : tab}
                    </button>
                  ))}
                </div>
              </div>

              <div className="max-h-[380px] overflow-y-auto px-6 py-5">
                {activeTab === "contact" ? (
                  <div className="space-y-3">
                    {[
                      { label: "Phone", value: selectedClient.phone ?? "Not provided", icon: <Phone className="h-3.5 w-3.5 text-indigo-500" />, bg: "bg-indigo-50" },
                      { label: "Location", value: selectedClient.location ?? "Not provided", icon: <MapPin className="h-3.5 w-3.5 text-violet-500" />, bg: "bg-violet-50" },
                      { label: "Joined Date", value: selectedClient.joined, icon: <Calendar className="h-3.5 w-3.5 text-blue-500" />, bg: "bg-blue-50" },
                      { label: "Client ID", value: selectedClient.id.toUpperCase(), icon: <Hash className="h-3.5 w-3.5 text-amber-500" />, bg: "bg-amber-50" },
                      { label: "Business", value: selectedClient.business, icon: <Users2 className="h-3.5 w-3.5 text-emerald-500" />, bg: "bg-emerald-50" },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3">
                        <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg ${row.bg}`}>{row.icon}</div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{row.label}</p>
                          <p className="mt-0.5 text-xs font-semibold text-gray-800">{row.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}

                {activeTab === "projects" ? (
                  <div className="space-y-3">
                    {selectedClient.projects.map((proj) => {
                      const style = clientProjectStatusStyles[proj.status];
                      return (
                        <div key={proj.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 p-3.5 transition-colors hover:bg-gray-100">
                          <div className="min-w-0">
                            <p className="truncate text-xs font-semibold text-gray-800">{proj.name}</p>
                          </div>
                          <span className={`ml-3 inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-[10px] font-bold ${style.bg} ${style.text}`}>
                            <span className={`h-1.5 w-1.5 rounded-full ${style.dot}`} />
                            <span>{proj.status}</span>
                          </span>
                        </div>
                      );
                    })}
                    {selectedClient.projects.length === 0 ? <p className="text-xs text-gray-400">No projects yet.</p> : null}
                  </div>
                ) : null}

                {activeTab === "notes" ? (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-amber-100 bg-amber-50 p-4">
                      <div className="mb-2 flex items-start gap-2">
                        <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-amber-500" />
                        <p className="text-xs font-medium leading-relaxed text-amber-800">{selectedClient.note ?? "No client notes yet."}</p>
                      </div>
                      <div className="mt-2 flex items-center gap-1">
                        <Clock className="h-3 w-3 text-amber-400" />
                        <span className="text-[10px] font-semibold text-amber-500">{selectedClient.noteTime ?? "—"}</span>
                      </div>
                    </div>
                    <div>
                      <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-gray-400">Add a note</label>
                      <textarea placeholder="Write something about this client..." rows={3} className="w-full resize-none rounded-xl border border-gray-100 bg-gray-50 px-4 py-3 text-xs font-medium text-gray-700 placeholder:text-gray-300 outline-none transition-all focus:border-indigo-300 focus:bg-white" />
                      <button type="button" className="mt-2 flex items-center gap-2 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm shadow-indigo-200 transition-all hover:bg-indigo-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        <span>Save Note</span>
                      </button>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="flex items-center justify-between border-t border-gray-50 bg-gray-50/50 px-6 py-4">
                <button type="button" onClick={() => setSelectedClient(null)} className="rounded-xl px-3 py-2 text-xs font-semibold text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-800">Close</button>
                <button type="button" className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm shadow-indigo-200 transition-all hover:bg-indigo-700">
                  <Pencil className="h-3 w-3" />
                  <span>Edit Client</span>
                </button>
              </div>
            </motion.div>
          </div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
