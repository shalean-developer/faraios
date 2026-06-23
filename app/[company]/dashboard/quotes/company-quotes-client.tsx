"use client";

import Link from "next/link";
import { type FormEvent, useState, useTransition } from "react";

import { createQuoteAction, sendQuoteAction } from "@/app/actions/quotes";
import { Button } from "@/components/ui/button";
import { quoteStatusBadgeClass } from "@/lib/financial/status";
import { formatRevenue } from "@/lib/operations/metrics";
import { companyQuotePath } from "@/lib/paths/company";
import { cn } from "@/lib/utils";
import type { Customer } from "@/types/database";
import type { QuoteWithCustomer } from "@/types/financial";

export function CompanyQuotesClient({
  slug,
  companyId,
  quotes: initialQuotes,
  customers,
}: {
  slug: string;
  companyId: string;
  quotes: QuoteWithCustomer[];
  customers: Customer[];
}) {
  const [quotes, setQuotes] = useState(initialQuotes);
  const [customerId, setCustomerId] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [validUntil, setValidUntil] = useState("");
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
      const result = await createQuoteAction({
        companyId,
        companySlug: slug,
        customerId,
        lineItems: [{ description: description.trim(), quantity: 1, unitPriceCents: cents }],
        notes,
        validUntil: validUntil || undefined,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      window.location.reload();
    });
  };

  const onSend = (quoteId: string) => {
    startTransition(async () => {
      const result = await sendQuoteAction({ companyId, companySlug: slug, quoteId });
      if (!result.ok) setError(result.error);
      else {
        setQuotes((rows) =>
          rows.map((q) => (q.id === quoteId ? { ...q, status: "sent" as const } : q))
        );
      }
    });
  };

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">Quotes</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Quotes & estimates</h1>
        <p className="mt-2 text-sm text-slate-500">
          Create quotes, send to customers, and convert to bookings or invoices.
        </p>
      </header>

      <form
        onSubmit={onCreate}
        className="mb-10 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <h2 className="text-lg font-bold text-slate-900">New quote</h2>
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
            <span className="font-medium text-slate-700">Valid until</span>
            <input
              type="date"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
            />
          </label>
          <label className="block text-sm sm:col-span-2">
            <span className="font-medium text-slate-700">Notes</span>
            <textarea
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </label>
        </div>
        {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
        <Button type="submit" className="mt-4 rounded-xl" disabled={pending}>
          Create quote
        </Button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Quote</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {quotes.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                  No quotes yet.
                </td>
              </tr>
            ) : (
              quotes.map((quote) => (
                <tr key={quote.id}>
                  <td className="px-4 py-3 font-medium">
                    <Link
                      href={companyQuotePath(slug, quote.id)}
                      className="text-violet-700 hover:text-violet-900"
                    >
                      {quote.quote_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3">{quote.customers?.name ?? "—"}</td>
                  <td className="px-4 py-3">{formatRevenue(quote.total_cents)}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
                        quoteStatusBadgeClass(quote.status)
                      )}
                    >
                      {quote.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {quote.status === "draft" ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="rounded-lg"
                        disabled={pending}
                        onClick={() => onSend(quote.id)}
                      >
                        Send
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
