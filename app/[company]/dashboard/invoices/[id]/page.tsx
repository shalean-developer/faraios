import Link from "next/link";
import { notFound } from "next/navigation";

import { InvoiceDetailActions, CompanyInvoiceDetailClient } from "@/app/[company]/dashboard/invoices/invoice-detail-actions";
import { getCompanyBySlug } from "@/lib/services/companies";
import { getInvoiceById } from "@/lib/services/invoices";
import {
  companyCustomerPath,
  companyInvoicesPath,
} from "@/lib/paths/company";
import { formatRevenue } from "@/lib/operations/metrics";
import { invoiceStatusBadgeClass } from "@/lib/financial/status";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ company: string; id: string }> };

export const dynamic = "force-dynamic";

function formatShortDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function CompanyInvoiceDetailPage({ params }: Props) {
  const { company, id } = await params;
  const slug = decodeURIComponent(company);
  const row = await getCompanyBySlug(slug);
  if (!row) notFound();

  const detail = await getInvoiceById(row.id, decodeURIComponent(id));
  if (!detail) notFound();

  const invoice = detail.invoice;

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href={companyInvoicesPath(slug)}
        className="text-sm font-medium text-violet-700 hover:text-violet-900"
      >
        ← Back to invoices
      </Link>

      <header className="mt-4 mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
            Invoice
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{invoice.invoice_number}</h1>
          <p className="mt-2 text-sm text-slate-600">
            <Link
              href={companyCustomerPath(slug, invoice.customer_id)}
              className="font-medium text-violet-700 hover:text-violet-900"
            >
              {invoice.customers?.name ?? "Customer"}
            </Link>
            {invoice.customers?.email ? ` · ${invoice.customers.email}` : null}
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-slate-600">
            <span>Total {formatRevenue(invoice.total_cents)}</span>
            <span>Paid {formatRevenue(invoice.amount_paid_cents)}</span>
            <span>Balance {formatRevenue(invoice.balance_due_cents)}</span>
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
            <span>Due {formatShortDate(invoice.due_date)}</span>
            <span>Issued {formatShortDate(invoice.issued_at)}</span>
            <span>Created {formatShortDate(invoice.created_at)}</span>
          </div>
          <span
            className={cn(
              "mt-3 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
              invoiceStatusBadgeClass(invoice.status)
            )}
          >
            {invoice.status.replace(/_/g, " ")}
          </span>
        </div>

        <InvoiceDetailActions
          slug={slug}
          companyId={row.id}
          invoiceId={invoice.id}
          status={invoice.status}
        />
      </header>

      <CompanyInvoiceDetailClient
        slug={slug}
        companyId={row.id}
        invoice={invoice}
        lineItems={detail.lineItems}
      />

      {invoice.notes ? (
        <div className="mb-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          {invoice.notes}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3 text-right">Qty</th>
              <th className="px-4 py-3 text-right">Unit</th>
              <th className="px-4 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {detail.lineItems.map((li) => (
              <tr key={li.id}>
                <td className="px-4 py-3">{li.description}</td>
                <td className="px-4 py-3 text-right">{li.quantity}</td>
                <td className="px-4 py-3 text-right">{formatRevenue(li.unit_price_cents)}</td>
                <td className="px-4 py-3 text-right">{formatRevenue(li.total_cents)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-slate-100 bg-slate-50/80 text-sm">
            <tr>
              <td colSpan={3} className="px-4 py-2 text-right text-slate-500">
                Subtotal
              </td>
              <td className="px-4 py-2 text-right font-medium text-slate-900">
                {formatRevenue(invoice.subtotal_cents)}
              </td>
            </tr>
            {invoice.discount_cents > 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-2 text-right text-slate-500">
                  Discount
                </td>
                <td className="px-4 py-2 text-right font-medium text-slate-900">
                  -{formatRevenue(invoice.discount_cents)}
                </td>
              </tr>
            ) : null}
            {invoice.tax_cents > 0 ? (
              <tr>
                <td colSpan={3} className="px-4 py-2 text-right text-slate-500">
                  Tax
                </td>
                <td className="px-4 py-2 text-right font-medium text-slate-900">
                  {formatRevenue(invoice.tax_cents)}
                </td>
              </tr>
            ) : null}
            <tr>
              <td colSpan={3} className="px-4 py-3 text-right font-semibold text-slate-900">
                Total
              </td>
              <td className="px-4 py-3 text-right font-bold text-slate-900">
                {formatRevenue(invoice.total_cents)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
