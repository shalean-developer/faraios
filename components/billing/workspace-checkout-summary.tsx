"use client";

import { formatZar } from "@/lib/data/pricing";
import {
  getWorkspaceCheckoutBreakdown,
  type WorkspaceCheckoutBreakdown,
} from "@/lib/billing/workspace-checkout";
import {
  isActiveSubscriptionStatus,
  normalizeSubscriptionStatus,
} from "@/lib/subscriptions/access";
import type { SubscriptionCompanyFields } from "@/lib/subscriptions/types";
import { cn } from "@/lib/utils";

type Props = {
  plan: string | null | undefined;
  company: SubscriptionCompanyFields;
  includeSetupFee: boolean;
  setupFeeEnabled?: boolean;
  onIncludeSetupFeeChange?: (value: boolean) => void;
  className?: string;
};

function buildBreakdown(
  plan: string | null | undefined,
  company: SubscriptionCompanyFields,
  includeSetupFee: boolean,
  setupFeeEnabled: boolean
): WorkspaceCheckoutBreakdown {
  return getWorkspaceCheckoutBreakdown({
    plan,
    setupFeeEnabled,
    setupFeeWaived: company.setup_fee_waived === true,
    setupFeePaid: Boolean(company.setup_fee_paid_at),
    subscriptionActive: isActiveSubscriptionStatus(
      normalizeSubscriptionStatus(company.subscription_status)
    ),
    includeSetupFee,
  });
}

export function WorkspaceCheckoutSummary({
  plan,
  company,
  includeSetupFee,
  setupFeeEnabled = true,
  onIncludeSetupFeeChange,
  className,
}: Props) {
  const breakdown = buildBreakdown(
    plan,
    company,
    includeSetupFee,
    setupFeeEnabled
  );

  if (breakdown.total <= 0) {
    return null;
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-slate-200 bg-slate-50/80 p-4 text-sm text-slate-700",
        className
      )}
    >
      <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
        Checkout summary
      </p>
      <dl className="mt-3 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <dt>Monthly subscription</dt>
          <dd className="font-semibold text-slate-900">
            {formatZar(breakdown.monthlyPrice)}
          </dd>
        </div>
        {breakdown.setupFeeEligible ? (
          <div className="flex items-center justify-between gap-3">
            <dt>One-time setup fee</dt>
            <dd
              className={cn(
                "font-semibold",
                breakdown.includeSetupFee
                  ? "text-slate-900"
                  : "text-slate-400 line-through"
              )}
            >
              {formatZar(breakdown.setupPrice)}
            </dd>
          </div>
        ) : null}
        {!breakdown.setupFeeEnabled && breakdown.setupPrice > 0 ? (
          <p className="text-xs text-slate-500">
            Setup fees are turned off platform-wide — monthly price only.
          </p>
        ) : null}
        {!breakdown.setupFeeEligible && breakdown.setupFeeWaived ? (
          <p className="text-xs text-emerald-700">
            Setup fee waived for this workspace.
          </p>
        ) : null}
        {!breakdown.setupFeeEligible && company.setup_fee_paid_at ? (
          <p className="text-xs text-slate-500">Setup fee already paid.</p>
        ) : null}
        <div className="flex items-center justify-between gap-3 border-t border-slate-200 pt-2">
          <dt className="font-semibold text-slate-800">Total due today</dt>
          <dd className="text-lg font-bold text-slate-900">
            {formatZar(breakdown.total)}
          </dd>
        </div>
      </dl>

      {breakdown.setupFeeEligible && onIncludeSetupFeeChange ? (
        <label className="mt-4 flex cursor-pointer items-start gap-2 rounded-md border border-slate-200 bg-white px-3 py-2.5">
          <input
            type="checkbox"
            checked={!includeSetupFee}
            onChange={(event) => onIncludeSetupFeeChange(!event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-[#5a8dee] focus:ring-[#5a8dee]"
          />
          <span>
            <span className="block font-medium text-slate-800">
              Remove setup fee
            </span>
            <span className="mt-0.5 block text-xs text-slate-500">
              Pay {formatZar(breakdown.monthlyPrice)} today (monthly subscription
              only).
            </span>
          </span>
        </label>
      ) : null}
    </div>
  );
}

export function useWorkspaceCheckoutBreakdown(
  plan: string | null | undefined,
  company: SubscriptionCompanyFields,
  includeSetupFee: boolean,
  setupFeeEnabled = true
) {
  return buildBreakdown(plan, company, includeSetupFee, setupFeeEnabled);
}
