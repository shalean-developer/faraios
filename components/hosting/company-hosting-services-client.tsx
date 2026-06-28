"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { confirmHostingPaymentAction } from "@/app/actions/confirm-hosting-payment";
import { formatHostingAmount, HostingStatusBadge } from "@/components/hosting/hosting-shared-ui";
import { CompanyHostingLegacyBanner } from "@/components/hosting/company-hosting-legacy-banner";
import { HostingPaymentRecovery } from "@/components/hosting/hosting-payment-recovery";
import { Button } from "@/components/ui/button";
import { requestHostingCancellationAction } from "@/app/actions/hosting-automation";
import { companyHostingOrderPath } from "@/lib/paths/company";
import type { HostingPaymentConfirmationState } from "@/lib/services/hosting-subscription-verify";
import type { HostingInvoiceRow, HostingServiceRow } from "@/types/hosting-automation";

function HostingPaymentStatusBanner({
  paymentConfirmation,
  context = "invoices",
}: {
  paymentConfirmation: HostingPaymentConfirmationState;
  context?: "services" | "invoices";
}) {
  if (paymentConfirmation.status === "activated") {
    return (
      <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        {context === "services"
          ? "Payment confirmed. Your Plesk hosting account is being provisioned — refresh in a moment if your service does not appear yet."
          : "Payment confirmed. Your hosting order has been updated."}
      </p>
    );
  }
  if (paymentConfirmation.status === "already_active") {
    return (
      <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        Hosting payment is already active for this workspace.
      </p>
    );
  }
  if (paymentConfirmation.status === "failed") {
    return (
      <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
        {paymentConfirmation.error}
      </p>
    );
  }
  if (paymentConfirmation.status === "pending_webhook") {
    return (
      <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Payment received. Confirming your hosting order — this usually takes a few seconds.
      </p>
    );
  }
  return null;
}

function HostingPaymentConfirmPanel({
  slug,
  companyId,
}: {
  slug: string;
  companyId: string;
}) {
  const router = useRouter();
  const [confirmReference, setConfirmReference] = useState("");
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [confirmPending, startConfirm] = useTransition();

  const onConfirmPayment = () => {
    setConfirmMessage(null);
    setConfirmError(null);
    startConfirm(async () => {
      const result = await confirmHostingPaymentAction({
        companyId,
        companySlug: slug,
        reference: confirmReference,
      });
      if (!result.ok) {
        setConfirmError(result.error);
        return;
      }
      setConfirmMessage(
        result.activated
          ? "Hosting payment confirmed. Your Plesk account is being provisioned."
          : "Hosting payment confirmed. Your plan is already active."
      );
      router.refresh();
    });
  };

  return (
    <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-5">
      <h2 className="text-sm font-semibold text-slate-900">Already paid?</h2>
      <p className="mt-1 text-sm text-slate-600">
        Paste your Paystack reference (e.g.{" "}
        <span className="font-mono text-xs">kl7m75hl15</span>) or the full return URL Paystack
        sent you to.
      </p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          value={confirmReference}
          onChange={(event) => setConfirmReference(event.target.value)}
          placeholder="kl7m75hl15 or full return URL"
          autoComplete="off"
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
      {confirmError ? <p className="mt-3 text-sm text-red-700">{confirmError}</p> : null}
    </div>
  );
}

export function CompanyHostingServicesClient({
  slug,
  companyId,
  services,
  hasLegacySubscription = false,
  paymentConfirmation = { status: "none" },
}: {
  slug: string;
  companyId: string;
  services: HostingServiceRow[];
  hasLegacySubscription?: boolean;
  paymentConfirmation?: HostingPaymentConfirmationState;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const onCancel = (service: HostingServiceRow) => {
    if (
      !window.confirm(
        `Request cancellation for ${service.domain_name}? Your hosting stays active until the billing period ends.`
      )
    ) {
      return;
    }
    setMessage(null);
    setError(null);
    setPendingId(service.id);
    startTransition(async () => {
      const result = await requestHostingCancellationAction({
        companyId,
        companySlug: slug,
        serviceId: service.id,
        domainName: service.domain_name,
      });
      setPendingId(null);
      if (!result.ok) {
        setError(result.error ?? "Could not request cancellation.");
        return;
      }
      setMessage(`Cancellation requested for ${service.domain_name}.`);
      router.refresh();
    });
  };

  return (
    <>
      <HostingPaymentRecovery
        slug={slug}
        companyId={companyId}
        paymentConfirmation={paymentConfirmation}
      />

      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Hosting services</h1>
      <p className="mt-2 text-sm text-slate-500">Manage provisioned hosting services for your workspace.</p>

      <HostingPaymentStatusBanner
        paymentConfirmation={paymentConfirmation}
        context="services"
      />

      <CompanyHostingLegacyBanner
        slug={slug}
        hasLegacySubscription={hasLegacySubscription}
        hasAutomationServices={services.length > 0}
      />

      {message && (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="mt-6 space-y-4">
        {services.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            No hosting services yet.{" "}
            {!hasLegacySubscription && (
              <Link href={companyHostingOrderPath(slug)} className="font-semibold text-indigo-600">
                Order hosting
              </Link>
            )}
          </div>
        ) : null}

        {services.length === 0 &&
        (paymentConfirmation.status === "none" ||
          paymentConfirmation.status === "pending_webhook" ||
          paymentConfirmation.status === "failed") ? (
          <HostingPaymentConfirmPanel slug={slug} companyId={companyId} />
        ) : null}

        {services.length > 0 ? (
          services.map((service) => (
            <div key={service.id} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-base font-bold text-slate-900">{service.domain_name}</p>
                  <p className="text-sm text-slate-500">
                    {service.hosting_plans?.name ?? "Hosting plan"}
                  </p>
                  {service.next_due_date && (
                    <p className="mt-1 text-xs text-slate-400">
                      Renews {new Date(service.next_due_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <HostingStatusBadge status={service.status} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {service.control_panel_url && (
                  <a
                    href={service.control_panel_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-8 items-center rounded-md border border-input bg-background px-3 text-xs font-medium"
                  >
                    Control panel <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pendingId === service.id}
                  onClick={() => onCancel(service)}
                >
                  {pendingId === service.id ? "Requesting..." : "Request cancellation"}
                </Button>
              </div>
            </div>
          ))
        ) : null}
      </div>
    </>
  );
}

export function CompanyHostingInvoicesClient({
  slug,
  companyId,
  invoices,
  hasLegacySubscription = false,
  paymentConfirmation = { status: "none" },
}: {
  slug: string;
  companyId?: string;
  invoices: HostingInvoiceRow[];
  hasLegacySubscription?: boolean;
  paymentConfirmation?: HostingPaymentConfirmationState;
}) {
  return (
    <>
      {companyId ? (
        <HostingPaymentRecovery
          slug={slug}
          companyId={companyId}
          paymentConfirmation={paymentConfirmation}
        />
      ) : null}

      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Hosting invoices</h1>
      <p className="mt-2 text-sm text-slate-500">View invoices for your hosting orders.</p>

      <HostingPaymentStatusBanner paymentConfirmation={paymentConfirmation} />

      {invoices.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No invoices yet.{" "}
          {!hasLegacySubscription && (
            <Link href={companyHostingOrderPath(slug)} className="font-semibold text-indigo-600">
              Order hosting
            </Link>
          )}
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80">
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Invoice
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Amount
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Due
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-400">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => (
                <tr key={invoice.id} className="border-b border-slate-50 text-sm">
                  <td className="px-4 py-3 font-semibold text-slate-900">{invoice.invoice_number}</td>
                  <td className="px-4 py-3">
                    {formatHostingAmount(invoice.amount_cents, invoice.currency)}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Date(invoice.due_date).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <HostingStatusBadge status={invoice.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
