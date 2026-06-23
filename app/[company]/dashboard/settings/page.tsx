import { notFound } from "next/navigation";

import { getConnectedWebsiteForCompany } from "@/lib/services/connected-websites";
import { getCompanyBySlug } from "@/lib/services/companies";

import { CompanySettingsClient } from "./company-settings-client";

type Props = { params: Promise<{ company: string }> };

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Settings — FaraiOS",
  robots: { index: false, follow: false },
};

export default async function CompanySettingsPage({ params }: Props) {
  const { company } = await params;
  const slug = decodeURIComponent(company);
  const row = await getCompanyBySlug(slug);

  if (!row) {
    notFound();
  }

  const connectedWebsite = await getConnectedWebsiteForCompany(row.id);

  return (
    <CompanySettingsClient
      slug={slug}
      company={row}
      connectedWebsite={connectedWebsite}
    />
  );
}
