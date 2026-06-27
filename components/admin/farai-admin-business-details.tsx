"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Ban,
  Building2,
  CheckCircle2,
  CreditCard,
  GitBranch,
  Mail,
  MapPin,
  Phone,
  Users,
} from "lucide-react";

import {
  adminActivateBusiness,
  adminSetSetupFeeWaived,
  adminSuspendBusiness,
} from "@/app/actions/admin";
import { AdminActivityBellLink } from "@/components/admin/admin-activity-bell-link";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { OpenWorkspaceDialog } from "@/components/admin/open-workspace-dialog";
import { FaraiAdminProjectDetails } from "@/components/admin/farai-admin-project-details";
import { ADMIN_BUSINESSES_PATH } from "@/lib/constants/admin-nav";
import { riseStatCardClassName } from "@/lib/ui/rise-dashboard-styles";
import { formatZar, pricingPlans } from "@/lib/data/pricing";
import type {
  AdminBusinessDetail,
  AdminPlatformStatus,
  AdminProjectDetails,
} from "@/types/admin";

type BusinessTab = "overview" | "pipeline" | "users" | "revenue";

const TABS: { key: BusinessTab; label: string; icon: React.ElementType }[] = [
  { key: "overview", label: "Overview", icon: Building2 },
  { key: "pipeline", label: "Pipeline", icon: GitBranch },
  { key: "users", label: "Users", icon: Users },
  { key: "revenue", label: "Revenue", icon: CreditCard },
];

const PLATFORM_STATUS_STYLES: Record<AdminPlatformStatus, string> = {
  Active: "border-emerald-100 bg-emerald-50 text-emerald-700",
  Trial: "border-sky-100 bg-sky-50 text-sky-700",
  Suspended: "border-red-100 bg-red-50 text-red-700",
  Inactive: "border-gray-100 bg-gray-50 text-gray-600",
};

export function FaraiAdminBusinessDetails({
  business,
  project,
  adminDisplayName,
  initialTab = "overview",
}: {
  business: AdminBusinessDetail;
  project: AdminProjectDetails;
  adminDisplayName: string;
  initialTab?: BusinessTab;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  const activeTab: BusinessTab =
    TABS.find((tab) => tab.key === searchParams.get("tab"))?.key ?? initialTab;

  const setTab = (tab: BusinessTab) => {
    router.replace(`${ADMIN_BUSINESSES_PATH}/${business.id}?tab=${tab}`, {
      scroll: false,
    });
  };

  const handlePlatformAction = (action: "suspend" | "activate") => {
    setActionError(null);
    startTransition(async () => {
      const result =
        action === "suspend"
          ? await adminSuspendBusiness(business.id)
          : await adminActivateBusiness(business.id);
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      router.refresh();
    });
  };

  const planSlug = business.workspacePlanSlug;
  const planRecord = pricingPlans.find((plan) => plan.slug === planSlug);
  const setupFeeAmount = planRecord?.setup_price ?? 0;

  const handleSetupFeeWaivedChange = (waived: boolean) => {
    setActionError(null);
    startTransition(async () => {
      const result = await adminSetSetupFeeWaived(business.id, waived);
      if (!result.ok) {
        setActionError(result.error);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <AdminPageShell
        title={business.name}
        maxWidthClassName="max-w-5xl"
        actions={
          <>
            <OpenWorkspaceDialog
              companyId={business.id}
              companySlug={business.slug}
              companyName={business.name}
              triggerClassName="px-3 py-1.5 text-xs"
            />
            <span
              className={`rounded-lg border px-2.5 py-1 text-xs font-bold ${PLATFORM_STATUS_STYLES[business.platformStatus]}`}
            >
              {business.platformStatus}
            </span>
            <AdminActivityBellLink />
          </>
        }
      >
        <Link
          href={ADMIN_BUSINESSES_PATH}
          className="mb-3 inline-flex items-center gap-1 text-xs font-medium text-slate-500 transition-colors hover:text-[#5a8dee]"
        >
          <ArrowLeft className="h-3 w-3" />
          Businesses
        </Link>

        <div className="mb-4 flex gap-1 overflow-x-auto border-b border-slate-200 pb-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setTab(tab.key)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

      {activeTab === "pipeline" ? (
        <FaraiAdminProjectDetails
          project={project}
          adminDisplayName={adminDisplayName}
          embedded
        />
      ) : (
        <>
          {actionError ? (
            <p className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
              {actionError}
            </p>
          ) : null}

          {activeTab === "overview" ? (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-auto grid max-w-5xl gap-5 lg:grid-cols-3"
            >
              <div className="space-y-5 lg:col-span-2">
                <div className={riseStatCardClassName}>
                  <h2 className="text-sm font-bold text-gray-900">Business profile</h2>
                  <dl className="mt-4 grid gap-4 sm:grid-cols-2">
                    {[
                      { label: "Industry", value: business.industry },
                      { label: "Plan", value: business.plan },
                      { label: "Subscription", value: business.subscriptionStatus },
                      { label: "Hosting status", value: business.hostingStatus ?? "—" },
                      { label: "Next billing", value: business.nextBillingDate ?? "—" },
                      { label: "Joined", value: business.joined },
                    ].map((item) => (
                      <div key={item.label}>
                        <dt className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
                          {item.label}
                        </dt>
                        <dd className="mt-1 text-sm font-semibold text-gray-900">{item.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>

                <div className={riseStatCardClassName}>
                  <h2 className="text-sm font-bold text-gray-900">Primary contact</h2>
                  <div className="mt-4 space-y-3">
                    <p className="text-sm font-semibold text-gray-900">{business.contactName}</p>
                    <p className="inline-flex items-center gap-2 text-sm text-gray-600">
                      <Mail className="h-4 w-4 text-indigo-500" />
                      {business.contactEmail}
                    </p>
                    <p className="inline-flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="h-4 w-4 text-violet-500" />
                      {business.phone ?? "Not provided"}
                    </p>
                    <p className="inline-flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="h-4 w-4 text-emerald-500" />
                      {business.location ?? "Not provided"}
                    </p>
                  </div>
                  {business.note ? (
                    <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                      {business.note}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="space-y-5">
                <div className={riseStatCardClassName}>
                  <h2 className="text-sm font-bold text-gray-900">Platform actions</h2>
                  <p className="mt-1 text-xs text-gray-400">
                    Suspend or reactivate this business on the platform
                  </p>
                  <div className="mt-4 space-y-2">
                    {business.platformStatus === "Suspended" ? (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handlePlatformAction("activate")}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Activate business
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handlePlatformAction("suspend")}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-700 hover:bg-red-100 disabled:opacity-60"
                      >
                        <Ban className="h-4 w-4" />
                        Suspend business
                      </button>
                    )}
                  </div>
                </div>

                <div className={riseStatCardClassName}>
                  <h2 className="text-sm font-bold text-gray-900">Workspace</h2>
                  <p className="mt-1 text-xs text-gray-400">
                    Enter this business workspace with platform administrator access
                  </p>
                  <div className="mt-4">
                    <OpenWorkspaceDialog
                      companyId={business.id}
                      companySlug={business.slug}
                      companyName={business.name}
                      triggerClassName="w-full justify-center"
                    />
                  </div>
                </div>

                <div className={riseStatCardClassName}>
                  <h2 className="text-sm font-bold text-gray-900">Setup fee</h2>
                  <p className="mt-1 text-xs text-gray-400">
                    Control whether this business pays the one-time workspace setup fee at checkout.
                  </p>
                  <dl className="mt-4 space-y-2 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-gray-500">Plan setup fee</dt>
                      <dd className="font-semibold text-gray-900">
                        {setupFeeAmount > 0 ? formatZar(setupFeeAmount) : "—"}
                      </dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-gray-500">Status</dt>
                      <dd className="font-semibold text-gray-900">
                        {business.setupFeePaidAt
                          ? "Paid"
                          : business.setupFeeWaived
                            ? "Waived"
                            : "Due at checkout"}
                      </dd>
                    </div>
                  </dl>
                  <div className="mt-4 space-y-2">
                    {business.setupFeePaidAt ? (
                      <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs text-emerald-800">
                        Setup fee collected on{" "}
                        {new Date(business.setupFeePaidAt).toLocaleDateString("en-ZA")}.
                      </p>
                    ) : business.setupFeeWaived ? (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleSetupFeeWaivedChange(false)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                      >
                        Restore setup fee
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={isPending || setupFeeAmount <= 0}
                        onClick={() => handleSetupFeeWaivedChange(true)}
                        className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
                      >
                        Waive setup fee
                      </button>
                    )}
                  </div>
                </div>

                <div className={riseStatCardClassName}>
                  <h2 className="text-sm font-bold text-gray-900">Quick links</h2>
                  <div className="mt-3 space-y-2">
                    <button
                      type="button"
                      onClick={() => setTab("pipeline")}
                      className="block w-full rounded-xl border border-gray-100 px-4 py-3 text-left text-sm font-medium text-gray-700 hover:border-indigo-200 hover:bg-indigo-50/60"
                    >
                      Open build pipeline
                    </button>
                    <button
                      type="button"
                      onClick={() => setTab("users")}
                      className="block w-full rounded-xl border border-gray-100 px-4 py-3 text-left text-sm font-medium text-gray-700 hover:border-indigo-200 hover:bg-indigo-50/60"
                    >
                      View team members
                    </button>
                    <button
                      type="button"
                      onClick={() => setTab("revenue")}
                      className="block w-full rounded-xl border border-gray-100 px-4 py-3 text-left text-sm font-medium text-gray-700 hover:border-indigo-200 hover:bg-indigo-50/60"
                    >
                      View payments
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : null}

          {activeTab === "users" ? (
            <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="border-b border-gray-50 px-6 py-4">
                <h2 className="text-sm font-bold text-gray-900">Team members</h2>
                <p className="mt-0.5 text-xs text-gray-400">
                  {business.members.length} member
                  {business.members.length === 1 ? "" : "s"}
                </p>
              </div>
              {business.members.length === 0 ? (
                <div className="py-14 text-center text-sm text-gray-400">No members yet</div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-50 bg-gray-50/80">
                      <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Name
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Email
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Role
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Joined
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {business.members.map((member) => (
                      <tr key={member.id} className="border-b border-gray-50 last:border-b-0">
                        <td className="px-6 py-3.5 text-xs font-semibold text-gray-900">
                          {member.name}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-gray-600">{member.email}</td>
                        <td className="px-4 py-3.5 text-xs capitalize text-gray-600">
                          {member.role}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-gray-500">{member.joined}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : null}

          {activeTab === "revenue" ? (
            <div className="mx-auto max-w-5xl overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <div className="border-b border-gray-50 px-6 py-4">
                <h2 className="text-sm font-bold text-gray-900">Hosting payments</h2>
                <p className="mt-0.5 text-xs text-gray-400">Recent transactions for this business</p>
              </div>
              {business.recentPayments.length === 0 ? (
                <div className="py-14 text-center text-sm text-gray-400">No payments yet</div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-50 bg-gray-50/80">
                      <th className="px-6 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Plan
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Amount
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-gray-400">
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {business.recentPayments.map((payment) => (
                      <tr key={payment.id} className="border-b border-gray-50 last:border-b-0">
                        <td className="px-6 py-3.5 text-xs text-gray-700">{payment.plan}</td>
                        <td className="px-4 py-3.5 text-xs font-bold text-gray-900">
                          {formatZar(payment.amount)}
                        </td>
                        <td className="px-4 py-3.5 text-xs capitalize text-gray-600">
                          {payment.status}
                        </td>
                        <td className="px-4 py-3.5 text-xs text-gray-500">{payment.date}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : null}
        </>
      )}
      </AdminPageShell>
    </div>
  );
}
