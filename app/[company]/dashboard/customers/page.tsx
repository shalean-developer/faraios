import { notFound } from "next/navigation";

import { listCustomersForCompany } from "@/lib/services/customers";
import { getCompanyBySlug } from "@/lib/services/companies";

import { CompanyCustomersClient } from "./company-customers-client";

type Props = { params: Promise<{ company: string }> };

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Customers — FaraiOS",
  robots: { index: false, follow: false },
};

export default async function CompanyCustomersPage({ params }: Props) {
  const { company } = await params;
  const slug = decodeURIComponent(company);
  const row = await getCompanyBySlug(slug);

  if (!row) {
    notFound();
  }

  const customers = await listCustomersForCompany(row.id);

  return (
    <CompanyCustomersClient slug={slug} company={row} customers={customers} />
  );
}
