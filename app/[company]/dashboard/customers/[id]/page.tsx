import Link from "next/link";
import { notFound } from "next/navigation";

import { listBookingsForCustomer } from "@/lib/services/bookings";
import { getCompanyBySlug } from "@/lib/services/companies";
import { getCustomerById } from "@/lib/services/customers";
import { listInvoicesForCustomer } from "@/lib/services/invoices";
import { listPaymentsForCustomer, getCustomerPaymentSummary } from "@/lib/services/payments";
import { listQuotesForCustomer } from "@/lib/services/quotes";
import { CompanyCustomerDetailHeader } from "../company-customer-detail-header";
import { companyCustomersPath } from "@/lib/paths/company";
import { formatRevenue } from "@/lib/operations/metrics";
import { invoiceStatusBadgeClass, quoteStatusBadgeClass } from "@/lib/financial/status";
import { riseCardClassName, risePageClassName } from "@/lib/ui/rise-dashboard-styles";
import { cn } from "@/lib/utils";

type Props = {
  params: Promise<{ company: string; id: string }>;
};

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Customer — FaraiOS",
  robots: { index: false, follow: false },
};

function statusBadgeClass(status: string | null): string {
  switch (status) {
    case "completed":
      return "bg-emerald-50 text-emerald-700";
    case "confirmed":
      return "bg-blue-50 text-blue-700";
    case "cancelled":
      return "bg-red-50 text-red-700";
    default:
      return "bg-amber-50 text-amber-700";
  }
}

export default async function CompanyCustomerDetailPage({ params }: Props) {
  const { company, id } = await params;
  const slug = decodeURIComponent(company);
  const customerId = decodeURIComponent(id);

  const row = await getCompanyBySlug(slug);
  if (!row) notFound();

  const customer = await getCustomerById(row.id, customerId);
  if (!customer) notFound();

  const bookings = await listBookingsForCustomer(row.id, customerId);
  const [quotes, invoices, payments, paymentSummary] = await Promise.all([
    listQuotesForCustomer(row.id, customerId),
    listInvoicesForCustomer(row.id, customerId),
    listPaymentsForCustomer(row.id, customerId),
    getCustomerPaymentSummary(row.id, customerId),
  ]);

  return (
    <div className={risePageClassName}>
      <Link
        href={companyCustomersPath(slug)}
        className="text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        ← Back to customers
      </Link>

      <CompanyCustomerDetailHeader
        slug={slug}
        companyId={row.id}
        customer={customer}
      />

      <div className={cn(riseCardClassName, "mt-4 p-4")}>
        <div className="flex flex-wrap gap-4 text-sm text-slate-600">
          {customer.email ? <span>{customer.email}</span> : null}
          {customer.phone ? <span>{customer.phone}</span> : null}
        </div>
        {customer.notes ? (
          <p className="mt-4 max-w-2xl rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {customer.notes}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <span className="rounded-xl bg-emerald-50 px-3 py-1.5 font-medium text-emerald-800">
            Total spent: {formatRevenue(paymentSummary.totalSpentCents)}
          </span>
          {paymentSummary.lastPaymentDate ? (
            <span className="rounded-xl bg-slate-100 px-3 py-1.5 text-slate-700">
              Last payment:{" "}
              {new Date(paymentSummary.lastPaymentDate).toLocaleDateString("en-ZA")}
            </span>
          ) : null}
        </div>
      </div>

      <section className="mt-4">
        <h2 className="mb-3 text-sm font-medium text-slate-700">Quotes</h2>
        <div className={cn(riseCardClassName, "overflow-hidden")}>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                <th className="px-4 py-3">Quote</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {quotes.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                    No quotes for this customer.
                  </td>
                </tr>
              ) : (
                quotes.map((quote) => (
                  <tr key={quote.id}>
                    <td className="px-4 py-3 font-medium">{quote.quote_number}</td>
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-4">
        <h2 className="mb-3 text-sm font-medium text-slate-700">Invoices</h2>
        <div className={cn(riseCardClassName, "overflow-hidden")}>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Balance</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-4 py-8 text-center text-slate-500">
                    No invoices for this customer.
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td className="px-4 py-3 font-medium">{invoice.invoice_number}</td>
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
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-4">
        <h2 className="mb-3 text-sm font-medium text-slate-700">Payments</h2>
        <div className={cn(riseCardClassName, "overflow-hidden")}>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Provider</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                    No payments for this customer.
                  </td>
                </tr>
              ) : (
                payments.map((payment) => (
                  <tr key={payment.id}>
                    <td className="px-4 py-3">
                      {new Date(payment.created_at).toLocaleDateString("en-ZA")}
                    </td>
                    <td className="px-4 py-3">{formatRevenue(payment.amount_cents)}</td>
                    <td className="px-4 py-3 capitalize">{payment.provider}</td>
                    <td className="px-4 py-3 capitalize">{payment.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-4">
        <h2 className="mb-3 text-sm font-medium text-slate-700">Booking history</h2>
        <div className={cn(riseCardClassName, "overflow-hidden")}>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {bookings.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                    No bookings linked to this customer yet.
                  </td>
                </tr>
              ) : (
                bookings.map((booking) => (
                  <tr key={booking.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {booking.service ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {booking.booking_date
                        ? new Date(booking.booking_date).toLocaleString("en-ZA")
                        : "—"}
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-600">
                      {booking.source ?? "internal"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
                          statusBadgeClass(booking.status)
                        )}
                      >
                        {booking.status ?? "pending"}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
