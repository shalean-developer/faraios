"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  CreditCard,
  Globe,
  Loader2,
  RefreshCw,
  Server,
  Shield,
  XCircle,
} from "lucide-react";

import {
  cancelHostingSubscriptionAction,
  connectHostingDomainAction,
  verifyHostingDomainAction,
} from "@/app/actions/hosting";
import { confirmHostingPaymentAction } from "@/app/actions/confirm-hosting-payment";
import { rememberHostingPaymentReference } from "@/components/hosting/hosting-payment-recovery";
import { Button } from "@/components/ui/button";
import {
  formatZar,
  hostingPlanLabelForSlug,
  hostingPlans,
  normalizeHostingPlanSlug,
} from "@/lib/data/hosting";
import { companyDashboardPath, companyWebsiteDomainsPath } from "@/lib/paths/company";
import { FARAIOS_CNAME_TARGET } from "@/lib/hosting/constants";
import { cn } from "@/lib/utils";
import type {
  CompanyWithIndustry,
  HostingPayment,
  HostingSubscription,
} from "@/types/database";
import type { WebsiteDnsRecord, WebsiteDomain } from "@/types/website-engine";
import type { HostingPaymentConfirmationState } from "@/lib/services/hosting-subscription-verify";

type Props = {
  slug: string;
  company: CompanyWithIndustry;
  subscription: HostingSubscription | null;
  payments: HostingPayment[];
  initialPlan?: string;
  paymentConfirmation: HostingPaymentConfirmationState;
  billingEmail?: string | null;
  hostingDomain: WebsiteDomain | null;
  dnsRecords: WebsiteDnsRecord[];
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  },
};

function statusBadge(status: HostingSubscription["status"]) {
  const map: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-800 ring-emerald-100",
    pending: "bg-amber-50 text-amber-800 ring-amber-100",
    suspended: "bg-red-50 text-red-800 ring-red-100",
    cancelled: "bg-slate-50 text-slate-600 ring-slate-100",
  };
  return map[status] ?? map.pending;
}

export function CompanyHostingClient({
  slug,
  company,
  subscription,
  payments,
  initialPlan,
  paymentConfirmation,
  billingEmail,
  hostingDomain,
  dnsRecords,
}: Props) {
  const [selectedPlan, setSelectedPlan] = useState(
    normalizeHostingPlanSlug(initialPlan ?? subscription?.plan_slug)
  );
  const [billingPending, setBillingPending] = useState(false);
  const [billingError, setBillingError] = useState<string | null>(null);
  const [domainInput, setDomainInput] = useState(subscription?.custom_domain ?? "");
  const [domainPending, setDomainPending] = useState(false);
  const [domainError, setDomainError] = useState<string | null>(null);
  const [verifyPending, setVerifyPending] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);
  const [cancelPending, setCancelPending] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [confirmReference, setConfirmReference] = useState("");
  const [confirmPending, setConfirmPending] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const isActive = subscription?.status === "active";
  const planLabel = subscription
    ? hostingPlanLabelForSlug(normalizeHostingPlanSlug(subscription.plan_slug))
    : null;

  const onStartPayment = async () => {
    const email =
      company.primary_contact_email?.trim() || billingEmail?.trim() || "";
    if (!email) {
      setBillingError("Missing billing email on your workspace.");
      return;
    }
    setBillingError(null);
    setBillingPending(true);
    try {
      const res = await fetch("/api/paystack/hosting/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: company.id,
          plan: selectedPlan,
          email,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        authorizationUrl?: string;
        reference?: string;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.authorizationUrl) {
        setBillingError(data.error ?? "Failed to initialize payment.");
        setBillingPending(false);
        return;
      }
      if (data.reference) {
        rememberHostingPaymentReference(company.id, data.reference);
      }
      window.location.assign(data.authorizationUrl);
    } catch {
      if (mountedRef.current) {
        setBillingError("Could not start payment.");
        setBillingPending(false);
      }
    }
  };

  const onConfirmPayment = async () => {
    setConfirmMessage(null);
    setBillingError(null);
    setConfirmPending(true);
    try {
      const result = await confirmHostingPaymentAction({
        companyId: company.id,
        companySlug: slug,
        reference: confirmReference,
      });
      if (!result.ok) {
        setBillingError(result.error);
        return;
      }
      setConfirmMessage(
        result.activated
          ? "Hosting payment confirmed. Your plan is now active."
          : "Hosting payment confirmed. Your plan is already active."
      );
      window.location.reload();
    } finally {
      setConfirmPending(false);
    }
  };

  const onConnectDomain = async (e: FormEvent) => {
    e.preventDefault();
    if (!subscription?.id) return;
    setDomainError(null);
    setDomainPending(true);
    try {
      const result = await connectHostingDomainAction(
        subscription.id,
        slug,
        domainInput
      );
      if (!result.ok) {
        setDomainError(result.error);
        return;
      }
      window.location.reload();
    } finally {
      setDomainPending(false);
    }
  };

  const onVerifyDns = async () => {
    if (!hostingDomain?.id) return;
    setVerifyMessage(null);
    setDomainError(null);
    setVerifyPending(true);
    try {
      const result = await verifyHostingDomainAction({
        companyId: company.id,
        companySlug: slug,
        websiteDomainId: hostingDomain.id,
      });
      if (!result.ok) {
        setDomainError(result.error);
        return;
      }
      setVerifyMessage(
        result.verified
          ? "Domain verified. SSL will activate once your provider finishes provisioning."
          : "DNS not verified yet. Check the records below and try again in a few minutes."
      );
      window.location.reload();
    } finally {
      setVerifyPending(false);
    }
  };

  const onCancel = async () => {
    if (!subscription?.id) return;
    if (!window.confirm("Cancel hosting? Sites stay live until the billing period ends.")) {
      return;
    }
    setCancelError(null);
    setCancelPending(true);
    try {
      const result = await cancelHostingSubscriptionAction(subscription.id, slug);
      if (!result.ok) {
        setCancelError(result.error);
        return;
      }
      window.location.reload();
    } finally {
      setCancelPending(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#f4f6fb]">
      <motion.div
        className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:py-10"
        initial="hidden"
        animate="visible"
        variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
      >
        <motion.div variants={fadeUp} className="mb-6">
          <Link
            href={companyDashboardPath(slug)}
            className="inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
        </motion.div>

        <motion.header
          variants={fadeUp}
          className="relative rounded-3xl border border-slate-200/80 bg-white p-6 shadow-sm sm:p-8"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-indigo-700">
                <Server className="h-3.5 w-3.5" />
                Website · Subscription
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {company.name}
              </h1>
              <p className="mt-2 text-sm text-slate-500">
                Manage your Shalean cloud hosting subscription
              </p>
            </div>
            {subscription ? (
              <span
                className={cn(
                  "inline-flex self-start rounded-full px-3 py-1 text-xs font-semibold ring-1",
                  statusBadge(subscription.status)
                )}
              >
                {subscription.status}
              </span>
            ) : null}
          </div>
        </motion.header>

        {paymentConfirmation.status === "activated" ||
        paymentConfirmation.status === "already_active" ? (
          <motion.div
            variants={fadeUp}
            className="mt-6 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            {paymentConfirmation.status === "activated"
              ? "Hosting payment confirmed. Your plan is now active."
              : "Hosting payment confirmed. Your hosting plan is active."}
          </motion.div>
        ) : null}

        {paymentConfirmation.status === "pending_webhook" ? (
          <motion.div
            variants={fadeUp}
            className="mt-6 flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            Verifying your hosting payment. Refresh in a moment if status has not
            updated.
          </motion.div>
        ) : null}

        {paymentConfirmation.status === "failed" ? (
          <motion.div
            variants={fadeUp}
            className="mt-6 flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            <XCircle className="h-5 w-5 shrink-0" />
            {paymentConfirmation.error}
          </motion.div>
        ) : null}

        {isActive && subscription ? (
          <>
            <motion.div
              variants={fadeUp}
              className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              <InfoCard
                icon={<Server className="h-5 w-5 text-indigo-600" />}
                label="Plan"
                value={planLabel ?? "—"}
              />
              <InfoCard
                icon={<Globe className="h-5 w-5 text-violet-600" />}
                label="Subdomain"
                value={`${subscription.subdomain ?? slug}.faraios.com`}
              />
              <InfoCard
                icon={<Shield className="h-5 w-5 text-emerald-600" />}
                label="SSL"
                value={subscription.ssl_status}
              />
              <InfoCard
                icon={<CreditCard className="h-5 w-5 text-teal-600" />}
                label="Renews"
                value={
                  subscription.next_billing_date
                    ? new Date(subscription.next_billing_date).toLocaleDateString("en-ZA")
                    : "—"
                }
              />
            </motion.div>

            <motion.section variants={fadeUp} className="mt-10 rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-bold text-slate-900">Usage & limits</h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase text-slate-400">Sites</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">
                    0 / {subscription.sites_limit >= 999 ? "∞" : subscription.sites_limit}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase text-slate-400">Bandwidth</p>
                  <p className="mt-1 text-xl font-bold text-slate-900">
                    Included / {subscription.bandwidth_limit_gb} GB
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase text-slate-400">Domain</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {subscription.custom_domain ?? "Not connected"}
                  </p>
                  {subscription.domain_status !== "none" ? (
                    <p className="text-xs text-slate-500">{subscription.domain_status}</p>
                  ) : null}
                </div>
              </div>
            </motion.section>

            <motion.section variants={fadeUp} className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-bold text-slate-900">Connect custom domain</h2>
              <p className="mt-1 text-sm text-slate-500">
                Point your domain&apos;s DNS to Shalean hosting. Add the records below at your
                registrar, then click <strong>Verify DNS</strong>.
              </p>
              <form onSubmit={onConnectDomain} className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input
                  value={domainInput}
                  onChange={(e) => setDomainInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder="www.yourbusiness.com"
                />
                <Button type="submit" disabled={domainPending}>
                  {domainPending ? "Connecting..." : "Connect domain"}
                </Button>
              </form>
              {domainError ? (
                <p className="mt-2 text-sm font-medium text-red-600">{domainError}</p>
              ) : null}
              {verifyMessage ? (
                <p className="mt-2 text-sm font-medium text-emerald-700">{verifyMessage}</p>
              ) : null}

              {subscription.custom_domain && hostingDomain ? (
                <div className="mt-6 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{hostingDomain.domain}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        Domain {hostingDomain.verification_status} · SSL {hostingDomain.ssl_status}
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      disabled={verifyPending}
                      onClick={onVerifyDns}
                    >
                      {verifyPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                          Verify DNS
                        </>
                      )}
                    </Button>
                  </div>

                  {dnsRecords.length > 0 ? (
                    <div className="mt-4 overflow-x-auto">
                      <table className="w-full min-w-[480px] text-left text-sm">
                        <thead>
                          <tr className="border-b border-slate-200 text-xs uppercase text-slate-500">
                            <th className="py-2 pr-4">Type</th>
                            <th className="py-2 pr-4">Host</th>
                            <th className="py-2 pr-4">Value</th>
                            <th className="py-2">Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dnsRecords.map((record) => (
                            <tr key={record.id} className="border-b border-slate-100 last:border-0">
                              <td className="py-2 pr-4 font-mono text-xs">{record.record_type}</td>
                              <td className="py-2 pr-4 font-mono text-xs">
                                {record.host === "@" ? "@" : record.host}
                              </td>
                              <td className="max-w-xs truncate py-2 pr-4 font-mono text-xs">
                                {record.value}
                              </td>
                              <td className="py-2">
                                <DnsStatusPill status={record.status} />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="mt-4 text-sm text-slate-500">
                      CNAME your domain to{" "}
                      <code className="rounded bg-white px-1 py-0.5">{FARAIOS_CNAME_TARGET}</code>
                    </p>
                  )}

                  <p className="mt-4 text-xs text-slate-500">
                    Need more domains?{" "}
                    <Link
                      href={companyWebsiteDomainsPath(slug)}
                      className="font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      Manage in Website → Domains
                    </Link>
                  </p>
                </div>
              ) : subscription.custom_domain ? (
                <p className="mt-4 text-sm text-amber-700">
                  Provisioning DNS instructions for {subscription.custom_domain}… Refresh if this
                  message persists.
                </p>
              ) : null}
            </motion.section>

            <motion.section variants={fadeUp} className="mt-8 rounded-2xl border border-slate-200 bg-white p-6">
              <h2 className="text-lg font-bold text-slate-900">Payment history</h2>
              {payments.length === 0 ? (
                <p className="mt-2 text-sm text-slate-500">No payments recorded yet.</p>
              ) : (
                <div className="mt-4 overflow-hidden rounded-xl border border-slate-100">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Plan</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payments.map((p) => (
                        <tr key={p.id}>
                          <td className="px-4 py-3 text-slate-700">
                            {new Date(p.paid_at ?? p.created_at).toLocaleDateString("en-ZA")}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {hostingPlanLabelForSlug(normalizeHostingPlanSlug(p.plan_slug))}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {formatZar(p.amount_cents / 100)}
                          </td>
                          <td className="px-4 py-3">
                            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                              {p.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.section>

            {subscription.status !== "cancelled" ? (
              <motion.section variants={fadeUp} className="mt-8">
                <Button
                  variant="outline"
                  className="rounded-xl border-red-200 text-red-600 hover:bg-red-50"
                  disabled={cancelPending}
                  onClick={onCancel}
                >
                  {cancelPending ? "Cancelling..." : "Cancel hosting"}
                </Button>
                {cancelError ? (
                  <p className="mt-2 text-sm font-medium text-red-600">{cancelError}</p>
                ) : null}
              </motion.section>
            ) : null}
          </>
        ) : (
          <section className="mt-8">
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center">
              <XCircle className="mx-auto h-10 w-10 text-slate-300" />
              <h2 className="mt-4 text-lg font-bold text-slate-900">
                No active hosting
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                Choose a hosting plan and pay securely with Paystack to activate
                your Shalean cloud hosting.
              </p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {hostingPlans.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedPlan(plan.slug)}
                  className={cn(
                    "rounded-2xl border p-5 text-left transition-all",
                    selectedPlan === plan.slug
                      ? "border-indigo-300 bg-indigo-50/50 ring-2 ring-indigo-200"
                      : "border-slate-200 bg-white hover:border-indigo-200"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-bold text-slate-900">{plan.name}</p>
                    <p className="text-lg font-extrabold text-slate-900">
                      {formatZar(plan.monthly_price)}
                      <span className="text-xs font-medium text-slate-500">/mo</span>
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">{plan.description}</p>
                </button>
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button
                onClick={onStartPayment}
                disabled={billingPending}
                className="rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600"
              >
                {billingPending ? "Redirecting to Paystack..." : "Pay with Paystack"}
              </Button>
              <Link
                href="/hosting"
                className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
              >
                Compare all plans →
              </Link>
            </div>
            {billingError ? (
              <p className="mt-2 text-sm font-medium text-red-600">{billingError}</p>
            ) : null}

            <div className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-5">
              <h3 className="text-sm font-semibold text-slate-900">Already paid?</h3>
              <p className="mt-1 text-sm text-slate-600">
                Paste your Paystack reference to confirm hosting payment.
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
            </div>
          </section>
        )}
      </motion.div>
    </div>
  );
}

function DnsStatusPill({ status }: { status: WebsiteDnsRecord["status"] }) {
  const styles: Record<string, string> = {
    verified: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    pending: "bg-amber-50 text-amber-800 ring-amber-100",
    failed: "bg-red-50 text-red-700 ring-red-100",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1",
        styles[status] ?? styles.pending
      )}
    >
      {status === "verified" ? <Check className="h-3 w-3" /> : null}
      {status}
    </span>
  );
}

function InfoCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-100">
        {icon}
      </div>
      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 text-sm font-bold text-slate-900">{value}</p>
    </div>
  );
}
