"use client";

import { CompanyQuotesSection } from "@/app/[company]/dashboard/bookings/company-quotes-section";
import {
  companyBookingsPath,
  companyInvoicesPath,
  companyPaymentsPath,
  companyRevenuePath,
} from "@/lib/paths/company";
import type { CompanyWithIndustry, Customer } from "@/types/database";
import type { QuoteWithCustomer } from "@/types/financial";
import Link from "next/link";

export function CompanyQuotesClient({
  slug,
  company,
  quotes,
  customers,
}: {
  slug: string;
  company: CompanyWithIndustry;
  quotes: QuoteWithCustomer[];
  customers: Customer[];
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
          Revenue
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Quotes
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Create quotes, send to customers, and convert to invoices or bookings.
        </p>
      </header>

      <CompanyQuotesSection
        slug={slug}
        companyId={company.id}
        quotes={quotes}
        customers={customers}
        title="All quotes"
        sectionDescription="Draft, send, and track quote status across your pipeline."
      />

      <section className="mt-10 rounded-2xl border border-slate-200 bg-slate-50/80 p-5">
        <h2 className="text-sm font-semibold text-slate-900">Related</h2>
        <p className="mt-1 text-sm text-slate-500">
          Incoming quote requests from your website appear under{" "}
          <Link
            href={`${companyBookingsPath(slug)}/quote-requests`}
            className="font-medium text-violet-700 hover:text-violet-900"
          >
            Bookings → Quote requests
          </Link>
          .
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link
            href={companyInvoicesPath(slug)}
            className="font-medium text-violet-700 hover:text-violet-900"
          >
            Invoices
          </Link>
          <Link
            href={companyPaymentsPath(slug)}
            className="font-medium text-violet-700 hover:text-violet-900"
          >
            Payments
          </Link>
          <Link
            href={companyRevenuePath(slug)}
            className="font-medium text-violet-700 hover:text-violet-900"
          >
            Revenue dashboard
          </Link>
        </div>
      </section>
    </div>
  );
}
