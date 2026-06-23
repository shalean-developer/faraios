"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Download } from "lucide-react";

import { confirmEftPaymentAction } from "@/app/actions/payments";
import { Button } from "@/components/ui/button";
import { downloadPaymentsCsv } from "@/lib/financial/payments-csv";
import {
  PAYMENT_PROVIDERS,
  PAYMENT_STATUSES,
  paymentStatusBadgeClass,
} from "@/lib/financial/status";
import type { PaymentProvider, PaymentStatus } from "@/lib/financial/status";
import { formatRevenue } from "@/lib/operations/metrics";
import {
  companyCustomerPath,
  companyInvoicePath,
  companyInvoicesPath,
  companyRevenuePath,
} from "@/lib/paths/company";
import type { PaymentListSummary } from "@/lib/services/payments";
import { cn } from "@/lib/utils";
import type { CompanyWithIndustry } from "@/types/database";
import type { PaymentWithRelations } from "@/types/financial";

type StatusFilter = "all" | PaymentStatus;
type ProviderFilter = "all" | PaymentProvider;

function formatDateTime(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function CompanyPaymentsClient({
  slug,
  company,
  payments: initialPayments,
  summary,
}: {
  slug: string;
  company: CompanyWithIndustry;
  payments: PaymentWithRelations[];
  summary: PaymentListSummary;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialPayments);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [providerFilter, setProviderFilter] = useState<ProviderFilter>("all");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setRows(initialPayments);
  }, [initialPayments]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((payment) => {
      if (statusFilter !== "all" && payment.status !== statusFilter) return false;
      if (providerFilter !== "all" && payment.provider !== providerFilter) return false;
      if (!query) return true;

      return (
        (payment.customers?.name ?? "").toLowerCase().includes(query) ||
        (payment.customers?.email ?? "").toLowerCase().includes(query) ||
        (payment.invoices?.invoice_number ?? "").toLowerCase().includes(query) ||
        (payment.provider_reference ?? "").toLowerCase().includes(query) ||
        payment.provider.toLowerCase().includes(query) ||
        payment.status.toLowerCase().includes(query)
      );
    });
  }, [rows, search, statusFilter, providerFilter]);

  const confirmEft = (paymentId: string) => {
    setError(null);
    startTransition(async () => {
      const result = await confirmEftPaymentAction({
        companyId: company.id,
        companySlug: slug,
        paymentId,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  const onExport = () => {
    downloadPaymentsCsv(filteredRows, `${slug}-payments.csv`);
  };

  const statCards = [
    { label: "Collected", value: formatRevenue(summary.collectedCents) },
    { label: "Pending", value: formatRevenue(summary.pendingCents) },
    { label: "Awaiting confirmation", value: String(summary.pendingCount) },
    { label: "Failed", value: String(summary.failedCount) },
  ];

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
            Finance
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Payments</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Track customer payments, confirm EFT deposits, and reconcile invoices.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="rounded-xl"
          onClick={onExport}
          disabled={filteredRows.length === 0}
        >
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </header>

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              {card.label}
            </p>
            <p className="mt-2 text-2xl font-bold text-slate-900">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm sm:w-72"
            placeholder="Search payments..."
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="all">All statuses</option>
            {PAYMENT_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <select
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value as ProviderFilter)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="all">All providers</option>
            {PAYMENT_PROVIDERS.map((provider) => (
              <option key={provider} value={provider}>
                {provider}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            href={companyInvoicesPath(slug)}
            className="font-medium text-violet-700 hover:text-violet-900"
          >
            Invoices →
          </Link>
          <Link
            href={companyRevenuePath(slug)}
            className="font-medium text-violet-700 hover:text-violet-900"
          >
            Revenue →
          </Link>
        </div>
      </div>

      {error ? <p className="mb-3 text-sm font-medium text-red-600">{error}</p> : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Customer</th>
              <th className="hidden px-4 py-3 md:table-cell">Invoice</th>
              <th className="px-4 py-3">Amount</th>
              <th className="hidden px-4 py-3 sm:table-cell">Provider</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                  {rows.length === 0
                    ? "No payments recorded yet. Payments appear when customers pay invoices."
                    : "No payments match your filters."}
                </td>
              </tr>
            ) : (
              filteredRows.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-4 py-3 text-slate-600">
                    {formatDateTime(payment.paid_at ?? payment.created_at)}
                    <p className="text-xs capitalize text-slate-400">{payment.payment_type}</p>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={companyCustomerPath(slug, payment.customer_id)}
                      className="font-medium text-slate-900 hover:text-violet-800"
                    >
                      {payment.customers?.name ?? "—"}
                    </Link>
                    {payment.customers?.email ? (
                      <p className="text-xs text-slate-400">{payment.customers.email}</p>
                    ) : null}
                  </td>
                  <td className="hidden px-4 py-3 md:table-cell">
                    <Link
                      href={companyInvoicePath(slug, payment.invoice_id)}
                      className="text-violet-700 hover:text-violet-900"
                    >
                      {payment.invoices?.invoice_number ?? "—"}
                    </Link>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {formatRevenue(payment.amount_cents)}
                  </td>
                  <td className="hidden px-4 py-3 capitalize text-slate-600 sm:table-cell">
                    {payment.provider}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
                        paymentStatusBadgeClass(payment.status)
                      )}
                    >
                      {payment.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end">
                      {payment.provider === "eft" && payment.status === "pending" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-lg"
                          disabled={pending}
                          onClick={() => confirmEft(payment.id)}
                        >
                          Confirm EFT
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
