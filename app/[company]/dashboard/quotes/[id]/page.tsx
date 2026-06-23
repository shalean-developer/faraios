import Link from "next/link";
import { notFound } from "next/navigation";

import { getCompanyBySlug } from "@/lib/services/companies";
import { getQuoteById } from "@/lib/services/quotes";
import { companyQuotesPath } from "@/lib/paths/company";
import { formatRevenue } from "@/lib/operations/metrics";
import { quoteStatusBadgeClass } from "@/lib/financial/status";
import { cn } from "@/lib/utils";

import { CompanyQuoteDetailClient } from "./company-quote-detail-client";

type Props = { params: Promise<{ company: string; id: string }> };

export const dynamic = "force-dynamic";

export default async function CompanyQuoteDetailPage({ params }: Props) {
  const { company, id } = await params;
  const slug = decodeURIComponent(company);
  const row = await getCompanyBySlug(slug);
  if (!row) notFound();

  const detail = await getQuoteById(row.id, decodeURIComponent(id));
  if (!detail) notFound();

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <Link
        href={companyQuotesPath(slug)}
        className="text-sm font-medium text-violet-700 hover:text-violet-900"
      >
        ← Back to quote requests
      </Link>
      <header className="mt-4 mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{detail.quote.quote_number}</h1>
        <p className="mt-1 text-sm text-slate-500">
          {detail.quote.customers?.name} · {formatRevenue(detail.quote.total_cents)}
        </p>
        <span
          className={cn(
            "mt-2 inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
            quoteStatusBadgeClass(detail.quote.status)
          )}
        >
          {detail.quote.status}
        </span>
      </header>

      <div className="mb-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
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

      <CompanyQuoteDetailClient
        slug={slug}
        companyId={row.id}
        quote={detail.quote}
      />
    </div>
  );
}
