import Link from "next/link";

import { WebsiteTrackingClient } from "./company-tracking-client";
import { WebsiteHubNav } from "@/components/websites/website-hub-nav";
import { companyDashboardPath } from "@/lib/paths/company";
import { getCompanyBySlug } from "@/lib/services/companies";
import { getConnectedWebsiteForCompany } from "@/lib/services/connected-websites";
import { userHasCompanySlugAccess } from "@/lib/services/memberships";
import { getRecentTrackingEvents } from "@/lib/services/website-tracking";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Tracking — FaraiOS",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ company: string }> };

export default async function CompanyWebsiteTrackingPage({ params }: Props) {
  const { company } = await params;
  const slug = decodeURIComponent(company);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
        <p className="text-sm text-slate-500">Sign in to manage tracking.</p>
      </main>
    );
  }

  const row = await getCompanyBySlug(slug);
  if (!row || !(await userHasCompanySlugAccess(user.id, slug))) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-10">
        <p className="text-sm text-slate-500">Access denied.</p>
      </main>
    );
  }

  const connected = await getConnectedWebsiteForCompany(row.id);
  const recentEvents = await getRecentTrackingEvents(row.id, 15);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link
        href={companyDashboardPath(slug)}
        className="text-sm font-medium text-violet-700 hover:text-violet-900"
      >
        ← Back to dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">Tracking</h1>
      <p className="mt-2 text-sm text-slate-500">
        Install the FaraiOS tracking script on your external website to capture leads and
        conversions.
      </p>

      <div className="mt-6">
        <WebsiteHubNav slug={slug} />
        <WebsiteTrackingClient
          companyId={row.id}
          trackingEnabled={connected?.tracking_enabled !== false}
          recentEvents={recentEvents}
        />
      </div>
    </main>
  );
}
