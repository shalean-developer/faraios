import { notFound } from "next/navigation";

import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { resolvePortalToken } from "@/lib/services/portal-access";
import { formatRevenue } from "@/lib/operations/metrics";
import { quoteStatusBadgeClass, invoiceStatusBadgeClass } from "@/lib/financial/status";
import { cn } from "@/lib/utils";
import Link from "next/link";

import { PortalQuoteActions } from "./portal-quote-actions";
import { PortalPayButton } from "./portal-pay-button";

type Props = { params: Promise<{ token: string }> };

export const dynamic = "force-dynamic";

export default async function CustomerPortalPage({ params }: Props) {
  const { token } = await params;
  const ctx = await resolvePortalToken(decodeURIComponent(token));
  if (!ctx) notFound();

  const admin = tryCreateAdminClient();
  if (!admin.ok) notFound();

  const [quotes, invoices, payments] = await Promise.all([
    admin.client
      .from("quotes")
      .select("*")
      .eq("company_id", ctx.companyId)
      .eq("customer_id", ctx.customerId)
      .neq("status", "draft")
      .order("created_at", { ascending: false }),
    admin.client
      .from("invoices")
      .select("*")
      .eq("company_id", ctx.companyId)
      .eq("customer_id", ctx.customerId)
      .neq("status", "draft")
      .order("created_at", { ascending: false }),
    admin.client
      .from("customer_payments")
      .select("*")
      .eq("company_id", ctx.companyId)
      .eq("customer_id", ctx.customerId)
      .order("created_at", { ascending: false }),
  ]);

  const quoteRows = quotes.data ?? [];
  const invoiceRows = invoices.data ?? [];
  const paymentRows = payments.data ?? [];

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
            Customer portal
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{ctx.companyName}</h1>
          <p className="mt-2 text-sm text-slate-600">Welcome, {ctx.customerName}</p>
        </header>

        <section className="mb-8">
          <h2 className="text-lg font-bold text-slate-900">Quotes</h2>
          <ul className="mt-4 space-y-3">
            {quoteRows.length === 0 ? (
              <li className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                No quotes to show.
              </li>
            ) : (
              quoteRows.map((quote) => (
                <li
                  key={quote.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">{quote.quote_number}</p>
                      <p className="text-sm text-slate-500">{formatRevenue(quote.total_cents)}</p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
                        quoteStatusBadgeClass(quote.status)
                      )}
                    >
                      {quote.status}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={`/portal/${token}/document/quote/${quote.id}`}
                      className="text-sm font-medium text-violet-700 hover:text-violet-900"
                      target="_blank"
                    >
                      Download PDF
                    </Link>
                    {["sent", "viewed"].includes(quote.status) ? (
                      <PortalQuoteActions token={token} quoteId={quote.id} />
                    ) : null}
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-lg font-bold text-slate-900">Invoices</h2>
          <ul className="mt-4 space-y-3">
            {invoiceRows.length === 0 ? (
              <li className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                No invoices to show.
              </li>
            ) : (
              invoiceRows.map((invoice) => (
                <li
                  key={invoice.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold text-slate-900">{invoice.invoice_number}</p>
                      <p className="text-sm text-slate-500">
                        Balance: {formatRevenue(invoice.balance_due_cents)}
                      </p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
                        invoiceStatusBadgeClass(invoice.status)
                      )}
                    >
                      {invoice.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      href={`/portal/${token}/document/invoice/${invoice.id}`}
                      className="text-sm font-medium text-violet-700 hover:text-violet-900"
                      target="_blank"
                    >
                      Download PDF
                    </Link>
                    {invoice.balance_due_cents > 0 &&
                    !["cancelled", "paid"].includes(invoice.status) ? (
                      <PortalPayButton
                        token={token}
                        invoiceId={invoice.id}
                        customerEmail={ctx.customerEmail ?? ""}
                      />
                    ) : null}
                  </div>
                </li>
              ))
            )}
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-bold text-slate-900">Payment history</h2>
          <ul className="mt-4 space-y-2">
            {paymentRows.length === 0 ? (
              <li className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
                No payments yet.
              </li>
            ) : (
              paymentRows.map((payment) => (
                <li
                  key={payment.id}
                  className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm"
                >
                  <span>{new Date(payment.created_at).toLocaleDateString("en-ZA")}</span>
                  <span className="font-medium">{formatRevenue(payment.amount_cents)}</span>
                  <span className="capitalize text-slate-500">{payment.status}</span>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
