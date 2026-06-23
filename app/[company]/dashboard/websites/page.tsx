import Link from "next/link";
import { Globe, Hammer, Link2, Plus, Server, Wrench } from "lucide-react";

import { ConnectedWebsitePanel } from "@/components/company/connected-website-panel";
import { PreviewWebsiteButton } from "@/components/websites/preview-website-button";
import { WebsiteHubNav } from "@/components/websites/website-hub-nav";
import { WebsiteSetupChecklistPanel } from "@/components/websites/website-setup-checklist";
import {
  companyDashboardPath,
  companyHostingPath,
  companyProjectPath,
  companyWebsiteCreatePath,
  companyWebsiteEditPath,
} from "@/lib/paths/company";
import { listBusinessWebProperties } from "@/lib/services/business-websites";
import { getConnectedWebsiteForCompany } from "@/lib/services/connected-websites";
import { getHostingSubscriptionForCompany } from "@/lib/services/hosting";
import { userHasCompanySlugAccess } from "@/lib/services/memberships";
import { companyHasWebsiteProject } from "@/lib/services/projects";
import { getCompanyBySlug } from "@/lib/services/companies";
import { getWebsiteSetupChecklistForCompany } from "@/lib/services/website-checklist";
import { getWebsiteDomainsForCompany } from "@/lib/services/website-domains";
import { getRecentTrackingEvents } from "@/lib/services/website-tracking";
import {
  connectionStatusColor,
  connectionStatusLabel,
} from "@/lib/websites/status";
import { createClient } from "@/lib/supabase/server";
import type { Website } from "@/types/database";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Websites — FaraiOS",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ company: string }> };

function AccessDenied({ slug }: { slug: string }) {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Access denied</h1>
      <p className="mt-2 text-sm text-slate-500">
        Please sign in to view your websites.
      </p>
      <Link
        href="/auth/sign-in"
        className="mt-6 inline-block text-sm font-medium text-violet-700 hover:text-violet-900"
      >
        Go to sign in
      </Link>
      <Link
        href={companyDashboardPath(slug)}
        className="mt-3 block text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        ← Back to dashboard
      </Link>
    </main>
  );
}

export default async function CompanyWebsitesPage({ params }: Props) {
  const { company } = await params;
  const slug = decodeURIComponent(company);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return <AccessDenied slug={slug} />;

  const row = await getCompanyBySlug(slug);
  if (!row) {
    return <AccessDenied slug={slug} />;
  }

  const hasAccess = await userHasCompanySlugAccess(user.id, slug);
  if (!hasAccess) {
    return <AccessDenied slug={slug} />;
  }

  const companyId = row.id;

  const [{ data: websites }, hasWebsiteProject, connectedWebsite, hosting, domains, properties, recentEvents] =
    await Promise.all([
      supabase
        .from("websites")
        .select("*")
        .eq("client_id", companyId)
        .order("created_at", { ascending: false }),
      companyHasWebsiteProject(companyId),
      getConnectedWebsiteForCompany(companyId),
      getHostingSubscriptionForCompany(companyId),
      getWebsiteDomainsForCompany(companyId),
      listBusinessWebProperties(companyId),
      getRecentTrackingEvents(companyId, 5),
    ]);

  const checklist = await getWebsiteSetupChecklistForCompany(
    companyId,
    slug,
    connectedWebsite,
    (websites as Website[] | null) ?? [],
    domains
  );

  const hostingActive = hosting?.status === "active";

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <div className="mb-4">
        <Link
          href={companyDashboardPath(slug)}
          className="text-sm font-medium text-violet-700 hover:text-violet-900"
        >
          ← Back to dashboard
        </Link>
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Websites
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Connect external sites, host on FaraiOS, manage domains, API keys, and tracking — all
          powered by your business workspace.
        </p>
      </div>

      <div className="mt-6">
        <WebsiteHubNav slug={slug} />
      </div>

      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <WebsiteSetupChecklistPanel checklist={checklist} />

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="font-semibold text-slate-900">Connection status</h3>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Website</dt>
              <dd>
                {properties[0] ? (
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-semibold",
                      connectionStatusColor(properties[0].status)
                    )}
                  >
                    {connectionStatusLabel(properties[0].status)}
                  </span>
                ) : (
                  "Not connected"
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Domain</dt>
              <dd className="text-slate-900">
                {domains[0]?.verification_status ?? hosting?.domain_status ?? "none"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">SSL</dt>
              <dd className="text-slate-900">
                {domains[0]?.ssl_status ?? hosting?.ssl_status ?? "not_started"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Booking</dt>
              <dd className="text-slate-900">
                {connectedWebsite?.booking_enabled !== false ? "Connected" : "Disabled"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-slate-500">Tracking</dt>
              <dd className="text-slate-900">
                {connectedWebsite?.tracking_enabled !== false ? "Enabled" : "Disabled"}
              </dd>
            </div>
          </dl>

          {recentEvents.length > 0 ? (
            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="text-xs font-semibold uppercase text-slate-500">Recent activity</p>
              <ul className="mt-2 space-y-1 text-xs text-slate-600">
                {recentEvents.map((e) => (
                  <li key={e.id}>
                    {e.event_type.replace(/_/g, " ")} ·{" "}
                    {new Date(e.created_at).toLocaleDateString()}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Website options
        </h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50/60 to-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
              <Link2 className="h-5 w-5" />
            </div>
            <p className="mt-3 font-semibold text-slate-900">A — Custom site</p>
            <p className="mt-1 text-sm text-slate-500">
              Connect an existing website and sync bookings via API.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <Globe className="h-5 w-5" />
            </div>
            <p className="mt-3 font-semibold text-slate-900">B — Hosted on FaraiOS</p>
            <p className="mt-1 text-sm text-slate-500">
              Create and manage a FaraiOS-hosted website from templates.
            </p>
            <Link
              href={companyWebsiteCreatePath(slug)}
              className="mt-4 inline-block text-sm font-semibold text-violet-700 hover:text-violet-900"
            >
              + Create website →
            </Link>
          </div>

          <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-5 opacity-80">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-200 text-slate-500">
              <Hammer className="h-5 w-5" />
            </div>
            <p className="mt-3 font-semibold text-slate-700">C — Website builder</p>
            <p className="mt-1 text-sm text-slate-500">
              Self-serve drag-and-drop builder — coming in a future release.
            </p>
            <span className="mt-4 inline-block rounded-full bg-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
              Coming soon
            </span>
          </div>
        </div>
      </section>

      <section className="mt-10">
        <ConnectedWebsitePanel
          companyId={companyId}
          slug={slug}
          connectedWebsite={connectedWebsite}
        />
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2">
        {hasWebsiteProject ? (
          <Link
            href={companyProjectPath(slug)}
            className="group rounded-2xl border border-violet-100 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
          >
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                <Wrench className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-slate-900 group-hover:text-violet-800">
                  Done-for-you build
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Track your FaraiOS website build progress.
                </p>
              </div>
            </div>
          </Link>
        ) : null}

        <Link
          href={companyHostingPath(slug)}
          className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-slate-900 group-hover:text-violet-800">
                Hosting add-on
              </p>
              <p className="mt-1 text-sm text-slate-500">
                {hostingActive
                  ? "Your hosting plan is active."
                  : "Optional managed hosting for your FaraiOS site."}
              </p>
            </div>
          </div>
        </Link>
      </section>

      <section className="mt-10">
        <div className="mb-4 flex items-center gap-2">
          <Globe className="h-4 w-4 text-slate-500" />
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">
            Hosted websites
          </h2>
        </div>
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="grid grid-cols-[1.2fr_0.8fr_1fr_auto_auto] gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            <span>Business</span>
            <span>Industry</span>
            <span>Status</span>
            <span className="text-right">Action</span>
            <span className="text-right">Preview</span>
          </div>
          {(websites as Website[] | null)?.length ? (
            (websites as Website[]).map((website) => (
              <div
                key={website.id}
                className="grid grid-cols-[1.2fr_0.8fr_1fr_auto_auto] gap-3 border-b border-slate-100 px-4 py-3 text-sm last:border-b-0"
              >
                <span className="font-medium text-slate-900">{website.name}</span>
                <span className="text-slate-600">{website.industry}</span>
                <span className="text-slate-600">{website.status}</span>
                <span className="text-right">
                  <Link
                    href={companyWebsiteEditPath(slug, website.id)}
                    className="font-medium text-violet-700 hover:text-violet-900"
                  >
                    Edit
                  </Link>
                </span>
                <span className="flex justify-end">
                  <PreviewWebsiteButton websiteId={website.id} domain={website.domain} />
                </span>
              </div>
            ))
          ) : (
            <div className="px-4 py-8 text-center text-sm text-slate-500">
              No hosted websites yet. Use option B above or request a done-for-you build
              during onboarding.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
