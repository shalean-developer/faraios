import { notFound } from "next/navigation";

import { listCustomersForCompany } from "@/lib/services/customers";
import { getCompanyBySlug } from "@/lib/services/companies";
import { listInvoicesForCompany } from "@/lib/services/invoices";

import { CompanyInvoicesClient } from "./company-invoices-client";

type Props = { params: Promise<{ company: string }> };

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Invoices — FaraiOS",
  robots: { index: false, follow: false },
};

export default async function CompanyInvoicesPage({ params }: Props) {
  const { company } = await params;
  const slug = decodeURIComponent(company);
  const row = await getCompanyBySlug(slug);
  if (!row) notFound();

  const [invoices, customers] = await Promise.all([
    listInvoicesForCompany(row.id),
    listCustomersForCompany(row.id),
  ]);

  return (
    <CompanyInvoicesClient
      slug={slug}
      companyId={row.id}
      invoices={invoices}
      customers={customers}
    />
  );
}
