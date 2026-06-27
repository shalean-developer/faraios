"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { formatHostingAmount, HostingStatusBadge } from "@/components/hosting/hosting-shared-ui";
import { CompanyHostingLegacyBanner } from "@/components/hosting/company-hosting-legacy-banner";
import { Button } from "@/components/ui/button";
import { requestHostingCancellationAction } from "@/app/actions/hosting-automation";
import { companyHostingOrderPath } from "@/lib/paths/company";
import type { HostingInvoiceRow, HostingServiceRow } from "@/types/hosting-automation";

export function CompanyHostingServicesClient({
  slug,
  companyId,
  services,
  hasLegacySubscription = false,
}: {
  slug: string;
  companyId: string;
  services: HostingServiceRow[];
  hasLegacySubscription?: boolean;
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
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Hosting services</h1>
      <p className="mt-2 text-sm text-slate-500">Manage provisioned hosting services for your workspace.</p>

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
        ) : (
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
        )}
      </div>
    </>
  );
}

export function CompanyHostingInvoicesClient({
  slug,
  invoices,
  hasLegacySubscription = false,
}: {
  slug: string;
  invoices: HostingInvoiceRow[];
  hasLegacySubscription?: boolean;
}) {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Hosting invoices</h1>
      <p className="mt-2 text-sm text-slate-500">View invoices for your hosting orders.</p>

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
