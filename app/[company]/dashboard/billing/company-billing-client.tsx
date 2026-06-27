"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  CheckCircle2,
  CreditCard,
  Download,
  XCircle,
} from "lucide-react";

import { cancelWorkspaceSubscription } from "@/app/actions/billing";
import { changeWorkspacePlan } from "@/app/actions/subscription";
import { confirmWorkspacePaymentAction } from "@/app/actions/confirm-workspace-payment";
import { HostingPaymentRecovery } from "@/components/hosting/hosting-payment-recovery";
import { SubscriptionPaymentRecovery } from "@/components/subscription/subscription-payment-recovery";
import { WorkspaceCheckoutSummary } from "@/components/billing/workspace-checkout-summary";
import { CompanyHostingClient } from "@/app/[company]/dashboard/hosting/company-hosting-client";
import {
  formatZar,
  isSelfServePlan,
  normalizePlanSlug,
  planLabelForSlug,
  pricingPlans,
  type PricingPlanSlug,
} from "@/lib/data/pricing";
import { companyBillingPath, companyDashboardPath, type CompanyBillingTab } from "@/lib/paths/company";
import {
  isActiveSubscriptionStatus,
  normalizeSubscriptionStatus,
} from "@/lib/subscriptions/access";
import { startWorkspacePayment } from "@/lib/subscriptions/start-workspace-payment";
import { rememberWorkspacePaymentReference } from "@/lib/subscriptions/payment-reference-storage";
import type { BillingOverview } from "@/lib/billing/billing-shared";
import {
  buildBillingPaymentRows,
  subscriptionStatusLabel,
} from "@/lib/billing/billing-shared";
import type { PaymentConfirmationState } from "@/lib/services/workspace-subscription-verify";
import type { HostingPaymentConfirmationState } from "@/lib/services/hosting-subscription-verify";
import type {
  CompanyWithIndustry,
  HostingPayment,
  HostingSubscription,
} from "@/types/database";
import type { HostingInvoiceRow, HostingServiceRow } from "@/types/hosting-automation";
import type { WebsiteDnsRecord, WebsiteDomain } from "@/types/website-engine";
import type { WebsiteDomainDnsHelp } from "@/components/websites/website-domains-panel";
import { cn } from "@/lib/utils";

type BillingTab = CompanyBillingTab;

const riseCardClassName = "rounded-xl border border-slate-200 bg-white shadow-sm";
const riseOutlineButtonClassName =
  "inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50";
const risePrimaryButtonClassName =
  "inline-flex h-9 items-center gap-2 rounded-md bg-[#5a8dee] px-3 text-sm font-medium text-white transition hover:bg-[#4a6fd8] disabled:opacity-60";

type HostingBillingProps = {
  subscription: HostingSubscription | null;
  payments: HostingPayment[];
  initialPlan?: string;
  paymentConfirmation: HostingPaymentConfirmationState;
  hostingDomain: WebsiteDomain | null;
  dnsRecords: WebsiteDnsRecord[];
  domainDnsHelp?: WebsiteDomainDnsHelp | null;
  automationServices?: HostingServiceRow[];
  automationInvoices?: HostingInvoiceRow[];
};

type Props = {
  slug: string;
  company: CompanyWithIndustry;
  initialTab?: BillingTab;
  paymentConfirmation: PaymentConfirmationState;
  billing: BillingOverview;
  billingEmail?: string | null;
  workspaceSetupFeeEnabled?: boolean;
  hosting: HostingBillingProps;
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

function planOrder(slug: PricingPlanSlug): number {
  const order: PricingPlanSlug[] = ["starter", "business", "pro", "enterprise"];
  return order.indexOf(slug);
}

export function CompanyBillingClient({
  slug,
  company,
  initialTab = "subscription",
  paymentConfirmation,
  billing,
  billingEmail,
  workspaceSetupFeeEnabled = true,
  hosting,
}: Props) {
  const router = useRouter();
  const mountedRef = useRef(false);
  const currentPlan = normalizePlanSlug(company.plan);
  const [selectedPlan, setSelectedPlan] = useState<PricingPlanSlug>(currentPlan);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [planMessage, setPlanMessage] = useState<string | null>(null);
  const [planPending, startPlanTransition] = useTransition();
  const [cancelPending, startCancelTransition] = useTransition();
  const [cancelMessage, setCancelMessage] = useState<string | null>(null);
  const [confirmReference, setConfirmReference] = useState("");
  const [confirmPending, startConfirmTransition] = useTransition();
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<BillingTab>(initialTab);
  const [includeSetupFee, setIncludeSetupFee] = useState(true);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const onTabChange = (tab: BillingTab) => {
    setActiveTab(tab);
    router.replace(companyBillingPath(slug, tab), { scroll: false });
  };

  const status = normalizeSubscriptionStatus(company.subscription_status);
  const isActive = isActiveSubscriptionStatus(status);
  const renewalDate = billing.resolvedDates.nextBillingDate;
  const subscriptionStartedAt = billing.resolvedDates.subscriptionStartedAt;
  const currentPlanRecord = pricingPlans.find((plan) => plan.slug === currentPlan);

  const paymentRows = buildBillingPaymentRows(billing, company);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const onPay = async () => {
    if (!isSelfServePlan(selectedPlan)) {
      setError("Enterprise plans require a custom quote. Contact sales@faraios.com.");
      return;
    }

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
        includeSetupFee,
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
          : `Plan updated to ${planLabelForSlug(selectedPlan)}.`
      );
      router.refresh();
    });
  };

  const onCancelSubscription = () => {
    if (!window.confirm("Cancel your subscription? You will lose access to paid features at the end of the current period.")) {
      return;
    }
    setCancelMessage(null);
    setError(null);
    startCancelTransition(async () => {
      const result = await cancelWorkspaceSubscription({
        companyId: company.id,
        companySlug: slug,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCancelMessage("Subscription cancelled.");
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

  const isUpgrade = planOrder(selectedPlan) > planOrder(currentPlan);
  const isDowngrade = planOrder(selectedPlan) < planOrder(currentPlan);

  const billingTabs: { id: BillingTab; label: string }[] = [
    { id: "subscription", label: "Subscription" },
    { id: "plans", label: "Plans" },
    { id: "payments", label: "Payment history" },
    { id: "hosting", label: "Hosting plan" },
  ];

  return (
    <div className="px-4 py-4 sm:px-5 sm:py-5">
      <SubscriptionPaymentRecovery
        slug={slug}
        companyId={company.id}
        paymentConfirmation={paymentConfirmation}
      />
      <HostingPaymentRecovery
        slug={slug}
        companyId={company.id}
        paymentConfirmation={hosting.paymentConfirmation}
      />

      <div className={riseCardClassName}>
        <div className="flex flex-col gap-4 border-b border-slate-100 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-lg font-medium text-slate-800">Billing</h1>
            <p className="mt-1 text-sm text-slate-500">
              Manage your workspace subscription, payments, and website hosting.
            </p>
            <div className="mt-3 flex flex-wrap gap-6">
              {billingTabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange(tab.id)}
                  className={cn(
                    "border-b-2 pb-2 text-sm font-medium transition",
                    activeTab === tab.id
                      ? "border-[#5a8dee] text-[#4a6fd8]"
                      : "border-transparent text-slate-500 hover:text-slate-700"
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {activeTab === "plans" && isSelfServePlan(selectedPlan) ? (
              <button
                type="button"
                className={risePrimaryButtonClassName}
                disabled={pending}
                onClick={onPay}
              >
                <CreditCard className="h-4 w-4" strokeWidth={1.75} />
                {pending
                  ? "Redirecting…"
                  : !isActive
                    ? "Pay with Paystack"
                    : isUpgrade
                      ? "Upgrade plan"
                      : isDowngrade
                        ? "Downgrade plan"
                        : "Renew subscription"}
              </button>
            ) : null}
            {activeTab === "plans" && !isSelfServePlan(selectedPlan) ? (
              <Link href="/contact" className={risePrimaryButtonClassName}>
                Contact sales
              </Link>
            ) : null}
            <Link href={companyDashboardPath(slug)} className={riseOutlineButtonClassName}>
              Back to dashboard
            </Link>
          </div>
        </div>

        <div className="space-y-4 p-4 sm:p-5">
          {paymentConfirmation.status === "pending_webhook" ? (
            <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              <p>
                Payment received. Verifying your transaction now — refresh in a moment if
                your status does not update.
              </p>
            </div>
          ) : null}

          {paymentConfirmation.status === "failed" ? (
            <div className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
              <XCircle className="mt-0.5 h-5 w-5 shrink-0" />
              <p>{paymentConfirmation.error}</p>
            </div>
          ) : null}

          {error ? (
            <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <XCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          ) : null}

          {activeTab === "subscription" ? (
            <>
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    Current plan
                  </p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-800">
                    {planLabelForSlug(currentPlan)}
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    {currentPlanRecord?.slug === "enterprise"
                      ? "Custom pricing"
                      : currentPlanRecord
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
                  {subscriptionStatusLabel(company.subscription_status)}
                </span>
              </div>

              <dl className="grid gap-3 sm:grid-cols-3">
                <div className={cn(riseCardClassName, "p-4")}>
                  <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    Next billing date
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-800">
                    {renewalDate
                      ? new Date(renewalDate).toLocaleDateString("en-ZA")
                      : "Not scheduled"}
                  </dd>
                </div>
                <div className={cn(riseCardClassName, "p-4")}>
                  <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    Subscription started
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-800">
                    {subscriptionStartedAt
                      ? new Date(subscriptionStartedAt).toLocaleDateString("en-ZA")
                      : "Not started"}
                  </dd>
                </div>
                <div className={cn(riseCardClassName, "p-4")}>
                  <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
                    Billing email
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-800">
                    {company.primary_contact_email ?? billingEmail ?? "Not set"}
                  </dd>
                </div>
              </dl>

              {isActive && status !== "cancelled" ? (
                <div className="border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    className={cn(
                      riseOutlineButtonClassName,
                      "text-red-600 hover:bg-red-50 hover:text-red-700"
                    )}
                    disabled={cancelPending}
                    onClick={onCancelSubscription}
                  >
                    {cancelPending ? "Cancelling…" : "Cancel subscription"}
                  </button>
                  {cancelMessage ? (
                    <p className="mt-2 text-sm text-slate-600">{cancelMessage}</p>
                  ) : null}
                </div>
              ) : null}

              {!isActive ? (
                <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/80 p-4">
                  <h3 className="text-sm font-semibold text-slate-800">Already paid?</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Paste your Paystack reference to confirm payment and activate this workspace.
                  </p>
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <input
                      type="text"
                      value={confirmReference}
                      onChange={(event) => setConfirmReference(event.target.value)}
                      placeholder="Paystack reference"
                      className="flex-1 rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900"
                    />
                    <button
                      type="button"
                      className={riseOutlineButtonClassName}
                      disabled={confirmPending || !confirmReference.trim()}
                      onClick={onConfirmPayment}
                    >
                      {confirmPending ? "Confirming…" : "Confirm payment"}
                    </button>
                  </div>
                  {confirmMessage ? (
                    <p className="mt-3 text-sm text-emerald-700">{confirmMessage}</p>
                  ) : null}
                </div>
              ) : null}
            </>
          ) : null}

          {activeTab === "hosting" ? (
            <CompanyHostingClient
              slug={slug}
              company={company}
              subscription={hosting.subscription}
              payments={hosting.payments}
              initialPlan={hosting.initialPlan}
              paymentConfirmation={hosting.paymentConfirmation}
              billingEmail={billingEmail}
              hostingDomain={hosting.hostingDomain}
              dnsRecords={hosting.dnsRecords}
              domainDnsHelp={hosting.domainDnsHelp}
              automationServices={hosting.automationServices}
              automationInvoices={hosting.automationInvoices}
              embedded
            />
          ) : null}

          {activeTab === "plans" ? (
            <>
              <p className="text-sm text-slate-600">
                Select a plan and pay through Paystack to activate or renew your subscription.
              </p>
              <div className="grid gap-4 lg:grid-cols-4">
                {pricingPlans.map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlan(plan.slug)}
                    className={cn(
                      "rounded-xl border p-5 text-left transition",
                      selectedPlan === plan.slug
                        ? "border-[#5a8dee] bg-[#eef2ff]/60 ring-2 ring-[#5a8dee]/30"
                        : "border-slate-200 bg-white hover:border-slate-300",
                      currentPlan === plan.slug && "ring-1 ring-emerald-200"
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-slate-800">{plan.name}</p>
                      {plan.is_popular ? (
                        <span className="rounded-full bg-[#eef2ff] px-2 py-0.5 text-[10px] font-semibold uppercase text-[#4a6fd8]">
                          Popular
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                      {plan.slug === "enterprise" ? (
                        <span className="text-lg">Custom</span>
                      ) : (
                        <>
                          {formatZar(plan.monthly_price)}
                          <span className="text-sm font-normal text-slate-500">/mo</span>
                        </>
                      )}
                    </p>
                    <ul className="mt-4 space-y-1 text-sm text-slate-600">
                      {plan.features.slice(0, 4).map((feature) => (
                        <li key={feature}>• {feature}</li>
                      ))}
                    </ul>
                  </button>
                ))}
              </div>

              {planMessage ? (
                <p className="text-sm text-emerald-700">{planMessage}</p>
              ) : null}

              {isSelfServePlan(selectedPlan) ? (
                <WorkspaceCheckoutSummary
                  plan={selectedPlan}
                  company={company}
                  includeSetupFee={includeSetupFee}
                  setupFeeEnabled={workspaceSetupFeeEnabled}
                  onIncludeSetupFeeChange={setIncludeSetupFee}
                />
              ) : null}

              <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
                {isSelfServePlan(selectedPlan) ? (
                  <button
                    type="button"
                    className={risePrimaryButtonClassName}
                    disabled={pending}
                    onClick={onPay}
                  >
                    <CreditCard className="h-4 w-4" strokeWidth={1.75} />
                    {pending
                      ? "Redirecting…"
                      : !isActive
                        ? "Pay with Paystack"
                        : isUpgrade
                          ? "Upgrade plan"
                          : isDowngrade
                            ? "Downgrade plan"
                            : "Renew subscription"}
                  </button>
                ) : (
                  <Link href="/contact" className={risePrimaryButtonClassName}>
                    Contact sales
                  </Link>
                )}
                {isActive && selectedPlan !== currentPlan && isSelfServePlan(selectedPlan) ? (
                  <button
                    type="button"
                    className={riseOutlineButtonClassName}
                    disabled={planPending}
                    onClick={onChangePlanOnly}
                  >
                    {planPending ? "Updating…" : "Apply plan change"}
                  </button>
                ) : null}
              </div>
            </>
          ) : null}

          {activeTab === "payments" ? (
            <>
              {paymentRows.length === 0 ? (
                <p className="text-sm text-slate-500">
                  No workspace subscription payments recorded yet. Completed Paystack payments
                  appear here after checkout or webhook confirmation.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50">
                      <tr className="border-b border-slate-200 text-xs uppercase tracking-wider text-slate-500">
                        <th className="px-4 py-3 font-semibold">Date</th>
                        <th className="px-4 py-3 font-semibold">Plan</th>
                        <th className="px-4 py-3 font-semibold">Amount</th>
                        <th className="px-4 py-3 font-semibold">Status</th>
                        <th className="px-4 py-3 font-semibold">Reference</th>
                        <th className="px-4 py-3 font-semibold">Invoice</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paymentRows.map((payment) => (
                        <tr key={payment.id} className="border-b border-slate-100 last:border-0">
                          <td className="px-4 py-3 text-slate-700">
                            {new Date(payment.date).toLocaleDateString("en-ZA")}
                          </td>
                          <td className="px-4 py-3 capitalize text-slate-700">{payment.plan}</td>
                          <td className="px-4 py-3 text-slate-700">{formatZar(payment.amount)}</td>
                          <td className="px-4 py-3 capitalize text-slate-700">{payment.status}</td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-500">
                            {payment.reference ?? "—"}
                          </td>
                          <td className="px-4 py-3">
                            {payment.reference && payment.status === "success" ? (
                              <a
                                href={`https://paystack.com/receipt/${payment.reference}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-xs font-medium text-[#4a6fd8] hover:text-[#3b5fc4]"
                              >
                                <Download className="h-3.5 w-3.5" />
                                Download
                              </a>
                            ) : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
