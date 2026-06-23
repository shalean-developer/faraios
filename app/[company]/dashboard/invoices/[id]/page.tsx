import Link from "next/link";
import { notFound } from "next/navigation";

import { getCompanyBySlug } from "@/lib/services/companies";
import { getInvoiceById } from "@/lib/services/invoices";
import { companyInvoicesPath } from "@/lib/paths/company";
import { formatRevenue } from "@/lib/operations/metrics";
import { invoiceStatusBadgeClass } from "@/lib/financial/status";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ company: string; id: string }> };

export const dynamic = "force-dynamic";

export default async function CompanyInvoiceDetailPage({ params }: Props) {
  const { company, id } = await params;
  const slug = decodeURIComponent(company);
  const row = await getCompanyBySlug(slug);
  if (!row) notFound();

  const detail = await getInvoiceById(row.id, decodeURIComponent(id));
  if (!detail) notFound();

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href={companyInvoicesPath(slug)}
        className="text-sm font-medium text-violet-700 hover:text-violet-900"
      >
        ← Back to invoices
      </Link>
      <header className="mt-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{detail.invoice.invoice_number}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {detail.invoice.customers?.name} · Total {formatRevenue(detail.invoice.total_cents)}
        </p>
        <p className="mt-1 text-sm text-slate-600">
          Paid {formatRevenue(detail.invoice.amount_paid_cents)} · Balance{" "}
          {formatRevenue(detail.invoice.balance_due_cents)}
        </p>
        <span
          className={cn(
            "mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
            invoiceStatusBadgeClass(detail.invoice.status)
          )}
        >
          {detail.invoice.status.replace(/_/g, " ")}
        </span>
      </header>

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
        </table>
      </div>
    </div>
  );
}
