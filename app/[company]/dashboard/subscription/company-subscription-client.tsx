"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { CheckCircle2, CreditCard, XCircle } from "lucide-react";

import { changeWorkspacePlan } from "@/app/actions/subscription";
import { confirmWorkspacePaymentAction } from "@/app/actions/confirm-workspace-payment";
import { Button } from "@/components/ui/button";
import {
  formatZar,
  normalizePlanSlug,
  planLabelForSlug,
  pricingPlans,
  type PricingPlanSlug,
} from "@/lib/data/pricing";
import { companyDashboardPath, companyHostingPath } from "@/lib/paths/company";
import {
  isActiveSubscriptionStatus,
  normalizeSubscriptionStatus,
  subscriptionRenewalDate,
} from "@/lib/subscriptions/access";
import { startWorkspacePayment } from "@/lib/subscriptions/start-workspace-payment";
import { rememberWorkspacePaymentReference } from "@/lib/subscriptions/payment-reference-storage";
import { cn } from "@/lib/utils";
import type { CompanyWithIndustry } from "@/types/database";
import type { SubscriptionPaymentRecord } from "@/lib/services/subscription";
import type { PaymentConfirmationState } from "@/lib/services/workspace-subscription-verify";

type Props = {
  slug: string;
  company: CompanyWithIndustry;
  paymentConfirmation: PaymentConfirmationState;
  payments: SubscriptionPaymentRecord[];
  billingEmail?: string | null;
};

function subscriptionBadge(status?: string | null) {
  const map: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-800 ring-emerald-100",
    trialing: "bg-sky-50 text-sky-800 ring-sky-100",
    pending_payment: "bg-amber-50 text-amber-800 ring-amber-100",
    past_due: "bg-amber-50 text-amber-800 ring-amber-100",
    expired: "bg-rose-50 text-rose-800 ring-rose-100",
    cancelled: "bg-slate-50 text-slate-600 ring-slate-100",
  };
  const normalized = normalizeSubscriptionStatus(status);
  return map[normalized] ?? "bg-slate-50 text-slate-600 ring-slate-100";
}

export function CompanySubscriptionClient({
  slug,
  company,
  paymentConfirmation,
  payments,
  billingEmail,
}: Props) {
  const router = useRouter();
  const mountedRef = useRef(false);
  const currentPlan = normalizePlanSlug(company.plan);
  const [selectedPlan, setSelectedPlan] = useState<PricingPlanSlug>(currentPlan);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planMessage, setPlanMessage] = useState<string | null>(null);
  const [planPending, startPlanTransition] = useTransition();
  const [confirmReference, setConfirmReference] = useState("");
  const [confirmPending, startConfirmTransition] = useTransition();
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null);

  const status = normalizeSubscriptionStatus(company.subscription_status);
  const isActive = isActiveSubscriptionStatus(status);
  const renewalDate = subscriptionRenewalDate(company);
  const currentPlanRecord = pricingPlans.find((plan) => plan.slug === currentPlan);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const onPay = async () => {
    const email =
      company.primary_contact_email?.trim() || billingEmail?.trim() || "";
    if (!email) {
      setError("Add a billing email in Business settings first.");
      return;
    }

    if (selectedPlan !== currentPlan) {
      const planResult = await changeWorkspacePlan({
        companyId: company.id,
        companySlug: slug,
        plan: selectedPlan,
      });
      if (!planResult.ok) {
        setError(planResult.error);
        return;
      }
    }

    setError(null);
    setPending(true);
    try {
      const result = await startWorkspacePayment({
        companyId: company.id,
        plan: selectedPlan,
        email,
      });
      if (!result.ok) {
        setError(result.error);
        setPending(false);
        return;
      }
      if (result.reference) {
        rememberWorkspacePaymentReference(company.id, result.reference);
      }
      window.location.assign(result.authorizationUrl);
    } catch {
      if (mountedRef.current) {
        setError("Could not start payment.");
        setPending(false);
      }
    }
  };

  const onChangePlanOnly = () => {
    setPlanMessage(null);
    setError(null);
    startPlanTransition(async () => {
      const result = await changeWorkspacePlan({
        companyId: company.id,
        companySlug: slug,
        plan: selectedPlan,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPlanMessage(
        selectedPlan === currentPlan
          ? "Plan unchanged."
          : `Plan updated to ${planLabelForSlug(selectedPlan)}. Changes apply immediately.`
      );
      router.refresh();
    });
  };

  const onConfirmPayment = () => {
    setConfirmMessage(null);
    setError(null);
    startConfirmTransition(async () => {
      const result = await confirmWorkspacePaymentAction({
        companyId: company.id,
        companySlug: slug,
        reference: confirmReference,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setConfirmMessage(
        result.activated
          ? "Payment confirmed. Your workspace is now active."
          : "Payment confirmed. Your workspace is already active."
      );
      router.refresh();
    });
  };

  return (
    <div className="space-y-8">
      {paymentConfirmation.status === "activated" ||
      paymentConfirmation.status === "already_active" ? (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            {paymentConfirmation.status === "activated"
              ? "Payment confirmed. Your workspace is now active."
              : "Payment confirmed. Your workspace subscription is active."}
          </p>
        </div>
      ) : null}

      {paymentConfirmation.status === "pending_webhook" ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            Payment received. Verifying your transaction now — refresh in a moment if
            your status does not update.
          </p>
        </div>
      ) : null}

      {paymentConfirmation.status === "failed" ? (
        <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <p>{paymentConfirmation.error}</p>
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
              Workspace plan
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">
              {planLabelForSlug(currentPlan)} plan
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              {currentPlanRecord
                ? `${formatZar(currentPlanRecord.monthly_price)}/month`
                : "Monthly workspace subscription"}
            </p>
          </div>
          <span
            className={cn(
              "inline-flex rounded-full px-3 py-1 text-xs font-semibold capitalize ring-1 ring-inset",
              subscriptionBadge(company.subscription_status)
            )}
          >
            {status.replace(/_/g, " ")}
          </span>
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-4">
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Renewal date
            </dt>
            <dd className="mt-1 text-sm font-semibold text-slate-900">
              {renewalDate
                ? new Date(renewalDate).toLocaleDateString("en-ZA")
                : "Not scheduled"}
            </dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Started
            </dt>
            <dd className="mt-1 text-sm font-semibold text-slate-900">
              {company.subscription_started_at
                ? new Date(company.subscription_started_at).toLocaleDateString("en-ZA")
                : "Not started"}
            </dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Billing email
            </dt>
            <dd className="mt-1 text-sm font-semibold text-slate-900">
              {company.primary_contact_email ?? billingEmail ?? "Not set"}
            </dd>
          </div>
        </dl>
      </section>

      <section>
        <h3 className="text-lg font-bold text-slate-900">Upgrade or change plan</h3>
        <p className="mt-1 text-sm text-slate-600">
          Plan changes apply immediately. Payment activates or renews your workspace via
          Paystack.
        </p>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {pricingPlans.map((plan) => (
            <button
              key={plan.id}
              type="button"
              onClick={() => setSelectedPlan(plan.slug)}
              className={cn(
                "rounded-2xl border p-5 text-left transition",
                selectedPlan === plan.slug
                  ? "border-violet-500 bg-violet-50/40 ring-2 ring-violet-200"
                  : "border-slate-200 bg-white hover:border-slate-300"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold text-slate-900">{plan.name}</p>
                {plan.is_popular ? (
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-violet-700">
                    Popular
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {formatZar(plan.monthly_price)}
                <span className="text-sm font-normal text-slate-500">/mo</span>
              </p>
              <ul className="mt-4 space-y-1 text-sm text-slate-600">
                {plan.features.slice(0, 4).map((feature) => (
                  <li key={feature}>• {feature}</li>
                ))}
              </ul>
            </button>
          ))}
        </div>

        {error ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-red-600">
            <XCircle className="h-4 w-4" />
            {error}
          </p>
        ) : null}
        {planMessage ? (
          <p className="mt-4 text-sm text-emerald-700">{planMessage}</p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            type="button"
            className="rounded-xl"
            disabled={pending}
            onClick={onPay}
          >
            <CreditCard className="mr-2 h-4 w-4" />
            {pending
              ? "Redirecting…"
              : isActive && selectedPlan === currentPlan
                ? "Renew subscription"
                : "Pay with Paystack"}
          </Button>
          {isActive && selectedPlan !== currentPlan ? (
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              disabled={planPending}
              onClick={onChangePlanOnly}
            >
              {planPending ? "Updating…" : "Apply plan change"}
            </Button>
          ) : null}
          <Link
            href={companyDashboardPath(slug)}
            className="inline-flex items-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Back to dashboard
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-lg font-bold text-slate-900">Payment history</h3>
        {payments.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No workspace payments recorded yet.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                  <th className="py-2 pr-4 font-semibold">Date</th>
                  <th className="py-2 pr-4 font-semibold">Plan</th>
                  <th className="py-2 pr-4 font-semibold">Amount</th>
                  <th className="py-2 font-semibold">Reference</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-b border-slate-100">
                    <td className="py-3 pr-4 text-slate-700">
                      {new Date(payment.paid_at).toLocaleDateString("en-ZA")}
                    </td>
                    <td className="py-3 pr-4 capitalize text-slate-700">
                      {payment.plan_slug}
                    </td>
                    <td className="py-3 pr-4 text-slate-700">
                      {formatZar(payment.amount_cents / 100)}
                    </td>
                    <td className="py-3 font-mono text-xs text-slate-500">
                      {payment.paystack_reference ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {!isActive ? (
        <section className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-5">
          <h3 className="text-sm font-semibold text-slate-900">Already paid?</h3>
          <p className="mt-1 text-sm text-slate-600">
            Paste your Paystack reference to confirm payment and activate this workspace.
          </p>
          <div className="mt-4 flex flex-col gap-3 sm:flex-row">
            <input
              type="text"
              value={confirmReference}
              onChange={(event) => setConfirmReference(event.target.value)}
              placeholder="Paystack reference"
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
            />
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              disabled={confirmPending || !confirmReference.trim()}
              onClick={onConfirmPayment}
            >
              {confirmPending ? "Confirming…" : "Confirm payment"}
            </Button>
          </div>
          {confirmMessage ? (
            <p className="mt-3 text-sm text-emerald-700">{confirmMessage}</p>
          ) : null}
        </section>
      ) : null}

      <section className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-5 text-sm text-slate-600">
        <p className="font-semibold text-slate-900">Website hosting is separate</p>
        <p className="mt-1">
          Custom domain hosting and deployments are billed on the{" "}
          <Link href={companyHostingPath(slug)} className="font-medium text-violet-700 hover:text-violet-900">
            hosting plan
          </Link>
          . This page covers your Shalean workspace subscription only.
        </p>
      </section>
    </div>
  );
}
