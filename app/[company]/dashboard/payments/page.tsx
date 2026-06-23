import { notFound } from "next/navigation";

import { getCompanyBySlug } from "@/lib/services/companies";
import { listPaymentsForCompany } from "@/lib/services/payments";

import { CompanyPaymentsClient } from "./company-payments-client";

type Props = { params: Promise<{ company: string }> };

export const dynamic = "force-dynamic";

export default async function CompanyPaymentsPage({ params }: Props) {
  const { company } = await params;
  const slug = decodeURIComponent(company);
  const row = await getCompanyBySlug(slug);
  if (!row) notFound();

  const payments = await listPaymentsForCompany(row.id);

  return (
    <CompanyPaymentsClient slug={slug} companyId={row.id} payments={payments} />
  );
}
