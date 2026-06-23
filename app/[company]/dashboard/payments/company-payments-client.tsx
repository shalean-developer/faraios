"use client";

import { useState, useTransition } from "react";

import { confirmEftPaymentAction } from "@/app/actions/payments";
import { Button } from "@/components/ui/button";
import { paymentStatusBadgeClass } from "@/lib/financial/status";
import { formatRevenue } from "@/lib/operations/metrics";
import { cn } from "@/lib/utils";
import type { CustomerPayment } from "@/types/financial";

export function CompanyPaymentsClient({
  slug,
  companyId,
  payments: initialPayments,
}: {
  slug: string;
  companyId: string;
  payments: CustomerPayment[];
}) {
  const [payments, setPayments] = useState(initialPayments);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const confirmEft = (paymentId: string) => {
    startTransition(async () => {
      const result = await confirmEftPaymentAction({
        companyId,
        companySlug: slug,
        paymentId,
      });
      if (!result.ok) setError(result.error);
      else {
        setPayments((rows) =>
          rows.map((p) => (p.id === paymentId ? { ...p, status: "paid" as const } : p))
        );
      }
    });
  };

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">Payments</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Payment tracking</h1>
      </header>
      {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Amount</th>
              <th className="px-4 py-3">Provider</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payments.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                  No payments recorded yet.
                </td>
              </tr>
            ) : (
              payments.map((payment) => (
                <tr key={payment.id}>
                  <td className="px-4 py-3">
                    {new Date(payment.created_at).toLocaleString("en-ZA")}
                  </td>
                  <td className="px-4 py-3">{formatRevenue(payment.amount_cents)}</td>
                  <td className="px-4 py-3 capitalize">{payment.provider}</td>
                  <td className="px-4 py-3 capitalize">{payment.payment_type}</td>
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
