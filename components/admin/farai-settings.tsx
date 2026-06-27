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
  Plug,
  ArrowUpRight,
} from "lucide-react";

import {
  adminAddPlatformAdminByEmail,
  adminRemovePlatformAdmin,
  adminUpdateNotificationPreferences,
  adminUpdatePlatformSettings,
  adminUpdateSearchConsoleIntegration,
  adminUpdateWorkspaceSetupFeeEnabled,
} from "@/app/actions/admin";
import { updatePlatformAdminRole } from "@/app/actions/platform-admin-roles";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import type { PlatformRoleId } from "@/lib/platform/platform-role-definitions";
import type { PlatformAdminRoleRecord } from "@/lib/services/platform-admin-roles";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  riseInputClassName,
} from "@/lib/ui/rise-dashboard-styles";
import { formatZar } from "@/lib/data/pricing";
import { normalizeAdminBillingSettings } from "@/lib/billing/service-catalog";
import type {
  AdminAuditLogRow,
  AdminBillingCheckoutMode,
  AdminBillingSettings,
  AdminNotificationPreferences,
  AdminPlatformSettings,
  AdminSearchConsoleIntegrationSettings,
} from "@/types/admin";

type SettingsTab = "general" | "users" | "notifications" | "security" | "billing" | "integrations";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  platformRoleId: string;
  platformRoleLabel: string;
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
  { key: "integrations", label: "Integrations", icon: Plug },
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

function checkoutBadgeClass(mode: AdminBillingCheckoutMode): string {
  switch (mode) {
    case "paystack":
      return "rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold uppercase text-emerald-700";
    case "managed":
      return "rounded-full bg-violet-50 px-2.5 py-0.5 text-[10px] font-bold uppercase text-violet-700";
    default:
      return "rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-slate-600";
  }
}

function checkoutBadgeLabel(mode: AdminBillingCheckoutMode): string {
  switch (mode) {
    case "paystack":
      return "Paystack checkout";
    case "managed":
      return "Managed service";
    default:
      return "Contact sales";
  }
}

export function FaraiSettings({
  adminUsers,
  platformRoles,
  canManagePlatformRoles,
  adminEmail,
  platformSettings,
  notificationPreferences,
  auditLogs,
  searchConsoleIntegration,
  billingSettings,
  initialTab = "general",
}: {
  adminUsers: AdminUser[];
  platformRoles: PlatformAdminRoleRecord[];
  canManagePlatformRoles: boolean;
  adminEmail: string | null;
  platformSettings: AdminPlatformSettings;
  notificationPreferences: AdminNotificationPreferences;
  auditLogs: AdminAuditLogRow[];
  searchConsoleIntegration: AdminSearchConsoleIntegrationSettings;
  billingSettings?: Partial<AdminBillingSettings> | null;
  initialTab?: SettingsTab;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const billing = normalizeAdminBillingSettings(billingSettings);

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

  const [gscClientId, setGscClientId] = useState(searchConsoleIntegration.clientId);
  const [gscClientSecret, setGscClientSecret] = useState("");
  const [workspaceSetupFeeEnabled, setWorkspaceSetupFeeEnabled] = useState(
    billing.workspaceSetupFeeEnabled
  );

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
    setGscClientId(searchConsoleIntegration.clientId);
    setGscClientSecret("");
  }, [searchConsoleIntegration]);

  useEffect(() => {
    setWorkspaceSetupFeeEnabled(billing.workspaceSetupFeeEnabled);
  }, [billing.workspaceSetupFeeEnabled]);

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

  const handleRoleChange = (userId: string, roleId: PlatformRoleId) => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await updatePlatformAdminRole({ userId, roleId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setAdmins((prev) =>
        prev.map((admin) =>
          admin.id === userId
            ? {
                ...admin,
                platformRoleId: roleId,
                platformRoleLabel:
                  platformRoles.find((role) => role.id === roleId)?.label ?? roleId,
                role:
                  platformRoles.find((role) => role.id === roleId)?.label ?? roleId,
              }
            : admin
        )
      );
      setMessage("Platform role updated.");
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

  const handleSaveIntegrations = () => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await adminUpdateSearchConsoleIntegration({
        clientId: gscClientId,
        clientSecret: gscClientSecret || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setGscClientSecret("");
      setMessage("Google Search Console credentials saved. Customers can now connect.");
      router.refresh();
    });
  };

  const handleSaveWorkspaceSetupFee = () => {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await adminUpdateWorkspaceSetupFeeEnabled(
        workspaceSetupFeeEnabled
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(
        workspaceSetupFeeEnabled
          ? "Workspace setup fees are now charged at first checkout."
          : "Workspace setup fees are off — customers pay monthly only."
      );
      router.refresh();
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

  const inputClass = riseInputClassName;

  return (
    <AdminPageShell title="Settings" description="Manage your workspace preferences and configuration." maxWidthClassName="max-w-4xl">
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
                          {canManagePlatformRoles ? (
                            <select
                              value={admin.platformRoleId}
                              disabled={isPending}
                              onChange={(event) =>
                                handleRoleChange(admin.id, event.target.value as PlatformRoleId)
                              }
                              className="max-w-[180px] flex-shrink-0 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-semibold text-slate-700"
                            >
                              {platformRoles.map((role) => (
                                <option key={role.id} value={role.id}>
                                  {role.label}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="flex-shrink-0 rounded-lg border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[10px] font-extrabold tracking-wide text-indigo-700">
                              {admin.platformRoleLabel}
                            </span>
                          )}
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

              {activeTab === "integrations" ? (
                <motion.div key="integrations" variants={tabAnim} initial="hidden" animate="visible" exit="exit" className="space-y-4">
                  <section className="space-y-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-sm font-extrabold tracking-tight text-gray-900">Google Search Console</h2>
                        <p className="mt-1 text-xs text-gray-500">
                          OAuth credentials used when customers connect Search Console from their SEO dashboard.
                        </p>
                      </div>
                      {searchConsoleIntegration.configured ? (
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase text-emerald-700">
                          Ready
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-[10px] font-bold uppercase text-amber-700">
                          Not configured
                        </span>
                      )}
                    </div>

                    {searchConsoleIntegration.source === "env" ? (
                      <p className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-xs text-indigo-800">
                        Credentials are loaded from server environment variables. Database settings are ignored while env vars are set.
                      </p>
                    ) : null}

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold tracking-tight text-gray-500">OAuth redirect URI</label>
                      <p className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 font-mono text-xs text-gray-700">
                        {searchConsoleIntegration.redirectUri ?? "Set NEXT_PUBLIC_APP_URL to show redirect URI"}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        Add this exact URI as an authorized redirect URI in your Google Cloud OAuth client.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-xs font-semibold tracking-tight text-gray-500">Client ID</label>
                        <input
                          type="text"
                          value={gscClientId}
                          onChange={(e) => setGscClientId(e.target.value)}
                          className={inputClass}
                          placeholder="....apps.googleusercontent.com"
                          disabled={searchConsoleIntegration.source === "env"}
                        />
                      </div>
                      <div className="space-y-1.5 sm:col-span-2">
                        <label className="text-xs font-semibold tracking-tight text-gray-500">Client secret</label>
                        <input
                          type="password"
                          value={gscClientSecret}
                          onChange={(e) => setGscClientSecret(e.target.value)}
                          className={inputClass}
                          placeholder={
                            searchConsoleIntegration.hasClientSecret
                              ? "Leave blank to keep existing secret"
                              : "GOCSPX-..."
                          }
                          disabled={searchConsoleIntegration.source === "env"}
                        />
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={handleSaveIntegrations}
                        disabled={isPending || searchConsoleIntegration.source === "env"}
                        className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white shadow-sm shadow-indigo-200 transition-all hover:bg-indigo-700 disabled:opacity-60"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>{isPending ? "Saving…" : "Save credentials"}</span>
                      </button>
                    </div>
                  </section>
                </motion.div>
              ) : null}

              {activeTab === "billing" ? (
                <motion.div key="billing" variants={tabAnim} initial="hidden" animate="visible" exit="exit" className="space-y-4">
                  <section className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">MRR</p>
                      <p className="mt-2 text-2xl font-extrabold text-gray-900">{formatZar(billing.revenue.mrr)}</p>
                      <p className="mt-1 text-[11px] text-gray-400">From active hosting subscriptions</p>
                    </div>
                    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Active subs</p>
                      <p className="mt-2 text-2xl font-extrabold text-gray-900">{billing.revenue.activeSubscriptions}</p>
                      <p className="mt-1 text-[11px] text-gray-400">Hosting subscriptions</p>
                    </div>
                    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Payments</p>
                      <p className="mt-2 text-2xl font-extrabold text-gray-900">{billing.revenue.successfulPayments}</p>
                      <p className="mt-1 text-[11px] text-gray-400">Successful hosting payments</p>
                    </div>
                  </section>

                  <section className="space-y-5 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h2 className="text-sm font-extrabold tracking-tight text-gray-900">Paystack</h2>
                        <p className="mt-1 text-xs text-gray-500">
                          Workspace subscriptions, hosting, and customer invoice payments.
                        </p>
                      </div>
                      {billing.paystackConfigured ? (
                        <span className="rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-bold uppercase text-emerald-700">
                          Connected
                        </span>
                      ) : (
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-[10px] font-bold uppercase text-amber-700">
                          Not configured
                        </span>
                      )}
                    </div>

                    {billing.paystackSource === "env" ? (
                      <p className="rounded-xl border border-indigo-100 bg-indigo-50 px-4 py-3 text-xs text-indigo-800">
                        Secret key is loaded from the <code className="font-mono">PAYSTACK_SECRET_KEY</code> environment variable.
                      </p>
                    ) : (
                      <p className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs text-amber-800">
                        Set <code className="font-mono">PAYSTACK_SECRET_KEY</code> in your deployment environment to enable checkout and webhooks.
                      </p>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold tracking-tight text-gray-500">App URL</label>
                      <p className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 font-mono text-xs text-gray-700">
                        {billing.appUrl ?? "Set NEXT_PUBLIC_APP_URL for Paystack callbacks and webhooks"}
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold tracking-tight text-gray-500">Primary webhook URL</label>
                      <p className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 font-mono text-xs text-gray-700">
                        {billing.webhookUrl ?? "Requires NEXT_PUBLIC_APP_URL"}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        Register in Paystack for workspace SaaS and customer invoice payments. Event: <code className="font-mono">charge.success</code>.
                      </p>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold tracking-tight text-gray-500">Hosting webhook URL</label>
                      <p className="rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 font-mono text-xs text-gray-700">
                        {billing.hostingWebhookUrl ?? "Requires NEXT_PUBLIC_APP_URL"}
                      </p>
                      <p className="text-[11px] text-gray-400">
                        Optional separate endpoint for hosting invoice payments.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3 pt-1">
                      <Link
                        href="/admin/revenue"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-100"
                      >
                        View revenue
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                      <Link
                        href="/admin/hosting"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2 text-xs font-semibold text-gray-700 transition hover:bg-gray-100"
                      >
                        Manage hosting
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
                    </div>
                  </section>

                  {billing.serviceCategories.map((category) => (
                    <section
                      key={category.key}
                      className="space-y-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm"
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h2 className="text-sm font-extrabold tracking-tight text-gray-900">{category.title}</h2>
                          <p className="mt-1 text-xs text-gray-500">{category.description}</p>
                        </div>
                        {category.key === "workspace" ? (
                          <div className="min-w-[240px] rounded-xl border border-gray-100 bg-gray-50/80 p-4">
                            <div className="flex items-center justify-between gap-4">
                              <div>
                                <p className="text-xs font-bold text-gray-800">Charge setup fee</p>
                                <p className="mt-0.5 text-[10px] text-gray-400">
                                  {workspaceSetupFeeEnabled
                                    ? "First checkout includes monthly + setup"
                                    : "First checkout is monthly only"}
                                </p>
                              </div>
                              <Toggle
                                enabled={workspaceSetupFeeEnabled}
                                onChange={() =>
                                  setWorkspaceSetupFeeEnabled((value) => !value)
                                }
                              />
                            </div>
                            <button
                              type="button"
                              onClick={handleSaveWorkspaceSetupFee}
                              disabled={isPending || workspaceSetupFeeEnabled === billing.workspaceSetupFeeEnabled}
                              className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-3 py-2 text-[11px] font-semibold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              <Check className="h-3.5 w-3.5" />
                              {isPending ? "Saving…" : "Save setup fee setting"}
                            </button>
                          </div>
                        ) : null}
                      </div>
                      <div className="overflow-hidden rounded-xl border border-gray-100">
                        <table className="min-w-full text-left text-xs">
                          <thead className="bg-gray-50 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                            <tr>
                              <th className="px-4 py-3">Service</th>
                              <th className="px-4 py-3">Price</th>
                              <th className="px-4 py-3">Billing</th>
                              <th className="px-4 py-3">Fulfillment</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-50">
                            {(category.rows ?? []).map((row) => (
                              <tr key={row.id}>
                                <td className="px-4 py-3 font-semibold text-gray-800">{row.name}</td>
                                <td className="px-4 py-3 text-gray-600">{row.priceLabel}</td>
                                <td className="px-4 py-3 text-gray-500">{row.billingLabel}</td>
                                <td className="px-4 py-3">
                                  <span className={checkoutBadgeClass(row.checkout)}>
                                    {checkoutBadgeLabel(row.checkout)}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </section>
                  ))}
                </motion.div>
              ) : null}
            </AnimatePresence>
    </AdminPageShell>
  );
}
