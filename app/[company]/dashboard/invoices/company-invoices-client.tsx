"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { Download } from "lucide-react";

import {
  cancelDraftInvoiceAction,
  issueInvoiceAction,
} from "@/app/actions/invoices";
import { InvoiceFormPopover } from "@/components/company/invoice-form-popover";
import { Button } from "@/components/ui/button";
import { downloadInvoicesCsv } from "@/lib/financial/invoices-csv";
import { INVOICE_STATUSES, invoiceStatusBadgeClass } from "@/lib/financial/status";
import type { InvoiceStatus } from "@/lib/financial/status";
import { formatRevenue } from "@/lib/operations/metrics";
import {
  companyCustomerPath,
  companyInvoicePath,
  companyPaymentsPath,
  companyRevenuePath,
} from "@/lib/paths/company";
import type { InvoiceListSummary } from "@/lib/services/invoices";
import { cn } from "@/lib/utils";
import type { CompanyService, CompanyWithIndustry, Customer } from "@/types/database";
import type { InvoiceWithCustomer } from "@/types/financial";

type StatusFilter = "all" | InvoiceStatus;

function formatShortDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-ZA");
}

export function CompanyInvoicesClient({
  slug,
  company,
  invoices: initialInvoices,
  summary,
  customers,
  services,
}: {
  slug: string;
  company: CompanyWithIndustry;
  invoices: InvoiceWithCustomer[];
  summary: InvoiceListSummary;
  customers: Customer[];
  services: CompanyService[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialInvoices);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setRows(initialInvoices);
  }, [initialInvoices]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((invoice) => {
      if (statusFilter !== "all" && invoice.status !== statusFilter) return false;
      if (!query) return true;

      return (
        invoice.invoice_number.toLowerCase().includes(query) ||
        (invoice.customers?.name ?? "").toLowerCase().includes(query) ||
        (invoice.customers?.email ?? "").toLowerCase().includes(query) ||
        invoice.status.replace(/_/g, " ").toLowerCase().includes(query)
      );
    });
  }, [rows, search, statusFilter]);

  const onIssue = (invoiceId: string) => {
    setError(null);
    startTransition(async () => {
      const result = await issueInvoiceAction({
        companyId: company.id,
        companySlug: slug,
        invoiceId,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  const onCancelDraft = (invoiceId: string) => {
    if (!window.confirm("Cancel this draft invoice?")) return;
    setError(null);
    startTransition(async () => {
      const result = await cancelDraftInvoiceAction({
        companyId: company.id,
        companySlug: slug,
        invoiceId,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  const onExport = () => {
    downloadInvoicesCsv(filteredRows, `${slug}-invoices.csv`);
  };

  const statCards = [
    { label: "Total invoices", value: String(summary.total) },
    { label: "Outstanding", value: formatRevenue(summary.outstandingCents) },
    { label: "Overdue", value: formatRevenue(summary.overdueCents) },
    { label: "Collected", value: formatRevenue(summary.paidCents) },
  ];

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
            Finance
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Invoices</h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500">
            Create invoices, track balances, and follow up on overdue payments.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
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
          <Button
            type="button"
            className="rounded-xl"
            variant={showInvoiceForm ? "outline" : "default"}
            aria-expanded={showInvoiceForm}
            aria-haspopup="dialog"
            onClick={() => setShowInvoiceForm((open) => !open)}
          >
            New invoice
          </Button>
        </div>
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

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm sm:w-72"
            placeholder="Search invoices..."
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="all">All statuses</option>
            {INVOICE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {status.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-wrap gap-3 text-sm">
          <Link
            href={companyPaymentsPath(slug)}
            className="font-medium text-violet-700 hover:text-violet-900"
          >
            Payments →
          </Link>
          <Link
            href={companyRevenuePath(slug)}
            className="font-medium text-violet-700 hover:text-violet-900"
          >
            Revenue →
          </Link>
        </div>
      </div>

      <InvoiceFormPopover
        open={showInvoiceForm}
        onClose={() => setShowInvoiceForm(false)}
        slug={slug}
        companyId={company.id}
        customers={customers}
        services={services}
      />

      {error ? <p className="mb-3 text-sm font-medium text-red-600">{error}</p> : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3">Customer</th>
              <th className="hidden px-4 py-3 md:table-cell">Due</th>
              <th className="px-4 py-3">Total</th>
              <th className="hidden px-4 py-3 sm:table-cell">Balance</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                  {rows.length === 0
                    ? "No invoices yet. Create your first invoice to start tracking payments."
                    : "No invoices match your filters."}
                </td>
              </tr>
            ) : (
              filteredRows.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="px-4 py-3">
                    <Link
                      href={companyInvoicePath(slug, invoice.id)}
                      className="font-medium text-violet-700 hover:text-violet-900"
                    >
                      {invoice.invoice_number}
                    </Link>
                    <p className="text-xs text-slate-400">
                      {formatShortDate(invoice.issued_at ?? invoice.created_at)}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={companyCustomerPath(slug, invoice.customer_id)}
                      className="text-slate-900 hover:text-violet-800"
                    >
                      {invoice.customers?.name ?? "—"}
                    </Link>
                    {invoice.customers?.email ? (
                      <p className="text-xs text-slate-400">{invoice.customers.email}</p>
                    ) : null}
                  </td>
                  <td className="hidden px-4 py-3 text-slate-600 md:table-cell">
                    {formatShortDate(invoice.due_date)}
                  </td>
                  <td className="px-4 py-3 text-slate-900">
                    {formatRevenue(invoice.total_cents)}
                  </td>
                  <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">
                    {formatRevenue(invoice.balance_due_cents)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
                        invoiceStatusBadgeClass(invoice.status)
                      )}
                    >
                      {invoice.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      {invoice.status === "draft" ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="rounded-lg"
                            disabled={pending}
                            onClick={() => onIssue(invoice.id)}
                          >
                            Issue
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="rounded-lg text-red-600 hover:text-red-700"
                            disabled={pending}
                            onClick={() => onCancelDraft(invoice.id)}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <Link
                          href={companyInvoicePath(slug, invoice.id)}
                          className="inline-flex h-8 items-center rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          View
                        </Link>
                      )}
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
