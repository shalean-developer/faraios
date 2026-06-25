import { notFound } from "next/navigation";

import {
  getCustomerStatsForCompany,
  listCustomersForCompany,
  syncCustomersFromBookings,
} from "@/lib/services/customers";
import { getCompanyBySlug } from "@/lib/services/companies";

import { CompanyCustomersClient } from "./company-customers-client";

type Props = { params: Promise<{ company: string }> };

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Customers — Shalean",
  robots: { index: false, follow: false },
};

export default async function CompanyCustomersPage({ params }: Props) {
  const { company } = await params;
  const slug = decodeURIComponent(company);
  const row = await getCompanyBySlug(slug);

  if (!row) {
    notFound();
  }

  await syncCustomersFromBookings(row.id);
  const [customers, stats] = await Promise.all([
    listCustomersForCompany(row.id),
    getCustomerStatsForCompany(row.id),
  ]);

  return (
    <CompanyCustomersClient
      slug={slug}
      company={row}
      customers={customers}
      stats={stats}
    />
  );
}
