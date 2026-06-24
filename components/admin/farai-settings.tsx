"use client";

import React, { useEffect, useState, useTransition } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
} from "lucide-react";

import {
  adminAddPlatformAdminByEmail,
  adminRemovePlatformAdmin,
  adminUpdateNotificationPreferences,
  adminUpdatePlatformSettings,
} from "@/app/actions/admin";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type {
  AdminAuditLogRow,
  AdminNotificationPreferences,
  AdminPlatformSettings,
} from "@/types/admin";

type SettingsTab = "general" | "users" | "notifications" | "security" | "billing";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  initials: string;
  color: string;
}

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
  platformSettings,
  notificationPreferences,
  auditLogs,
  initialTab = "general",
}: {
  adminUsers: AdminUser[];
  adminEmail: string | null;
  platformSettings: AdminPlatformSettings;
  notificationPreferences: AdminNotificationPreferences;
  auditLogs: AdminAuditLogRow[];
  initialTab?: SettingsTab;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [companyName, setCompanyName] = useState(platformSettings.companyName);
  const [platformName, setPlatformName] = useState(platformSettings.platformName);

  const [admins, setAdmins] = useState<AdminUser[]>(adminUsers);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newEmail, setNewEmail] = useState("");

  const [emailAlerts, setEmailAlerts] = useState(notificationPreferences.emailAlerts);
  const [projectUpdates, setProjectUpdates] = useState(
    notificationPreferences.projectUpdates
  );
  const [clientActivity, setClientActivity] = useState(
    notificationPreferences.clientActivity
  );

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [twoFactor, setTwoFactor] = useState(false);

  const tabLabel =
    SETTINGS_TABS.find((tab) => tab.key === activeTab)?.label ?? "General";

  useEffect(() => {
    setAdmins(adminUsers);
  }, [adminUsers]);

  useEffect(() => {
    setCompanyName(platformSettings.companyName);
    setPlatformName(platformSettings.platformName);
  }, [platformSettings]);

  useEffect(() => {
    setEmailAlerts(notificationPreferences.emailAlerts);
    setProjectUpdates(notificationPreferences.projectUpdates);
    setClientActivity(notificationPreferences.clientActivity);
  }, [notificationPreferences]);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const selectTab = (tab: SettingsTab) => {
    setActiveTab(tab);
    const href =
      tab === "general" ? "/admin/settings" : `/admin/settings?tab=${tab}`;
    router.replace(href, { scroll: false });
  };

  const handleRemoveAdmin = (id: string) => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await adminRemovePlatformAdmin(id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setAdmins((prev) => prev.filter((a) => a.id !== id));
      setMessage("Admin access removed.");
      router.refresh();
    });
  };

  const handleAddAdmin = () => {
    if (!newEmail.trim()) return;
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await adminAddPlatformAdminByEmail(newEmail);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNewName("");
      setNewEmail("");
      setShowAddForm(false);
      setMessage("Admin added successfully.");
      router.refresh();
    });
  };

  const handleSaveGeneral = () => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await adminUpdatePlatformSettings({
        companyName,
        platformName,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("General settings saved.");
      router.refresh();
    });
  };

  const handleSaveNotifications = () => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await adminUpdateNotificationPreferences({
        emailAlerts,
        projectUpdates,
        clientActivity,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("Notification preferences saved.");
    });
  };

  const handleChangePassword = () => {
    setError(null);
    setMessage(null);
    if (!adminEmail) {
      setError("Sign in again to change your password.");
      return;
    }
    if (newPw.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    if (newPw !== confirmPw) {
      setError("New passwords do not match.");
      return;
    }

    startTransition(async () => {
      const supabase = getSupabaseBrowserClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: adminEmail,
        password: currentPw,
      });
      if (signInError) {
        setError("Current password is incorrect.");
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPw,
      });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      setCurrentPw("");
      setNewPw("");
      setConfirmPw("");
      setMessage("Password updated successfully.");
    });
  };

  const inputClass =
    "w-full bg-white rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition-all";

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-4 border-b border-gray-100 bg-white px-6 shadow-sm">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="text-sm font-medium text-gray-400">Settings</span>
            <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-300" />
            <span className="text-sm font-extrabold tracking-tight text-gray-900">{tabLabel}</span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-6 py-6">
          <div className="mx-auto max-w-4xl space-y-5">
            {error ? (
              <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
                {error}
              </p>
            ) : null}
            {message ? (
              <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
                {message}
              </p>
            ) : null}
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
              <h1 className="text-xl font-extrabold tracking-tight text-gray-900">Settings</h1>
              <p className="mt-1 text-xs text-gray-400">Manage your workspace preferences and configuration.</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.38, delay: 0.05 }} className="flex flex-wrap items-center gap-2">
              {SETTINGS_TABS.map((tab) => (
                <button key={tab.key} type="button" onClick={() => selectTab(tab.key)} className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-bold transition-all duration-150 ${activeTab === tab.key ? "bg-indigo-600 text-white shadow-sm shadow-indigo-200" : "border border-gray-100 bg-gray-50 text-gray-500 hover:bg-gray-100 hover:text-gray-700"}`}>
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
                      <button type="button" onClick={handleSaveGeneral} disabled={isPending} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm shadow-indigo-200 transition-all hover:bg-indigo-700 disabled:opacity-60">
                        <Check className="h-3.5 w-3.5" />
                        <span>{isPending ? "Saving…" : "Save Changes"}</span>
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
                      {admins.length === 0 ? (
                        <p className="px-6 py-8 text-center text-xs text-gray-400">
                          No platform admins found. Add an admin by email below.
                        </p>
                      ) : null}
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
                    <div className="mt-5 flex justify-end">
                      <button type="button" onClick={handleSaveNotifications} disabled={isPending} className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm shadow-indigo-200 transition-all hover:bg-indigo-700 disabled:opacity-60">
                        <Check className="h-3.5 w-3.5" />
                        <span>{isPending ? "Saving…" : "Save Preferences"}</span>
                      </button>
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
                    <div className="flex justify-end">
                      <button type="button" onClick={handleChangePassword} disabled={isPending} className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm transition-all hover:bg-indigo-700 disabled:opacity-60">
                        {isPending ? "Updating…" : "Update Password"}
                      </button>
                    </div>
                  </section>

                  <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                    <h2 className="mb-1 text-sm font-extrabold tracking-tight text-gray-900">Two-Factor Authentication</h2>
                    <p className="mb-5 text-[11px] text-gray-400">Full 2FA enrollment is coming soon. You can mark your preference now.</p>
                    <div className="flex items-center justify-between gap-4 pb-5">
                      <div>
                        <p className="text-xs font-bold text-gray-800">Enable 2FA</p>
                        <p className="mt-0.5 text-[10px] text-gray-400">Require a second authentication step on login.</p>
                      </div>
                      <Toggle enabled={twoFactor} onChange={() => setTwoFactor((v) => !v)} />
                    </div>
                  </section>

                  <section className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
                    <div className="flex items-center justify-between gap-3 border-b border-gray-50 px-6 py-4">
                      <h2 className="text-sm font-extrabold tracking-tight text-gray-900">Platform Audit Log</h2>
                      <Link
                        href="/admin/activity"
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-700"
                      >
                        View all activity
                      </Link>
                    </div>
                    {auditLogs.length === 0 ? (
                      <p className="px-6 py-8 text-center text-xs text-gray-400">
                        No audit events yet. Admin actions will appear here once recorded.
                      </p>
                    ) : (
                      <ul className="divide-y divide-gray-50">
                        {auditLogs.map((entry) => (
                          <li key={entry.id} className="px-6 py-3.5">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-gray-900">{entry.action}</p>
                                <p className="mt-0.5 truncate text-[10px] text-gray-400">
                                  {entry.targetLabel ?? entry.targetType}
                                  {entry.actorEmail ? ` · ${entry.actorEmail}` : ""}
                                </p>
                              </div>
                              <span className="flex-shrink-0 text-[10px] text-gray-400">{entry.createdAt}</span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
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
    </>
  );
}
