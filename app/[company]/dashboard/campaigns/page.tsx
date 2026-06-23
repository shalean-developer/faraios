import { notFound } from "next/navigation";

import { GrowthHubNav } from "@/components/growth/growth-hub-nav";
import { CampaignsClient } from "@/components/growth/growth-dashboard-clients";
import { getCompanyBySlug } from "@/lib/services/companies";
import { listEmailCampaigns } from "@/lib/services/email-campaigns";

export const metadata = {
  title: "Campaigns — FaraiOS",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ company: string }> };

export default async function CompanyCampaignsPage({ params }: Props) {
  const { company } = await params;
  const slug = decodeURIComponent(company);
  const row = await getCompanyBySlug(slug);
  if (!row) notFound();

  const campaigns = await listEmailCampaigns(row.id);

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">Growth</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Email campaigns</h1>
        <p className="mt-2 text-sm text-slate-500">
          Send promotions, follow-ups, and reactivation emails to your customers.
        </p>
      </header>

      <GrowthHubNav slug={slug} active="campaigns" />
      <CampaignsClient slug={slug} companyId={row.id} campaigns={campaigns} />
    </div>
  );
}
