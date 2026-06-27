"use client";

import { AlertTriangle, CreditCard } from "lucide-react";

import { CompletePaymentButton } from "@/components/subscription/complete-payment-button";
import {
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
  workspaceSetupFeeEnabled?: boolean;
  bypass?: boolean;
};

export function SubscriptionBanner({
  slug,
  companyId,
  company,
  billingEmail,
  workspaceSetupFeeEnabled = true,
  bypass = false,
}: Props) {
  if (bypass) return null;
  const status = normalizeSubscriptionStatus(company.subscription_status);

  if (workspaceNeedsPayment(company)) {
    return (
      <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-2 text-sm text-amber-950">
            <CreditCard className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Activate your workspace</p>
              <p className="text-amber-900/90">
                Complete payment to unlock FaraiOS features.
              </p>
            </div>
          </div>
          <CompletePaymentButton
            slug={slug}
            companyId={companyId}
            plan={company.plan}
            company={company}
            billingEmail={billingEmail}
            setupFeeEnabled={workspaceSetupFeeEnabled}
            showCheckoutSummary={false}
            className="rounded-lg bg-amber-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-amber-700 disabled:cursor-not-allowed"
          >
            Complete payment
          </CompletePaymentButton>
        </div>
      </div>
    );
  }

  if (workspaceNeedsRenewal(company)) {
    return (
      <div className="border-b border-rose-200 bg-rose-50 px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-2 text-sm text-rose-950">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Subscription renewal required</p>
              <p className="text-rose-900/90">
                Your workspace is {status.replace(/_/g, " ")}. Renew to restore full access.
              </p>
            </div>
          </div>
          <CompletePaymentButton
            slug={slug}
            companyId={companyId}
            plan={company.plan}
            company={company}
            billingEmail={billingEmail}
            setupFeeEnabled={workspaceSetupFeeEnabled}
            showCheckoutSummary={false}
            className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-rose-700 disabled:cursor-not-allowed"
            pendingLabel="Redirecting…"
          >
            Renew subscription
          </CompletePaymentButton>
        </div>
      </div>
    );
  }

  return null;
}
