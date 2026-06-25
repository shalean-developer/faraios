import Link from "next/link";
import { notFound } from "next/navigation";

import { companyCampaignsPath, companyDashboardPath } from "@/lib/paths/company";
import { getCompanyBySlug } from "@/lib/services/companies";
import { listCustomerSegments } from "@/lib/services/customer-segments";
import { userHasCompanySlugAccess } from "@/lib/services/memberships";
import { listRetentionCampaignsWithSegments } from "@/lib/services/retention-campaigns";
import { createClient } from "@/lib/supabase/server";

import { RetentionCampaignsClient } from "./retention-campaigns-client";

export const metadata = {
  title: "Retention campaigns — Shalean",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ company: string }> };

export default async function RetentionCampaignsPage({ params }: Props) {
  const { company } = await params;
  const slug = decodeURIComponent(company);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const row = await getCompanyBySlug(slug);
  if (!row || !(await userHasCompanySlugAccess(user.id, slug))) notFound();

  const [campaigns, segments] = await Promise.all([
    listRetentionCampaignsWithSegments(row.id),
    listCustomerSegments(row.id),
  ]);

  const emailConfigured = Boolean(
    process.env.RESEND_API_KEY?.trim() && process.env.BOOKING_FROM_EMAIL?.trim()
  );

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">Growth</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">Retention campaigns</h1>
        <p className="mt-2 text-sm text-slate-500">
          Win back inactive customers and send targeted reactivation emails by segment.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 text-sm">
          <Link href={companyCampaignsPath(slug)} className="font-medium text-violet-700">
            Email campaigns
          </Link>
          <Link href={companyDashboardPath(slug)} className="text-slate-600">
            Dashboard
          </Link>
        </div>
      </header>

      <RetentionCampaignsClient
        slug={slug}
        companyId={row.id}
        campaigns={campaigns}
        segments={segments}
        emailConfigured={emailConfigured}
      />
    </div>
  );
}
