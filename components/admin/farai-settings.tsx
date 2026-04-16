"use client";

import React, { useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import {
  Settings,
  Shield,
  Bell,
  Users,
  CreditCard,
  Upload,
  Trash2,
  Plus,
  Check,
  ChevronRight,
  LayoutDashboard,
  GitBranch,
  Users2,
  BarChart3,
  Zap,
} from "lucide-react";

import {
  adminAddPlatformAdminByEmail,
  adminRemovePlatformAdmin,
} from "@/app/actions/admin";

type ActiveNav = "dashboard" | "pipeline" | "team" | "analytics" | "settings" | "clients";
type SettingsTab = "general" | "users" | "notifications" | "security" | "billing";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  initials: string;
  color: string;
}

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

const SETTINGS_TABS: {
  key: SettingsTab;
  label: string;
  icon: React.ElementType;
}[] = [
  { key: "general", label: "General", icon: Settings },
  { key: "users", label: "User Management", icon: Users },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "security", label: "Security", icon: Shield },
  { key: "billing", label: "Billing", icon: CreditCard },
];

const tabAnim = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.32 } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
};

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${enabled ? "bg-indigo-600" : "bg-gray-200"}`}
      role="switch"
      aria-checked={enabled}
    >
      <span className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${enabled ? "translate-x-5" : "translate-x-0"}`} />
    </button>
  );
}

export function FaraiSettings({
  adminUsers,
  adminEmail,
  adminDisplayName,
}: {
  adminUsers: AdminUser[];
  adminEmail: string | null;
  adminDisplayName: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [activeNav] = useState<ActiveNav>("settings");
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");

  const [companyName, setCompanyName] = useState("Farai Creative Studio");
  const [platformName, setPlatformName] = useState("FaraiOS");

  const [admins, setAdmins] = useState<AdminUser[]>(adminUsers);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");

  const [emailAlerts, setEmailAlerts] = useState(true);
  const [projectUpdates, setProjectUpdates] = useState(true);
  const [clientActivity, setClientActivity] = useState(false);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [twoFactor, setTwoFactor] = useState(false);

  const handleRemoveAdmin = (id: string) => {
    startTransition(async () => {
      const result = await adminRemovePlatformAdmin(id);
      if (result.ok) {
        setAdmins((prev) => prev.filter((a) => a.id !== id));
      }
    });
  };

  const handleAddAdmin = () => {
    if (!newEmail.trim()) return;
    startTransition(async () => {
      const result = await adminAddPlatformAdminByEmail(newEmail);
      if (!result.ok) return;
      const initials = (newName.trim() || newEmail.trim())
        .split(" ")
        .map((n) => n[0] ?? "")
        .join("")
        .slice(0, 2)
        .toUpperCase();
      setAdmins((prev) => [
        ...prev,
        {
          id: `tmp-${Date.now()}`,
          name: newName.trim() || newEmail.split("@")[0] || "Admin",
          email: newEmail.trim(),
          role: "Admin",
          initials,
          color: "from-amber-500 to-orange-600",
        },
      ]);
      setNewName("");
      setNewEmail("");
      setShowAddForm(false);
    });
  };

  const inputClass =
    "w-full bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all";

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
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="text-sm font-medium text-gray-400">Settings</span>
            <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-300" />
            <span className="text-sm font-extrabold tracking-tight text-gray-900">General</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto max-w-4xl space-y-5">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <h1 className="text-xl font-extrabold tracking-tight text-gray-900">Settings</h1>
              <p className="mt-1 text-xs text-gray-400">Manage your workspace preferences and configuration.</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.38, delay: 0.05 }} className="flex flex-wrap items-center gap-2">
              {SETTINGS_TABS.map((tab) => (
                <button key={tab.key} type="button" onClick={() => setActiveTab(tab.key)} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all duration-150 ${activeTab === tab.key ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200" : "border border-gray-100 bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700"}`}>
                  {tab.label}
                </button>
              ))}
            </motion.div>

            <AnimatePresence mode="wait">
              {activeTab === "general" ? (
                <motion.div key="general" variants={tabAnim} initial="hidden" animate="visible" exit="exit" className="space-y-4">
                  <section className="space-y-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                    <h2 className="text-sm font-extrabold tracking-tight text-gray-900">Company Info</h2>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold tracking-tight text-gray-500">Company Name</label>
                        <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} className={inputClass} placeholder="Your company name" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold tracking-tight text-gray-500">Platform Name</label>
                        <input type="text" value={platformName} onChange={(e) => setPlatformName(e.target.value)} className={inputClass} placeholder="Platform name" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold tracking-tight text-gray-500">Company Logo</label>
                      <div className="group flex w-full cursor-pointer items-center justify-center rounded-xl border-2 border-dashed border-gray-200 py-8 transition-all hover:border-indigo-300 hover:bg-indigo-50/30">
                        <div className="flex flex-col items-center gap-2">
                          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 transition-colors group-hover:bg-indigo-100">
                            <Upload className="h-5 w-5 text-indigo-400" />
                          </div>
                          <p className="text-xs font-semibold text-gray-500 transition-colors group-hover:text-indigo-600">Click to upload logo</p>
                          <p className="text-[10px] text-gray-400">PNG, JPG, SVG up to 2MB</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button type="button" className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm shadow-indigo-200 transition-all hover:bg-indigo-700">
                        <Check className="h-3.5 w-3.5" />
                        <span>Save Changes</span>
                      </button>
                    </div>
                  </section>
                </motion.div>
              ) : null}

              {activeTab === "users" ? (
                <motion.div key="users" variants={tabAnim} initial="hidden" animate="visible" exit="exit" className="space-y-4">
                  <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                    <div className="flex items-center justify-between gap-3 border-b border-gray-50 px-6 py-4">
                      <h2 className="text-sm font-extrabold tracking-tight text-gray-900">Admin Accounts</h2>
                      <button type="button" onClick={() => setShowAddForm((v) => !v)} className="flex items-center gap-1.5 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 transition-all hover:bg-indigo-100">
                        <Plus className="h-3.5 w-3.5" />
                        <span>Add Admin</span>
                      </button>
                    </div>

                    <AnimatePresence>
                      {showAddForm ? (
                        <motion.div key="add-form" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
                          <div className="flex flex-col gap-3 border-b border-indigo-100/80 bg-indigo-50/50 px-6 py-4 sm:flex-row">
                            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Full name (optional)" className={inputClass} />
                            <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="Email address" className={inputClass} />
                            <button type="button" onClick={handleAddAdmin} disabled={isPending} className="flex flex-shrink-0 items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white transition-all hover:bg-indigo-700 disabled:opacity-50">
                              <Check className="h-3.5 w-3.5" />
                              <span>Add</span>
                            </button>
                          </div>
                        </motion.div>
                      ) : null}
                    </AnimatePresence>

                    <div className="divide-y divide-gray-50">
                      {admins.map((admin) => (
                        <div key={admin.id} className="flex items-center gap-4 px-6 py-3.5 transition-colors hover:bg-gray-50/60">
                          <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${admin.color}`}>
                            <span className="text-[11px] font-extrabold text-white">{admin.initials}</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold leading-tight text-gray-800">{admin.name}</p>
                            <p className="mt-0.5 text-[10px] text-gray-400">{admin.email}</p>
                          </div>
                          <span className="flex-shrink-0 rounded-lg border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[10px] font-extrabold tracking-wide text-indigo-700">{admin.role}</span>
                          <button type="button" onClick={() => handleRemoveAdmin(admin.id)} disabled={isPending} className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-gray-400 transition-all hover:bg-red-50 hover:text-red-500 disabled:opacity-50">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </section>
                </motion.div>
              ) : null}

              {activeTab === "notifications" ? (
                <motion.div key="notifications" variants={tabAnim} initial="hidden" animate="visible" exit="exit" className="space-y-4">
                  <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                    <h2 className="mb-5 text-sm font-extrabold tracking-tight text-gray-900">Alert Preferences</h2>
                    <div className="space-y-5">
                      {[
                        {
                          title: "Email Alerts",
                          description: "Receive activity summaries and alerts via email.",
                          value: emailAlerts,
                          onToggle: () => setEmailAlerts((v) => !v),
                        },
                        {
                          title: "Project Updates",
                          description: "Get notified when milestones or tasks change.",
                          value: projectUpdates,
                          onToggle: () => setProjectUpdates((v) => !v),
                        },
                        {
                          title: "Client Activity",
                          description: "Alerts for client uploads, messages, and new onboards.",
                          value: clientActivity,
                          onToggle: () => setClientActivity((v) => !v),
                        },
                      ].map((item, idx) => (
                        <div key={item.title} className={`flex items-center justify-between gap-4 py-3.5 ${idx < 2 ? "border-b border-gray-50" : ""}`}>
                          <div>
                            <p className="text-xs font-bold text-gray-800">{item.title}</p>
                            <p className="mt-0.5 text-[10px] text-gray-400">{item.description}</p>
                          </div>
                          <Toggle enabled={item.value} onChange={item.onToggle} />
                        </div>
                      ))}
                    </div>
                  </section>
                </motion.div>
              ) : null}

              {activeTab === "security" ? (
                <motion.div key="security" variants={tabAnim} initial="hidden" animate="visible" exit="exit" className="space-y-4">
                  <section className="space-y-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                    <h2 className="text-sm font-extrabold tracking-tight text-gray-900">Change Password</h2>
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-500">Current Password</label>
                        <input type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} className={inputClass} placeholder="••••••••" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-500">New Password</label>
                        <input type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} className={inputClass} placeholder="••••••••" />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-gray-500">Confirm New Password</label>
                        <input type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} className={inputClass} placeholder="••••••••" />
                      </div>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                    <h2 className="mb-1 text-sm font-extrabold tracking-tight text-gray-900">Two-Factor Authentication</h2>
                    <p className="mb-5 text-[11px] text-gray-400">Add an extra layer of security to your account with 2FA.</p>
                    <div className="flex items-center justify-between gap-4 pb-5">
                      <div>
                        <p className="text-xs font-bold text-gray-800">Enable 2FA</p>
                        <p className="mt-0.5 text-[10px] text-gray-400">Require a second authentication step on login.</p>
                      </div>
                      <Toggle enabled={twoFactor} onChange={() => setTwoFactor((v) => !v)} />
                    </div>
                  </section>
                </motion.div>
              ) : null}

              {activeTab === "billing" ? (
                <motion.div key="billing" variants={tabAnim} initial="hidden" animate="visible" exit="exit" className="space-y-4">
                  <div className="flex items-center gap-2.5 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-amber-600">Coming Soon</span>
                    <span className="text-[11px] text-amber-500">Full billing management will be available in an upcoming release.</span>
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
