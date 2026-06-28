"use client";

import Link from "next/link";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
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
import { createHostingOrderAction } from "@/app/actions/hosting-automation";
import { confirmHostingPaymentAction } from "@/app/actions/confirm-hosting-payment";
import { rememberHostingPaymentReference } from "@/components/hosting/hosting-payment-recovery";
import { ClientOnly } from "@/components/client-only";
import { Button } from "@/components/ui/button";
import {
  formatZar,
  hostingPlanLabelForSlug,
  hostingPlans,
  normalizeHostingPlanSlug,
} from "@/lib/data/hosting";
import { companyWebsiteDomainsPath, companyHostingInvoicesPath, companyHostingServicesPath } from "@/lib/paths/company";
import type { WebsiteDomainDnsHelp } from "@/components/websites/website-domains-panel";
import { formatDateEnZA } from "@/lib/format/dates";
import { cn } from "@/lib/utils";
import {
  riseCardClassName,
  risePageClassName,
  risePrimaryButtonClassName,
} from "@/lib/ui/rise-dashboard-styles";
import type {
  CompanyWithIndustry,
  HostingPayment,
  HostingSubscription,
} from "@/types/database";
import type { HostingInvoiceRow, HostingPlanRow, HostingServiceRow } from "@/types/hosting-automation";
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
  domainDnsHelp?: WebsiteDomainDnsHelp | null;
  automationServices?: HostingServiceRow[];
  automationInvoices?: HostingInvoiceRow[];
  automationPlans?: HostingPlanRow[];
  embedded?: boolean;
};

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] as const },
  },
};

function WidgetHeader({ title }: { title: string }) {
  return (
    <div className="border-b border-slate-100 px-4 py-3 sm:px-5">
      <h2 className="text-sm font-medium text-slate-700">{title}</h2>
    </div>
  );
}

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
  domainDnsHelp,
  automationServices = [],
  automationInvoices = [],
  automationPlans = [],
  embedded = false,
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

    const normalizedDomain = domainInput
      .trim()
      .toLowerCase()
      .replace(/^https?:\/\//, "")
      .replace(/\/.*$/, "")
      .replace(/^www\./, "");

    if (!normalizedDomain || !normalizedDomain.includes(".")) {
      setBillingError("Enter your domain name (e.g. yourbusiness.co.za).");
      return;
    }

    const plan =
      automationPlans.find((entry) => entry.slug === selectedPlan) ?? automationPlans[0];
    if (!plan) {
      setBillingError("Hosting plans are not configured yet. Contact support.");
      return;
    }

    setBillingError(null);
    setBillingPending(true);
    try {
      const orderResult = await createHostingOrderAction({
        companyId: company.id,
        companySlug: slug,
        planId: plan.id,
        domainName: normalizedDomain,
        domainType: "existing",
        billingCycle: "monthly",
      });

      if (!orderResult.ok) {
        setBillingError(orderResult.error);
        setBillingPending(false);
        return;
      }

      if (!orderResult.orderId || !orderResult.invoiceId) {
        setBillingError("Order created but payment details are missing.");
        setBillingPending(false);
        return;
      }

      const res = await fetch("/api/paystack/hosting/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: company.id,
          plan: plan.slug,
          email,
          orderId: orderResult.orderId,
          invoiceId: orderResult.invoiceId,
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
          ? "Hosting payment confirmed. Your Plesk account is being provisioned."
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

  const content = (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{ visible: { transition: { staggerChildren: 0.06 } } }}
    >
      {!embedded ? (
        <motion.div variants={fadeUp} className={riseCardClassName}>
          <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
            <div>
              <h1 className="text-lg font-medium text-slate-800">Website hosting</h1>
              <p className="mt-1 text-sm text-slate-500">{company.name}</p>
              <p className="mt-1 text-sm text-slate-500">
                Manage your FaraiOS cloud hosting subscription
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
        </motion.div>
      ) : null}

        {(automationServices.length > 0 || automationInvoices.length > 0) && (
          <motion.section variants={fadeUp} className={cn(embedded ? "" : "mt-4", "grid gap-4 sm:grid-cols-2")}>
            <div className={cn(riseCardClassName, "p-5")}>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Provisioned services</p>
              <p className="mt-1 text-2xl font-extrabold text-slate-900">{automationServices.length}</p>
              <Link href={companyHostingServicesPath(slug)} className="mt-2 inline-block text-sm font-semibold text-[#4a6fd8]">
                Manage services
              </Link>
            </div>
            <div className={cn(riseCardClassName, "p-5")}>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Hosting invoices</p>
              <p className="mt-1 text-2xl font-extrabold text-slate-900">{automationInvoices.length}</p>
              <Link href={companyHostingInvoicesPath(slug)} className="mt-2 inline-block text-sm font-semibold text-[#4a6fd8]">
                View invoices
              </Link>
            </div>
          </motion.section>
        )}

        {paymentConfirmation.status === "activated" ||
        paymentConfirmation.status === "already_active" ? (
          <motion.div
            variants={fadeUp}
            className="mt-4 flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
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
            className="mt-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"
          >
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            Verifying your hosting payment. Refresh in a moment if status has not
            updated.
          </motion.div>
        ) : null}

        {paymentConfirmation.status === "failed" ? (
          <motion.div
            variants={fadeUp}
            className="mt-4 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            <XCircle className="h-5 w-5 shrink-0" />
            {paymentConfirmation.error}
          </motion.div>
        ) : null}

        {isActive && subscription ? (
          <>
            <motion.div
              variants={fadeUp}
              className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              <InfoCard
                icon={<Server className="h-5 w-5 text-[#5a8dee]" />}
                label="Plan"
                value={planLabel ?? "—"}
              />
              <InfoCard
                icon={<Globe className="h-5 w-5 text-[#4a6fd8]" />}
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
                    ? formatDateEnZA(subscription.next_billing_date)
                    : "—"
                }
              />
            </motion.div>

            <motion.section variants={fadeUp} className={cn("mt-4", riseCardClassName)}>
              <WidgetHeader title="Usage & limits" />
              <div className="grid gap-4 p-4 sm:grid-cols-3 sm:p-5">
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

            <motion.section variants={fadeUp} className={cn("mt-4", riseCardClassName)}>
              <WidgetHeader title="Connect custom domain" />
              <div className="p-4 sm:p-5">
              <p className="text-sm text-slate-500">
                Point your domain&apos;s DNS to FaraiOS Plesk hosting. Add the records below at your
                registrar, then click <strong>Verify DNS</strong>.
              </p>
              {domainDnsHelp?.serverIp ? (
                <p className="mt-2 text-xs text-slate-500">
                  Plesk server IP:{" "}
                  <code className="rounded bg-white px-1 py-0.5">{domainDnsHelp.serverIp}</code>
                </p>
              ) : null}
              <ClientOnly
                fallback={
                  <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <div className="h-10 w-full animate-pulse rounded-xl bg-slate-100" />
                    <div className="h-10 w-36 animate-pulse rounded-xl bg-slate-100" />
                  </div>
                }
              >
                <form onSubmit={onConnectDomain} className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <input
                    value={domainInput}
                    onChange={(e) => setDomainInput(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="www.yourbusiness.com"
                    autoComplete="off"
                    suppressHydrationWarning
                  />
                  <Button type="submit" disabled={domainPending}>
                    {domainPending ? "Connecting..." : "Connect domain"}
                  </Button>
                </form>
              </ClientOnly>
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
                      {domainDnsHelp?.helpText ??
                        "Connect a domain to load A record instructions for your Plesk server."}
                    </p>
                  )}

                  <p className="mt-4 text-xs text-slate-500">
                    Need more domains?{" "}
                    <Link
                      href={companyWebsiteDomainsPath(slug)}
                      className="font-medium text-[#4a6fd8] hover:text-[#3a5fc8]"
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
              </div>
            </motion.section>

            <motion.section variants={fadeUp} className={cn("mt-4", riseCardClassName)}>
              <WidgetHeader title="Payment history" />
              <div className="p-4 sm:p-5">
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
                            {formatDateEnZA(p.paid_at ?? p.created_at)}
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
              </div>
            </motion.section>

            {subscription.status !== "cancelled" ? (
              <motion.section variants={fadeUp} className="mt-4">
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
          <section className="mt-4">
            <div className={cn(riseCardClassName, "p-8 text-center")}>
              <XCircle className="mx-auto h-10 w-10 text-slate-300" />
              <h2 className="mt-4 text-lg font-bold text-slate-900">
                No active hosting
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
                Choose a plan, enter your domain, and pay securely with Paystack.
                Your Plesk hosting account is provisioned automatically after payment.
              </p>
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 bg-white p-5">
              <label className="block text-sm font-semibold text-slate-900">
                Domain name
              </label>
              <p className="mt-1 text-xs text-slate-500">
                The domain for your new Plesk hosting account (without www).
              </p>
              <input
                value={domainInput}
                onChange={(event) => setDomainInput(event.target.value)}
                placeholder="yourbusiness.co.za"
                className="mt-3 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              {hostingPlans.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedPlan(plan.slug)}
                  className={cn(
                    "rounded-xl border p-5 text-left transition-all",
                    selectedPlan === plan.slug
                      ? "border-[#5a8dee] bg-[#eef2ff]/60 ring-2 ring-[#5a8dee]/30"
                      : "border-slate-200 bg-white hover:border-slate-300"
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
                className={risePrimaryButtonClassName}
              >
                {billingPending ? "Redirecting to Paystack..." : "Order hosting & pay"}
              </Button>
              <Link
                href="/hosting"
                className="text-sm font-medium text-[#4a6fd8] hover:text-[#3a5fc8]"
              >
                Compare all plans →
              </Link>
            </div>
            {billingError ? (
              <p className="mt-2 text-sm font-medium text-red-600">{billingError}</p>
            ) : null}

            <div className="mt-8 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-5">
              <h3 className="text-sm font-semibold text-slate-900">Already paid?</h3>
              <p className="mt-1 text-sm text-slate-600">
                Paste your Paystack reference (e.g.{" "}
                <span className="font-mono text-xs">plkv6ima1c</span>) or the full URL Paystack
                returned you to.
              </p>
              <ClientOnly
                fallback={
                  <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                    <div className="h-10 flex-1 animate-pulse rounded-xl bg-slate-100" />
                    <div className="h-10 w-40 animate-pulse rounded-xl bg-slate-100" />
                  </div>
                }
              >
                <div className="mt-4 flex flex-col gap-3 sm:flex-row">
                  <input
                    type="text"
                    value={confirmReference}
                    onChange={(event) => setConfirmReference(event.target.value)}
                    placeholder="plkv6ima1c or full return URL"
                    autoComplete="off"
                    suppressHydrationWarning
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
              </ClientOnly>
              {confirmMessage ? (
                <p className="mt-3 text-sm text-emerald-700">{confirmMessage}</p>
              ) : null}
            </div>
          </section>
        )}
      </motion.div>
  );

  if (embedded) {
    return content;
  }

  return <div className={risePageClassName}>{content}</div>;
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
    <div className={cn(riseCardClassName, "p-5")}>
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
