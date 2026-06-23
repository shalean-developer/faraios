"use client";

import Link from "next/link";
import { type FormEvent, useState, useTransition } from "react";

import { createInvoiceAction, issueInvoiceAction } from "@/app/actions/invoices";
import { Button } from "@/components/ui/button";
import { invoiceStatusBadgeClass } from "@/lib/financial/status";
import { formatRevenue } from "@/lib/operations/metrics";
import { companyInvoicePath } from "@/lib/paths/company";
import { cn } from "@/lib/utils";
import type { Customer } from "@/types/database";
import type { InvoiceWithCustomer } from "@/types/financial";

export function CompanyInvoicesClient({
  slug,
  companyId,
  invoices: initialInvoices,
  customers,
}: {
  slug: string;
  companyId: string;
  invoices: InvoiceWithCustomer[];
  customers: Customer[];
}) {
  const [invoices, setInvoices] = useState(initialInvoices);
  const [customerId, setCustomerId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const onCreate = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    const cents = Math.round(Number.parseFloat(amount || "0") * 100);
    if (!customerId || !description.trim() || cents <= 0) {
      setError("Customer, description, and amount are required.");
      return;
    }
    startTransition(async () => {
      const result = await createInvoiceAction({
        companyId,
        companySlug: slug,
        customerId,
        lineItems: [{ description: description.trim(), quantity: 1, unitPriceCents: cents }],
        dueDate: dueDate || undefined,
        issue: true,
      });
      if (!result.ok) setError(result.error);
      else window.location.reload();
    });
  };

  const onIssue = (invoiceId: string) => {
    startTransition(async () => {
      const result = await issueInvoiceAction({ companyId, companySlug: slug, invoiceId });
      if (!result.ok) setError(result.error);
      else {
        setInvoices((rows) =>
          rows.map((i) => (i.id === invoiceId ? { ...i, status: "issued" as const } : i))
        );
      }
    });
  };

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">Invoices</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Invoices</h1>
      </header>

      <form
        onSubmit={onCreate}
        className="mb-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h2 className="text-lg font-bold text-slate-900">New invoice</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Customer</span>
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              required
            >
              <option value="">Select customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Amount (ZAR)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="font-medium text-slate-700">Description</span>
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Due date</span>
            <input
              type="date"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </label>
        </div>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <Button type="submit" className="mt-4 rounded-xl" disabled={pending}>
          Create & issue invoice
        </Button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <th className="px-4 py-3">Invoice</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Balance</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                  No invoices yet.
                </td>
              </tr>
            ) : (
              invoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={companyInvoicePath(slug, invoice.id)}
                      className="text-violet-700 hover:text-violet-900"
                    >
                      {invoice.invoice_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{invoice.customers?.name ?? "—"}</td>
                  <td className="px-4 py-3">{formatRevenue(invoice.total_cents)}</td>
                  <td className="px-4 py-3">{formatRevenue(invoice.balance_due_cents)}</td>
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
                    {invoice.status === "draft" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-lg"
                        disabled={pending}
                        onClick={() => onIssue(invoice.id)}
                      >
                        Issue
                      </Button>
                    ) : null}
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
