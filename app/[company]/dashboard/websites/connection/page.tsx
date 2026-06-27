import Link from "next/link";
import { notFound } from "next/navigation";

import { ConnectedWebsitePanel } from "@/components/company/connected-website-panel";
import { companyWebsitesPath } from "@/lib/paths/company";
import { getConnectedWebsiteForCompany } from "@/lib/services/connected-websites";
import { getCompanyBySlug } from "@/lib/services/companies";
import { userHasCompanySlugAccess } from "@/lib/services/memberships";
import { createClient } from "@/lib/supabase/server";
import { riseCardClassName, risePageClassName } from "@/lib/ui/rise-dashboard-styles";

type Props = { params: Promise<{ company: string }> };

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Website connection — FaraiOS",
  robots: { index: false, follow: false },
};

export default async function CompanyWebsiteConnectionPage({ params }: Props) {
  const { company } = await params;
  const slug = decodeURIComponent(company);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) notFound();

  const row = await getCompanyBySlug(slug);
  if (!row || !(await userHasCompanySlugAccess(user.id, slug))) notFound();

  const connectedWebsite = await getConnectedWebsiteForCompany(row.id);

  return (
    <div className={risePageClassName}>
      <div className={riseCardClassName}>
        <div className="px-4 py-4 sm:px-5">
          <Link
            href={companyWebsitesPath(slug)}
            className="text-sm font-medium text-[#5a8dee] hover:text-[#4a6fd8]"
          >
            ← Website overview
          </Link>
          <h1 className="mt-3 text-lg font-medium text-slate-800">Connection</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Connect an external website, embed booking and tracking scripts, and follow setup guides
            for WordPress, Wix, Squarespace, Shopify, and other builders. For FaraiOS-hosted sites,
            manage domains and deployments from the website hub.
          </p>
        </div>
      </div>

      <div className="mt-4">
        <ConnectedWebsitePanel
          companyId={row.id}
          slug={slug}
          connectedWebsite={connectedWebsite}
        />
      </div>
    </div>
  );
}
