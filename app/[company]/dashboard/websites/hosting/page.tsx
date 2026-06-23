import Link from "next/link";
import { Server } from "lucide-react";

import { WebsiteHubNav } from "@/components/websites/website-hub-nav";
import { PreviewWebsiteButton } from "@/components/websites/preview-website-button";
import {
  companyDashboardPath,
  companyHostingPath,
  companyWebsiteEditPath,
} from "@/lib/paths/company";
import { getCompanyBySlug } from "@/lib/services/companies";
import { listBusinessWebProperties, getWebsiteDeployments } from "@/lib/services/business-websites";
import { getHostingSubscriptionForCompany } from "@/lib/services/hosting";
import { userHasCompanySlugAccess } from "@/lib/services/memberships";
import { connectionStatusColor, connectionStatusLabel } from "@/lib/websites/status";
import { createClient } from "@/lib/supabase/server";
import type { WebsiteDeployment } from "@/types/website-engine";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Hosting — FaraiOS",
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
      <main className="mx-auto max-w-5xl px-4 py-10">
        <p className="text-sm text-slate-500">Sign in to view hosting.</p>
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
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <Link
        href={companyDashboardPath(slug)}
        className="text-sm font-medium text-violet-700 hover:text-violet-900"
      >
        ← Back to dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">Hosting</h1>
      <p className="mt-2 text-sm text-slate-500">
        Deployment status, hosting provider, and environment settings for FaraiOS-hosted websites.
      </p>

      <div className="mt-6">
        <WebsiteHubNav slug={slug} />

        <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100">
              <Server className="h-5 w-5 text-slate-700" />
            </div>
            <div>
              <p className="font-semibold text-slate-900">Hosting subscription</p>
              <p className="mt-1 text-sm text-slate-500">
                {hosting?.status === "active"
                  ? `Active plan: ${hosting.plan_slug} · ${hosting.sites_limit} site(s) · SSL: ${hosting.ssl_status}`
                  : "No active hosting subscription."}
              </p>
              <Link
                href={companyHostingPath(slug)}
                className="mt-2 inline-block text-sm font-medium text-violet-700 hover:text-violet-900"
              >
                Manage hosting billing →
              </Link>
            </div>
          </div>
        </div>

        {hostedProperties.length === 0 ? (
          <p className="text-sm text-slate-500">No FaraiOS-hosted websites yet.</p>
        ) : (
          <div className="space-y-4">
            {hostedProperties.map((property) => {
              const deployments = property.websiteId
                ? deploymentsByWebsite[property.websiteId] ?? []
                : [];
              const latest = deployments[0];

              return (
                <div
                  key={property.id}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{property.name}</p>
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
                    <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm">
                      <p>
                        Latest deployment:{" "}
                        <span className="font-medium capitalize">{latest.status}</span>
                        {latest.url ? (
                          <>
                            {" "}
                            ·{" "}
                            <a
                              href={latest.url}
                              className="text-violet-700 hover:underline"
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
                          className="text-sm font-medium text-violet-700 hover:text-violet-900"
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
    </main>
  );
}
