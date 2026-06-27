import { notFound } from "next/navigation";

import { getCompanyBySlug } from "@/lib/services/companies";
import { listPaymentsForCompany } from "@/lib/services/payments";
import { listProjectsForCompany } from "@/lib/services/projects";

import { CompanyPaymentsClient } from "./company-payments-client";

type Props = { params: Promise<{ company: string }> };

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Payment Received — FaraiOS",
  robots: { index: false, follow: false },
};

export default async function CompanyPaymentsPage({ params }: Props) {
  const { company } = await params;
  const slug = decodeURIComponent(company);
  const row = await getCompanyBySlug(slug);
  if (!row) notFound();

  const [payments, projects] = await Promise.all([
    listPaymentsForCompany(row.id),
    listProjectsForCompany(row.id),
  ]);

  return (
    <CompanyPaymentsClient
      slug={slug}
      company={row}
      payments={payments}
      projects={projects}
    />
  );
}
