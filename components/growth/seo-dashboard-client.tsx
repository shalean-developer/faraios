"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  bulkGenerateServiceAreasAction,
  createServiceAreaPageAction,
  saveLocalSeoSettingsAction,
  saveWebsiteSeoAction,
  updateServiceAreaPageAction,
} from "@/app/actions/growth-engine";
import type { LocalSeoSettings } from "@/types/growth-engine";
import type { ServiceAreaPage } from "@/types/growth-engine";
import type { SeoV10DashboardData } from "@/types/seo-v10";
import { SeoV10Overview } from "@/components/seo/v10/seo-v10-overview";
import { SeoV10Tools } from "@/components/seo/v10/seo-v10-tools";
import type {
  SearchConsoleConnection,
  SearchConsoleMetricsSummary,
} from "@/lib/services/search-console";

type WebsiteSeo = {
  id: string;
  name: string;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
};

export function SeoDashboardClient({
  slug,
  companyId,
  companyName,
  audit,
  localSeo,
  websites,
  serviceAreaPages,
  searchConsoleConnection,
  searchConsoleMetrics,
  searchConsoleConfigured,
  v10,
}: {
  slug: string;
  companyId: string;
  companyName: string;
  audit: {
    score: number;
    missingMetaTitles: number;
    missingMetaDescriptions: number;
    missingH1: number;
    missingServiceAreaPages: number;
    sitemapStatus: string;
    schemaStatus: string;
    indexedPagesPlaceholder: number;
    topKeywords: string[];
    recommendedActions: string[];
  };
  localSeo: LocalSeoSettings | null;
  websites: WebsiteSeo[];
  serviceAreaPages: ServiceAreaPage[];
  searchConsoleConnection: SearchConsoleConnection | null;
  searchConsoleMetrics: SearchConsoleMetricsSummary | null;
  searchConsoleConfigured: boolean;
  v10: SeoV10DashboardData;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [settings, setSettings] = useState({
    businessName: localSeo?.business_name ?? companyName,
    industry: localSeo?.industry ?? "",
    mainService: localSeo?.main_service ?? "",
    primaryLocation: localSeo?.primary_location ?? "",
    serviceAreas: (localSeo?.service_areas ?? []).join(", "),
    phone: localSeo?.phone ?? "",
    email: localSeo?.email ?? "",
    address: localSeo?.address ?? "",
    googleBusinessProfileUrl: localSeo?.google_business_profile_url ?? "",
    googleReviewLink: localSeo?.google_review_link ?? "",
    autoReviewRequest: localSeo?.auto_review_request_enabled ?? false,
    whatsapp: (localSeo as { whatsapp?: string | null })?.whatsapp ?? "",
    googleMapsUrl: localSeo?.google_maps_url ?? "",
    logoUrl: localSeo?.logo_url ?? "",
  });

  const [newPage, setNewPage] = useState({
    serviceName: "",
    areaName: "",
  });

  function saveSettings() {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await saveLocalSeoSettingsAction({
        companyId,
        companySlug: slug,
        settings: {
          business_name: settings.businessName,
          industry: settings.industry || null,
          main_service: settings.mainService || null,
          primary_location: settings.primaryLocation || null,
          service_areas: settings.serviceAreas
            .split(/[,;]/)
            .map((a) => a.trim())
            .filter(Boolean),
          phone: settings.phone || null,
          email: settings.email || null,
          address: settings.address || null,
          google_business_profile_url: settings.googleBusinessProfileUrl || null,
          google_review_link: settings.googleReviewLink || null,
          auto_review_request_enabled: settings.autoReviewRequest,
          whatsapp: settings.whatsapp || null,
          google_maps_url: settings.googleMapsUrl || null,
          logo_url: settings.logoUrl || null,
        },
      });
      if (!result.ok) setError(result.error);
      else {
        setMessage("Local SEO settings saved.");
        router.refresh();
      }
    });
  }

  function generatePages() {
    const areas = settings.serviceAreas
      .split(/[,;]/)
      .map((a) => a.trim())
      .filter(Boolean);
    const services = settings.mainService
      ? [settings.mainService]
      : ["Services"];
    startTransition(async () => {
      const result = await bulkGenerateServiceAreasAction({
        companyId,
        companySlug: slug,
        businessName: settings.businessName,
        serviceNames: services,
        areaNames: areas,
      });
      if (!result.ok) setError(result.error);
      else {
        setMessage(`Generated ${result.created ?? 0} draft service area page(s).`);
        router.refresh();
      }
    });
  }

  function createPage() {
    if (!newPage.serviceName || !newPage.areaName) return;
    startTransition(async () => {
      const result = await createServiceAreaPageAction({
        companyId,
        companySlug: slug,
        page: {
          serviceName: newPage.serviceName,
          areaName: newPage.areaName,
        },
      });
      if (!result.ok) setError(result.error);
      else {
        setMessage("Service area page created as draft.");
        setNewPage({ serviceName: "", areaName: "" });
        router.refresh();
      }
    });
  }

  function publishPage(pageId: string) {
    startTransition(async () => {
      const result = await updateServiceAreaPageAction({
        companyId,
        companySlug: slug,
        pageId,
        page: { status: "published" },
      });
      if (!result.ok) setError(result.error);
      else {
        setMessage("Page published.");
        router.refresh();
      }
    });
  }

  function saveWebsiteSeo(website: WebsiteSeo, seoTitle: string, seoDescription: string) {
    startTransition(async () => {
      const result = await saveWebsiteSeoAction({
        companyId,
        companySlug: slug,
        websiteId: website.id,
        seo: { seoTitle, seoDescription },
      });
      if (!result.ok) setError(result.error);
      else {
        setMessage(`SEO saved for ${website.name}.`);
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-8">
      {message ? (
        <p className="rounded-lg bg-emerald-50 px-4 py-2 text-sm text-emerald-800">{message}</p>
      ) : null}
      {error ? (
        <p className="rounded-lg bg-red-50 px-4 py-2 text-sm text-red-800">{error}</p>
      ) : null}

      <SeoV10Overview auditScore={audit.score} v10={v10} />
      <SeoV10Tools slug={slug} companyId={companyId} companyName={companyName} v10={v10} searchConsoleConfigured={searchConsoleConfigured} />

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-8">
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="SEO score" value={`${audit.score}/100`} highlight />
            <MetricCard label="Missing meta titles" value={String(audit.missingMetaTitles)} />
            <MetricCard label="Missing descriptions" value={String(audit.missingMetaDescriptions)} />
            <MetricCard label="Missing H1" value={String(audit.missingH1)} />
            <MetricCard label="Missing area pages" value={String(audit.missingServiceAreaPages)} />
            <MetricCard label="Sitemap" value={audit.sitemapStatus} capitalize />
            <MetricCard label="Schema" value={audit.schemaStatus} capitalize />
            <MetricCard
              label="Indexed pages (est.)"
              value={String(audit.indexedPagesPlaceholder)}
            />
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Google Search Console</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Connect your property to import clicks, impressions, and top queries.
                </p>
              </div>
              {searchConsoleConnection ? (
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                  Connected
                </span>
              ) : null}
            </div>

            {!searchConsoleConfigured ? (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p>
                  Google Search Console is not set up on this platform yet. A platform administrator
                  needs to add OAuth credentials before you can connect.
                </p>
                <p className="mt-2">
                  Admin: go to{" "}
                  <a href="/admin/settings?tab=integrations" className="font-semibold text-violet-700 hover:underline">
                    Settings → Integrations
                  </a>{" "}
                  and add your Google Cloud OAuth Client ID and Secret.
                </p>
              </div>
            ) : searchConsoleConnection ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                  label={`Clicks (${searchConsoleMetrics?.periodDays ?? 28}d)`}
                  value={String(searchConsoleMetrics?.clicks ?? 0)}
                />
                <MetricCard
                  label="Impressions"
                  value={String(searchConsoleMetrics?.impressions ?? 0)}
                />
                <MetricCard
                  label="Avg. CTR"
                  value={
                    searchConsoleMetrics
                      ? `${(searchConsoleMetrics.ctr * 100).toFixed(1)}%`
                      : "—"
                  }
                />
                <MetricCard
                  label="Avg. position"
                  value={
                    searchConsoleMetrics
                      ? searchConsoleMetrics.position.toFixed(1)
                      : "—"
                  }
                />
              </div>
            ) : (
              <a
                href={`/api/integrations/google-search-console/connect?companyId=${encodeURIComponent(companyId)}`}
                className="mt-4 inline-flex rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
              >
                Connect Google Search Console
              </a>
            )}

            {searchConsoleMetrics?.topQueries.length ? (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-slate-900">Top queries</h3>
                <ul className="mt-2 space-y-1 text-sm text-slate-600">
                  {searchConsoleMetrics.topQueries.map((item) => (
                    <li key={item.query}>
                      {item.query} — {item.clicks} clicks / {item.impressions} impressions
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Local SEO settings</h2>
            <p className="mt-1 text-sm text-slate-500">
              Business details used for schema markup, service area pages, and local search.
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Business name" value={settings.businessName} onChange={(v) => setSettings((s) => ({ ...s, businessName: v }))} />
              <Field label="Industry" value={settings.industry} onChange={(v) => setSettings((s) => ({ ...s, industry: v }))} />
              <Field label="Main service" value={settings.mainService} onChange={(v) => setSettings((s) => ({ ...s, mainService: v }))} />
              <Field label="Primary location" value={settings.primaryLocation} onChange={(v) => setSettings((s) => ({ ...s, primaryLocation: v }))} />
              <Field label="Service areas (comma-separated)" value={settings.serviceAreas} onChange={(v) => setSettings((s) => ({ ...s, serviceAreas: v }))} className="sm:col-span-2" />
              <Field label="Phone" value={settings.phone} onChange={(v) => setSettings((s) => ({ ...s, phone: v }))} />
              <Field label="Email" value={settings.email} onChange={(v) => setSettings((s) => ({ ...s, email: v }))} />
              <Field label="Address" value={settings.address} onChange={(v) => setSettings((s) => ({ ...s, address: v }))} className="sm:col-span-2" />
              <Field label="Google Business Profile URL" value={settings.googleBusinessProfileUrl} onChange={(v) => setSettings((s) => ({ ...s, googleBusinessProfileUrl: v }))} className="sm:col-span-2" />
              <Field label="Google review link" value={settings.googleReviewLink} onChange={(v) => setSettings((s) => ({ ...s, googleReviewLink: v }))} className="sm:col-span-2" />
              <Field label="WhatsApp" value={settings.whatsapp} onChange={(v) => setSettings((s) => ({ ...s, whatsapp: v }))} />
              <Field label="Google Maps URL" value={settings.googleMapsUrl} onChange={(v) => setSettings((s) => ({ ...s, googleMapsUrl: v }))} className="sm:col-span-2" />
              <Field label="Logo URL" value={settings.logoUrl} onChange={(v) => setSettings((s) => ({ ...s, logoUrl: v }))} className="sm:col-span-2" />
            </div>
            <label className="mt-4 flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={settings.autoReviewRequest}
                onChange={(e) => setSettings((s) => ({ ...s, autoReviewRequest: e.target.checked }))}
              />
              Auto-send review request after completed booking
            </label>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={saveSettings}
                className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
              >
                Save settings
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={generatePages}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                Generate area pages from settings
              </button>
            </div>
          </section>

          {websites.length > 0 ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-bold text-slate-900">Website SEO</h2>
              <p className="mt-1 text-sm text-slate-500">Meta tags for FaraiOS-hosted websites.</p>
              {websites.map((site) => (
                <WebsiteSeoForm
                  key={site.id}
                  site={site}
                  pending={pending}
                  onSave={saveWebsiteSeo}
                />
              ))}
            </section>
          ) : null}

          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900">Service area pages</h2>
            <p className="mt-1 text-sm text-slate-500">
              Local landing pages for each service and area you serve.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <input
                placeholder="Service name"
                value={newPage.serviceName}
                onChange={(e) => setNewPage((p) => ({ ...p, serviceName: e.target.value }))}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
              <input
                placeholder="Area name"
                value={newPage.areaName}
                onChange={(e) => setNewPage((p) => ({ ...p, areaName: e.target.value }))}
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                type="button"
                disabled={pending}
                onClick={createPage}
                className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
              >
                Add page
              </button>
            </div>
            <div className="mt-4 overflow-hidden rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                    <th className="px-4 py-3">Page</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {serviceAreaPages.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                        No service area pages yet. Add one above or generate from your service areas.
                      </td>
                    </tr>
                  ) : (
                    serviceAreaPages.map((page) => (
                      <tr key={page.id}>
                        <td className="px-4 py-3">
                          {page.h1 || `${page.service_name} in ${page.area_name}`}
                        </td>
                        <td className="px-4 py-3 capitalize">{page.status}</td>
                        <td className="px-4 py-3">
                          {page.status === "draft" ? (
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => publishPage(page.id)}
                              className="font-medium text-violet-700 hover:underline disabled:opacity-50"
                            >
                              Publish
                            </button>
                          ) : (
                            <span className="text-slate-400">Live</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="space-y-6 xl:sticky xl:top-6 xl:self-start">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Recommended actions</h2>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              {audit.recommendedActions.map((action) => (
                <li key={action} className="flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-violet-400" />
                  <span>{action}</span>
                </li>
              ))}
            </ul>
            {audit.topKeywords.length > 0 ? (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <p className="text-xs font-semibold uppercase text-slate-400">Top keywords</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {audit.topKeywords.map((kw) => (
                    <span
                      key={kw}
                      className="rounded-full bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700"
                    >
                      {kw}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        </aside>
      </div>
    </div>
  );
}

function MetricCard({
  label,
  value,
  highlight,
  capitalize,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  capitalize?: boolean;
}) {
  return (
    <div
      className={
        highlight
          ? "rounded-2xl border-2 border-violet-200 bg-gradient-to-br from-violet-50/70 to-white p-4 shadow-sm"
          : "rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
      }
    >
      <p className="text-xs font-semibold uppercase text-slate-400">{label}</p>
      <p className={`mt-1 text-xl font-bold text-slate-900 ${capitalize ? "capitalize" : ""}`}>
        {value}
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  className,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="text-xs font-semibold uppercase text-slate-400">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
      />
    </label>
  );
}

function WebsiteSeoForm({
  site,
  pending,
  onSave,
}: {
  site: WebsiteSeo;
  pending: boolean;
  onSave: (site: WebsiteSeo, title: string, desc: string) => void;
}) {
  const [title, setTitle] = useState(site.seo_title ?? "");
  const [desc, setDesc] = useState(site.seo_description ?? "");

  return (
    <div className="mt-4 rounded-xl border border-slate-100 p-4">
      <p className="font-medium text-slate-900">{site.name}</p>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <Field label="Meta title" value={title} onChange={setTitle} />
        <Field label="Meta description" value={desc} onChange={setDesc} />
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={() => onSave(site, title, desc)}
        className="mt-3 rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
      >
        Save website SEO
      </button>
    </div>
  );
}
