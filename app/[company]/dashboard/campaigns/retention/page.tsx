import { notFound } from "next/navigation";

import { getCompanyBySlug } from "@/lib/services/companies";
import { listCustomerSegments } from "@/lib/services/customer-segments";
import { userHasCompanySlugAccess } from "@/lib/services/memberships";
import { listRetentionCampaignsWithSegments } from "@/lib/services/retention-campaigns";
import { createClient } from "@/lib/supabase/server";

import { RetentionCampaignsClient } from "./retention-campaigns-client";

export const metadata = {
  title: "Retention campaigns — FaraiOS",
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
    <RetentionCampaignsClient
      slug={slug}
      companyId={row.id}
      campaigns={campaigns}
      segments={segments}
      emailConfigured={emailConfigured}
    />
  );
}
