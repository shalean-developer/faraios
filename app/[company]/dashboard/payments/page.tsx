import { notFound } from "next/navigation";

import { getCompanyBySlug } from "@/lib/services/companies";
import {
  listPaymentsForCompany,
  summarizePayments,
} from "@/lib/services/payments";

import { CompanyPaymentsClient } from "./company-payments-client";

type Props = { params: Promise<{ company: string }> };

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Payments — Shalean",
  robots: { index: false, follow: false },
};

export default async function CompanyPaymentsPage({ params }: Props) {
  const { company } = await params;
  const slug = decodeURIComponent(company);
  const row = await getCompanyBySlug(slug);
  if (!row) notFound();

  const payments = await listPaymentsForCompany(row.id);

  return (
    <CompanyPaymentsClient
      slug={slug}
      company={row}
      payments={payments}
      summary={summarizePayments(payments)}
    />
  );
}
