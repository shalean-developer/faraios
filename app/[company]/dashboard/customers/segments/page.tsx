import { notFound } from "next/navigation";

import { getCompanyBySlug } from "@/lib/services/companies";
import {
  listCustomerSegments,
  seedDefaultSegments,
} from "@/lib/services/customer-segments";

import { CompanyCustomerSegmentsClient } from "./company-customer-segments-client";

type Props = { params: Promise<{ company: string }> };

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Customer segments — Shalean",
  robots: { index: false, follow: false },
};

export default async function CustomerSegmentsPage({ params }: Props) {
  const { company } = await params;
  const slug = decodeURIComponent(company);
  const row = await getCompanyBySlug(slug);
  if (!row) notFound();

  await seedDefaultSegments(row.id);
  const segments = await listCustomerSegments(row.id);

  return (
    <CompanyCustomerSegmentsClient
      slug={slug}
      companyId={row.id}
      segments={segments}
    />
  );
}
