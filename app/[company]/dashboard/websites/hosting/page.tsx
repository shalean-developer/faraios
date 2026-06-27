import Link from "next/link";
import { Server } from "lucide-react";

import { PreviewWebsiteButton } from "@/components/websites/preview-website-button";
import {
  companyHostingPath,
  companyWebsiteEditPath,
  companyWebsitesPath,
} from "@/lib/paths/company";
import { getCompanyBySlug } from "@/lib/services/companies";
import { listBusinessWebProperties, getWebsiteDeployments } from "@/lib/services/business-websites";
import { getHostingSubscriptionForCompany } from "@/lib/services/hosting";
import { userHasCompanySlugAccess } from "@/lib/services/memberships";
import { connectionStatusColor, connectionStatusLabel } from "@/lib/websites/status";
import { createClient } from "@/lib/supabase/server";
import {
  riseCardClassName,
  riseOutlineButtonClassName,
  risePageClassName,
} from "@/lib/ui/rise-dashboard-styles";
import type { WebsiteDeployment } from "@/types/website-engine";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Deployments — FaraiOS",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ company: string }> };

export default async function CompanyWebsiteHostingPage({ params }: Props) {
  const { company } = await params;
  const slug = decodeURIComponent(company);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return (
      <div className={risePageClassName}>
        <p className="text-sm text-slate-500">Sign in to view hosting.</p>
      </div>
    );
  }

  const row = await getCompanyBySlug(slug);
  if (!row || !(await userHasCompanySlugAccess(user.id, slug))) {
    return (
      <div className={risePageClassName}>
        <p className="text-sm text-slate-500">Access denied.</p>
      </div>
    );
  }

  const [properties, hosting] = await Promise.all([
    listBusinessWebProperties(row.id),
    getHostingSubscriptionForCompany(row.id),
  ]);

  const hostedProperties = properties.filter((p) => p.mode === "hosted" && p.websiteId);
  const deploymentsByWebsite: Record<string, WebsiteDeployment[]> = {};

  await Promise.all(
    hostedProperties.map(async (p) => {
      if (p.websiteId) {
        deploymentsByWebsite[p.websiteId] = await getWebsiteDeployments(p.websiteId);
      }
    })
  );

  return (
    <div className={risePageClassName}>
      <Link
        href={companyWebsitesPath(slug)}
        className="text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        ← Website overview
      </Link>

      <div className={cn(riseCardClassName, "mt-4")}>
        <div className="px-4 py-4 sm:px-5">
          <h1 className="text-lg font-medium text-slate-800">Deployments</h1>
          <p className="mt-1 text-sm text-slate-500">
            Deployment status, hosting provider, and environment settings for FaraiOS-hosted
            websites.
          </p>
        </div>
      </div>

      <div className={cn(riseCardClassName, "mt-4 p-5")}>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100">
            <Server className="h-5 w-5 text-slate-700" />
          </div>
          <div>
            <p className="font-medium text-slate-800">Hosting subscription</p>
            <p className="mt-1 text-sm text-slate-500">
              {hosting?.status === "active"
                ? `Active plan: ${hosting.plan_slug} · ${hosting.sites_limit} site(s) · SSL: ${hosting.ssl_status}`
                : "No active hosting subscription."}
            </p>
            <Link
              href={companyHostingPath(slug)}
              className={cn(riseOutlineButtonClassName, "mt-3")}
            >
              Manage hosting billing
            </Link>
          </div>
        </div>
      </div>

      {hostedProperties.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No FaraiOS-hosted websites yet.</p>
      ) : (
        <div className="mt-4 space-y-4">
          {hostedProperties.map((property) => {
            const deployments = property.websiteId
              ? deploymentsByWebsite[property.websiteId] ?? []
              : [];
            const latest = deployments[0];

            return (
              <div key={property.id} className={cn(riseCardClassName, "p-5")}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-800">{property.name}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Provider: {property.hostingProvider ?? "vercel (default)"}
                    </p>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                      connectionStatusColor(property.status)
                    )}
                  >
                    {connectionStatusLabel(property.status)}
                  </span>
                </div>

                {latest ? (
                  <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
                    <p>
                      Latest deployment:{" "}
                      <span className="font-medium capitalize">{latest.status}</span>
                      {latest.url ? (
                        <>
                          {" "}
                          ·{" "}
                          <a
                            href={latest.url}
                            className="text-[#5a8dee] hover:underline"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            {latest.url}
                          </a>
                        </>
                      ) : null}
                    </p>
                    {latest.build_error ? (
                      <p className="mt-1 text-red-600">{latest.build_error}</p>
                    ) : null}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-slate-500">
                    No deployments recorded. Publishing your site creates a deployment record.
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-3">
                  {property.websiteId ? (
                    <>
                      <Link
                        href={companyWebsiteEditPath(slug, property.websiteId)}
                        className="text-sm font-medium text-[#5a8dee] hover:text-[#4a6fd8]"
                      >
                        Edit website
                      </Link>
                      <PreviewWebsiteButton
                        websiteId={property.websiteId}
                        domain={property.primaryDomain}
                      />
                    </>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
