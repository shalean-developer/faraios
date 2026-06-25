import { notFound } from "next/navigation";

import {
  companyServicesSupportSortOrder,
  getServiceStatsForCompany,
  listServicesForCompany,
} from "@/lib/services/company-services";
import { getCompanyBySlug } from "@/lib/services/companies";

import { CompanyServicesClient } from "./company-services-client";

type Props = { params: Promise<{ company: string }> };

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Services — Shalean",
  robots: { index: false, follow: false },
};

export default async function CompanyServicesPage({ params }: Props) {
  const { company } = await params;
  const slug = decodeURIComponent(company);
  const row = await getCompanyBySlug(slug);

  if (!row) {
    notFound();
  }

  const [services, stats, canReorder] = await Promise.all([
    listServicesForCompany(row.id),
    getServiceStatsForCompany(row.id),
    companyServicesSupportSortOrder(row.id),
  ]);

  return (
    <CompanyServicesClient
      slug={slug}
      company={row}
      services={services}
      stats={stats}
      canReorder={canReorder}
    />
  );
}
