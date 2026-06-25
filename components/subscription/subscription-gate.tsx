"use client";

import { type ReactNode } from "react";
import { usePathname } from "next/navigation";

import { CompletePaymentButton } from "@/components/subscription/complete-payment-button";
import { UpgradeRequiredCard } from "@/components/subscription/upgrade-required-card";
import {
  canAccessDashboardPath,
  dashboardPathFeature,
} from "@/lib/subscriptions/route-access";
import { planLabelForUpgrade } from "@/lib/subscriptions/plan-entitlements";
import type { EntitlementFeature } from "@/lib/subscriptions/plan-entitlements";
import {
  isRestrictedSubscriptionStatus,
  normalizeSubscriptionStatus,
  workspaceNeedsPayment,
  workspaceNeedsRenewal,
} from "@/lib/subscriptions/access";
import type { SubscriptionCompanyFields } from "@/lib/subscriptions/types";

type Props = {
  slug: string;
  companyId: string;
  company: SubscriptionCompanyFields;
  billingEmail?: string | null;
  children: ReactNode;
};

function blockedFeatureCopy(
  company: SubscriptionCompanyFields,
  feature: EntitlementFeature
) {
  if (workspaceNeedsPayment(company)) {
    return {
      title: "Activate your workspace",
      description: "Complete payment to unlock Shalean features.",
    };
  }

  const status = normalizeSubscriptionStatus(company.subscription_status);
  if (isRestrictedSubscriptionStatus(status)) {
    return {
      title: "Subscription renewal required",
      description:
        "Renew your workspace subscription to access this feature again.",
    };
  }

  return {
    title: "Upgrade required",
    description: `This feature is available on the ${planLabelForUpgrade(feature)} plan.`,
  };
}

export function SubscriptionGate({
  slug,
  companyId,
  company,
  billingEmail,
  children,
}: Props) {
  const pathname = usePathname() ?? "";

  if (canAccessDashboardPath(company, slug, pathname)) {
    return <>{children}</>;
  }

  const feature = dashboardPathFeature(slug, pathname);
  const entitlementFeature =
    feature && feature !== "overview" && feature !== "subscription" && feature !== "settings"
      ? (feature as EntitlementFeature)
      : "leads";

  const copy = blockedFeatureCopy(company, entitlementFeature);
  const needsPayment =
    workspaceNeedsPayment(company) || workspaceNeedsRenewal(company);

  return (
    <div className="px-4 py-16 sm:px-6 lg:px-8">
      {needsPayment ? (
        <div className="mx-auto max-w-xl rounded-2xl border border-violet-200 bg-gradient-to-b from-violet-50/80 to-white p-8 text-center shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">{copy.title}</h2>
          <p className="mt-2 text-sm text-slate-600">{copy.description}</p>
          <div className="mt-6 flex justify-center">
            <CompletePaymentButton
              slug={slug}
              companyId={companyId}
              plan={company.plan}
              billingEmail={billingEmail}
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed"
            >
              {workspaceNeedsRenewal(company) ? "Renew subscription" : "Complete payment"}
            </CompletePaymentButton>
          </div>
        </div>
      ) : (
        <UpgradeRequiredCard
          slug={slug}
          feature={entitlementFeature}
          title={copy.title}
          description={copy.description}
        />
      )}
    </div>
  );
}
