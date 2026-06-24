import Link from "next/link";
import { notFound } from "next/navigation";

import { ConnectedWebsitePanel } from "@/components/company/connected-website-panel";
import { companyWebsitesPath } from "@/lib/paths/company";
import { getConnectedWebsiteForCompany } from "@/lib/services/connected-websites";
import { getCompanyBySlug } from "@/lib/services/companies";
import { userHasCompanySlugAccess } from "@/lib/services/memberships";
import { createClient } from "@/lib/supabase/server";

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
    <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header className="mb-8">
        <Link
          href={companyWebsitesPath(slug)}
          className="text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          ← Website overview
        </Link>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-violet-600">
          Website
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Connection
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Connect an external website, embed booking and tracking scripts, and follow setup guides
          for WordPress, Wix, Squarespace, Shopify, and other builders. For FaraiOS-hosted sites,
          manage domains and deployments from the website hub.
        </p>
      </header>

      <ConnectedWebsitePanel
        companyId={row.id}
        slug={slug}
        connectedWebsite={connectedWebsite}
      />
    </div>
  );
}
