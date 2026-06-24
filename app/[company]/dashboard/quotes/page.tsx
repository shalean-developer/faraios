import { notFound } from "next/navigation";

import { listCustomersForCompany } from "@/lib/services/customers";
import { getCompanyBySlug } from "@/lib/services/companies";
import { listQuotesForCompany } from "@/lib/services/quotes";

import { CompanyQuotesClient } from "./company-quotes-client";

type Props = { params: Promise<{ company: string }> };

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Quotes — FaraiOS",
  robots: { index: false, follow: false },
};

export default async function CompanyQuotesPage({ params }: Props) {
  const { company } = await params;
  const slug = decodeURIComponent(company);
  const row = await getCompanyBySlug(slug);
  if (!row) notFound();

  const [quotes, customers] = await Promise.all([
    listQuotesForCompany(row.id),
    listCustomersForCompany(row.id),
  ]);

  return (
    <CompanyQuotesClient
      slug={slug}
      company={row}
      quotes={quotes}
      customers={customers}
    />
  );
}
