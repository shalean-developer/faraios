"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  addKeywordAction,
  createRedirectAction,
  createRedirectFrom404Action,
  deleteRedirectAction,
  deleteSchemaAction,
  generateReportAction,
  regenerateSitemapAction,
  runSeoCrawlAction,
  savePageMetaAction,
  saveRobotsAction,
  saveSchemaAction,
  saveSeoProjectAction,
} from "@/app/actions/seo-v10";
import { buildRobotsTxt, validateRobotsTxt } from "@/lib/services/seo/sitemap-service";
import { buildSearchPreview, buildSocialPreview } from "@/lib/services/seo/meta-service";
import { SCHEMA_TYPES, validateJsonLd } from "@/lib/services/seo/schema-service";
import { exportRedirectsCsv } from "@/lib/services/seo/redirect-service";
import { exportReportJson } from "@/lib/services/seo/report-service";
import {
  INTEGRATION_PROVIDER_META,
  getIntegrationConnectUrl,
} from "@/lib/services/seo/integration-constants";
import type { SeoPage, SeoV10DashboardData } from "@/types/seo-v10";

type Tab = "overview" | "project" | "meta" | "keywords" | "schema" | "sitemap" | "redirects" | "404" | "reports";

const TABS: { key: Tab; label: string }[] = [
  { key: "project", label: "Project" },
  { key: "meta", label: "Meta manager" },
  { key: "keywords", label: "Keywords" },
  { key: "schema", label: "Schema" },
  { key: "sitemap", label: "Sitemap & Robots" },
  { key: "redirects", label: "Redirects" },
  { key: "404", label: "404 monitor" },
  { key: "reports", label: "Reports" },
];

export function SeoV10Tools({
  slug,
  companyId,
  companyName,
  v10,
  searchConsoleConfigured,
}: {
  slug: string;
  companyId: string;
  companyName: string;
  v10: SeoV10DashboardData;
  searchConsoleConfigured: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState<Tab>("project");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const project = v10.project;
  if (!project) return null;

  const projectId = project.id;

  function runCrawl(live = false) {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await runSeoCrawlAction({
        companyId,
        companySlug: slug,
        projectId,
        fetchLive: live,
      });
      if (!result.ok) setError(result.error);
      else {
        setMessage(live ? "Live crawl completed." : "Site audit completed.");
        router.refresh();
      }
    });
  }

  function runAction(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await fn();
      if (!result.ok) setError(result.error ?? "Action failed");
      else {
        setMessage("Saved successfully.");
        router.refresh();
      }
    });
  }

  return (
    <section className="rounded-2xl border border-violet-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className={
                tab === t.key
                  ? "rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white"
                  : "rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-200"
              }
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={pending}
            onClick={() => runCrawl(false)}
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
          >
            Run audit
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => runCrawl(true)}
            className="rounded-lg border border-violet-300 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-50"
          >
            Live crawl
          </button>
        </div>
      </div>

      {message ? <p className="mx-4 mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p> : null}
      {error ? <p className="mx-4 mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p> : null}

      <div className="p-4">
        {tab === "project" ? (
          <ProjectPanel
            slug={slug}
            companyId={companyId}
            project={project}
            integrations={v10.integrations}
            pending={pending}
            runAction={runAction}
            searchConsoleConfigured={searchConsoleConfigured}
          />
        ) : null}
        {tab === "meta" ? (
          <MetaPanel slug={slug} companyId={companyId} pages={v10.pages} pending={pending} runAction={runAction} />
        ) : null}
        {tab === "keywords" ? (
          <KeywordsPanel slug={slug} companyId={companyId} pages={v10.pages} pending={pending} runAction={runAction} />
        ) : null}
        {tab === "schema" ? (
          <SchemaPanel slug={slug} companyId={companyId} projectId={project.id} schemas={v10.schemas} pending={pending} runAction={runAction} />
        ) : null}
        {tab === "sitemap" ? (
          <SitemapRobotsPanel
            slug={slug}
            companyId={companyId}
            projectId={project.id}
            sitemap={v10.sitemap}
            settings={v10.settings}
            pending={pending}
            runAction={runAction}
          />
        ) : null}
        {tab === "redirects" ? (
          <RedirectsPanel slug={slug} companyId={companyId} projectId={project.id} redirects={v10.redirects} pending={pending} runAction={runAction} />
        ) : null}
        {tab === "404" ? (
          <NotFoundPanel slug={slug} companyId={companyId} projectId={project.id} logs={v10.notFoundLogs} pending={pending} runAction={runAction} />
        ) : null}
        {tab === "reports" ? (
          <ReportsPanel slug={slug} companyId={companyId} companyName={companyName} reports={v10.reports} pending={pending} runAction={runAction} />
        ) : null}
      </div>
    </section>
  );
}

type RunAction = (fn: () => Promise<{ ok: boolean; error?: string }>) => void;

function ProjectPanel({
  slug,
  companyId,
  project,
  integrations,
  pending,
  runAction,
  searchConsoleConfigured,
}: {
  slug: string;
  companyId: string;
  project: NonNullable<SeoV10DashboardData["project"]>;
  integrations: SeoV10DashboardData["integrations"];
  pending: boolean;
  runAction: RunAction;
  searchConsoleConfigured: boolean;
}) {
  const [form, setForm] = useState({
    name: project.name,
    websiteUrl: project.website_url ?? "",
    domain: project.domain ?? "",
    language: project.language,
    country: project.country,
    businessType: project.business_type ?? "",
    defaultSchemaType: project.default_schema_type,
  });

  function save() {
    runAction(() =>
      saveSeoProjectAction({
        companyId,
        companySlug: slug,
        projectId: project.id,
        updates: {
          name: form.name,
          website_url: form.websiteUrl || undefined,
          domain: form.domain || undefined,
          language: form.language,
          country: form.country,
          business_type: form.businessType || undefined,
          default_schema_type: form.defaultSchemaType,
        },
      })
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-slate-900">SEO project settings</h3>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Project name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
        <Field label="Website URL" value={form.websiteUrl} onChange={(v) => setForm((f) => ({ ...f, websiteUrl: v }))} />
        <Field label="Domain" value={form.domain} onChange={(v) => setForm((f) => ({ ...f, domain: v }))} />
        <Field label="Language" value={form.language} onChange={(v) => setForm((f) => ({ ...f, language: v }))} />
        <Field label="Country" value={form.country} onChange={(v) => setForm((f) => ({ ...f, country: v }))} />
        <Field label="Business type" value={form.businessType} onChange={(v) => setForm((f) => ({ ...f, businessType: v }))} />
        <Field label="Default schema type" value={form.defaultSchemaType} onChange={(v) => setForm((f) => ({ ...f, defaultSchemaType: v }))} />
      </div>
      <button type="button" disabled={pending} onClick={save} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
        Save project
      </button>

      <div className="mt-6 border-t border-slate-100 pt-4">
        <h4 className="text-sm font-semibold text-slate-900">Google integrations</h4>
        <ul className="mt-2 space-y-2">
          {INTEGRATION_PROVIDER_META.map((p) => {
            const connected = integrations.find((i) => i.provider === p.provider)?.status === "connected";
            const connectUrl = getIntegrationConnectUrl(p.provider, companyId, searchConsoleConfigured);
            return (
              <li key={p.provider} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2 text-sm">
                <div>
                  <p className="font-medium text-slate-900">{p.label}</p>
                  <p className="text-xs text-slate-500">{p.description}</p>
                </div>
                {connected ? (
                  <span className="text-xs font-semibold text-emerald-700">Connected</span>
                ) : connectUrl ? (
                  <a href={connectUrl} className="text-xs font-semibold text-violet-700 hover:underline">Connect</a>
                ) : (
                  <span className="text-xs text-slate-400">OAuth pending</span>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function MetaPanel({
  slug,
  companyId,
  pages,
  pending,
  runAction,
}: {
  slug: string;
  companyId: string;
  pages: SeoPage[];
  pending: boolean;
  runAction: RunAction;
}) {
  const [pageId, setPageId] = useState(pages[0]?.id ?? "");
  const page = pages.find((p) => p.id === pageId);
  const [meta, setMeta] = useState({
    seoTitle: page?.meta_title ?? "",
    metaDescription: page?.meta_description ?? "",
    canonicalUrl: page?.canonical_url ?? "",
    robotsMeta: page?.robots_meta ?? "",
    ogTitle: "",
    ogDescription: "",
    ogImage: "",
    twitterTitle: "",
    twitterDescription: "",
    twitterImage: "",
  });

  function save() {
    if (!pageId) return;
    runAction(() =>
      savePageMetaAction({
        companyId,
        companySlug: slug,
        pageId,
        meta: {
          seo_title: meta.seoTitle || null,
          meta_description: meta.metaDescription || null,
          canonical_url: meta.canonicalUrl || null,
          robots_meta: meta.robotsMeta || null,
          og_title: meta.ogTitle || null,
          og_description: meta.ogDescription || null,
          og_image: meta.ogImage || null,
          twitter_title: meta.twitterTitle || null,
          twitter_description: meta.twitterDescription || null,
          twitter_image: meta.twitterImage || null,
        },
      })
    );
  }

  const searchPreview = buildSearchPreview({
    seo_title: meta.seoTitle,
    meta_description: meta.metaDescription,
    url: page?.url ?? "",
  });
  const socialPreview = buildSocialPreview({
    og_title: meta.ogTitle || meta.seoTitle,
    og_description: meta.ogDescription || meta.metaDescription,
    og_image: meta.ogImage || null,
    url: page?.url ?? "",
  });

  if (pages.length === 0) {
    return <p className="text-sm text-slate-500">Run an audit first to inventory pages.</p>;
  }

  return (
    <div className="space-y-4">
      <select value={pageId} onChange={(e) => setPageId(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
        {pages.map((p) => (
          <option key={p.id} value={p.id}>{p.url}</option>
        ))}
      </select>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="SEO title" value={meta.seoTitle} onChange={(v) => setMeta((m) => ({ ...m, seoTitle: v }))} />
        <Field label="Meta description" value={meta.metaDescription} onChange={(v) => setMeta((m) => ({ ...m, metaDescription: v }))} />
        <Field label="Canonical URL" value={meta.canonicalUrl} onChange={(v) => setMeta((m) => ({ ...m, canonicalUrl: v }))} />
        <Field label="Robots meta" value={meta.robotsMeta} onChange={(v) => setMeta((m) => ({ ...m, robotsMeta: v }))} />
        <Field label="OG title" value={meta.ogTitle} onChange={(v) => setMeta((m) => ({ ...m, ogTitle: v }))} />
        <Field label="OG description" value={meta.ogDescription} onChange={(v) => setMeta((m) => ({ ...m, ogDescription: v }))} />
        <Field label="OG image URL" value={meta.ogImage} onChange={(v) => setMeta((m) => ({ ...m, ogImage: v }))} className="sm:col-span-2" />
        <Field label="Twitter title" value={meta.twitterTitle} onChange={(v) => setMeta((m) => ({ ...m, twitterTitle: v }))} />
        <Field label="Twitter description" value={meta.twitterDescription} onChange={(v) => setMeta((m) => ({ ...m, twitterDescription: v }))} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-semibold uppercase text-slate-400">Search preview</p>
          <p className="mt-2 text-lg text-blue-700">{searchPreview.title}</p>
          <p className="text-sm text-emerald-700">{searchPreview.url}</p>
          <p className="mt-1 text-sm text-slate-600">{searchPreview.description}</p>
        </div>
        <div className="rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-semibold uppercase text-slate-400">Social preview</p>
          <p className="mt-2 font-semibold text-slate-900">{socialPreview.title}</p>
          <p className="text-sm text-slate-600">{socialPreview.description}</p>
        </div>
      </div>
      <button type="button" disabled={pending} onClick={save} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Save meta</button>
    </div>
  );
}

function KeywordsPanel({ slug, companyId, pages, pending, runAction }: { slug: string; companyId: string; pages: SeoPage[]; pending: boolean; runAction: RunAction }) {
  const [pageId, setPageId] = useState(pages[0]?.id ?? "");
  const [keyword, setKeyword] = useState("");

  function add() {
    if (!pageId || !keyword.trim()) return;
    runAction(() => addKeywordAction({ companyId, companySlug: slug, pageId, keyword: keyword.trim() }));
    setKeyword("");
  }

  if (pages.length === 0) return <p className="text-sm text-slate-500">Run an audit to analyze keywords per page.</p>;

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">Add focus keywords per page. Re-run audit to refresh analysis.</p>
      <select value={pageId} onChange={(e) => setPageId(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
        {pages.map((p) => (
          <option key={p.id} value={p.id}>{p.url} (score: {p.seo_score ?? "—"})</option>
        ))}
      </select>
      <div className="flex gap-2">
        <input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="Focus keyword" className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <button type="button" disabled={pending} onClick={add} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Add</button>
      </div>
    </div>
  );
}

function SchemaPanel({ slug, companyId, projectId, schemas, pending, runAction }: { slug: string; companyId: string; projectId: string; schemas: SeoV10DashboardData["schemas"]; pending: boolean; runAction: RunAction }) {
  const [schemaType, setSchemaType] = useState("LocalBusiness");
  const [jsonText, setJsonText] = useState('{\n  "@context": "https://schema.org",\n  "@type": "LocalBusiness",\n  "name": "Your Business"\n}');

  function save() {
    try {
      const jsonLd = JSON.parse(jsonText) as Record<string, unknown>;
      const validation = validateJsonLd(jsonLd);
      if (!validation.isValid) {
        alert(validation.errors.join(", "));
        return;
      }
      runAction(() => saveSchemaAction({ companyId, companySlug: slug, projectId, schemaType, jsonLd }));
    } catch {
      alert("Invalid JSON");
    }
  }

  return (
    <div className="space-y-3">
      <select value={schemaType} onChange={(e) => setSchemaType(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
        {SCHEMA_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
      </select>
      <textarea value={jsonText} onChange={(e) => setJsonText(e.target.value)} rows={8} className="w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm" />
      <button type="button" disabled={pending} onClick={save} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Save schema</button>
      {schemas.length > 0 ? (
        <ul className="mt-4 space-y-2 text-sm">
          {schemas.map((s) => (
            <li key={s.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
              <span>{s.schema_type} — {s.is_valid ? "Valid" : "Invalid"}</span>
              <button type="button" disabled={pending} onClick={() => runAction(() => deleteSchemaAction({ companyId, companySlug: slug, schemaId: s.id }))} className="text-red-600 hover:underline">Delete</button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function SitemapRobotsPanel({ slug, companyId, projectId, sitemap, settings, pending, runAction }: { slug: string; companyId: string; projectId: string; sitemap: SeoV10DashboardData["sitemap"]; settings: SeoV10DashboardData["settings"]; pending: boolean; runAction: RunAction }) {
  const [robotsContent, setRobotsContent] = useState(
    settings?.robots_txt_content ?? buildRobotsTxt({
      allowRules: settings?.robots_allow_rules ?? [],
      disallowRules: settings?.robots_disallow_rules ?? [],
      crawlDelay: settings?.crawl_delay ?? null,
      sitemapReference: settings?.sitemap_reference ?? "/sitemap.xml",
      customContent: null,
    })
  );

  function saveRobots() {
    const validation = validateRobotsTxt(robotsContent);
    if (!validation.valid) {
      alert(validation.errors.join("\n"));
      return;
    }
    runAction(() => saveRobotsAction({ companyId, companySlug: slug, projectId, robotsTxtContent: robotsContent }));
  }

  function regen() {
    runAction(() => regenerateSitemapAction({ companyId, companySlug: slug, projectId }));
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-slate-100 p-3 text-sm">
        <p><strong>Sitemap status:</strong> {sitemap?.status ?? "pending"}</p>
        <p><strong>URLs:</strong> {sitemap?.url_count ?? 0}</p>
        <p><strong>Last generated:</strong> {sitemap?.last_generated_at ? new Date(sitemap.last_generated_at).toLocaleString() : "Never"}</p>
        <button type="button" disabled={pending} onClick={regen} className="mt-2 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50">Regenerate sitemap</button>
      </div>
      <div>
        <p className="text-sm font-semibold text-slate-900">Robots.txt editor</p>
        <textarea value={robotsContent} onChange={(e) => setRobotsContent(e.target.value)} rows={8} className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 font-mono text-sm" />
        <button type="button" disabled={pending} onClick={saveRobots} className="mt-2 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Save robots.txt</button>
      </div>
    </div>
  );
}

function RedirectsPanel({ slug, companyId, projectId, redirects, pending, runAction }: { slug: string; companyId: string; projectId: string; redirects: SeoV10DashboardData["redirects"]; pending: boolean; runAction: RunAction }) {
  const [source, setSource] = useState("");
  const [dest, setDest] = useState("");
  const [code, setCode] = useState("301");

  function add() {
    if (!source.trim()) return;
    runAction(() => createRedirectAction({ companyId, companySlug: slug, projectId, sourceUrl: source, destinationUrl: dest, statusCode: parseInt(code, 10) }));
    setSource("");
    setDest("");
  }

  function exportCsv() {
    const csv = exportRedirectsCsv(redirects);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "redirects.csv";
    a.click();
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="Source URL" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <input value={dest} onChange={(e) => setDest(e.target.value)} placeholder="Destination URL" className="rounded-lg border border-slate-300 px-3 py-2 text-sm" />
        <select value={code} onChange={(e) => setCode(e.target.value)} className="rounded-lg border border-slate-300 px-3 py-2 text-sm">
          {["301", "302", "307", "308", "410", "451"].map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <button type="button" disabled={pending} onClick={add} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Add</button>
        <button type="button" onClick={exportCsv} className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700">Export CSV</button>
      </div>
      <table className="w-full text-sm">
        <thead><tr className="text-left text-xs uppercase text-slate-400"><th className="py-2">Source</th><th>Dest</th><th>Code</th><th>Hits</th><th></th></tr></thead>
        <tbody>
          {redirects.map((r) => (
            <tr key={r.id} className="border-t border-slate-100">
              <td className="py-2 pr-2">{r.source_url}</td>
              <td>{r.destination_url ?? "—"}</td>
              <td>{r.status_code}</td>
              <td>{r.hits}</td>
              <td>
                <button type="button" disabled={pending} onClick={() => runAction(() => deleteRedirectAction({ companyId, companySlug: slug, redirectId: r.id }))} className="text-red-600 hover:underline">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function NotFoundPanel({ slug, companyId, projectId, logs, pending, runAction }: { slug: string; companyId: string; projectId: string; logs: SeoV10DashboardData["notFoundLogs"]; pending: boolean; runAction: RunAction }) {
  const [destinations, setDestinations] = useState<Record<string, string>>({});

  return (
    <div>
      <p className="mb-3 text-sm text-slate-500">Privacy-safe 404 tracking — referrer host and browser family only.</p>
      {logs.length === 0 ? (
        <p className="text-sm text-slate-500">No 404 errors recorded yet.</p>
      ) : (
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs uppercase text-slate-400"><th className="py-2">URL</th><th>Hits</th><th>Referrer</th><th>Redirect</th></tr></thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id} className="border-t border-slate-100">
                <td className="py-2 pr-2">{log.missing_url}</td>
                <td>{log.occurrences}</td>
                <td>{log.referrer_host ?? "—"}</td>
                <td>
                  <input
                    value={destinations[log.id] ?? ""}
                    onChange={(e) => setDestinations((d) => ({ ...d, [log.id]: e.target.value }))}
                    placeholder="Destination"
                    className="rounded border border-slate-300 px-2 py-1 text-xs"
                  />
                  <button
                    type="button"
                    disabled={pending || !destinations[log.id]}
                    onClick={() =>
                      runAction(() =>
                        createRedirectFrom404Action({
                          companyId,
                          companySlug: slug,
                          projectId,
                          logId: log.id,
                          missingUrl: log.missing_url,
                          destinationUrl: destinations[log.id],
                        })
                      )
                    }
                    className="ml-2 text-xs font-semibold text-violet-700 hover:underline disabled:opacity-50"
                  >
                    Create 301
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function ReportsPanel({ slug, companyId, companyName, reports, pending, runAction }: { slug: string; companyId: string; companyName: string; reports: SeoV10DashboardData["reports"]; pending: boolean; runAction: RunAction }) {
  function generate() {
    runAction(() => generateReportAction({ companyId, companySlug: slug, companyName }));
  }

  return (
    <div className="space-y-3">
      <button type="button" disabled={pending} onClick={generate} className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Generate health report</button>
      <ul className="space-y-2 text-sm">
        {reports.map((r) => (
          <li key={r.id} className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2">
            <span>{r.title} — Score: {r.seo_score ?? "—"}</span>
            <button type="button" onClick={() => { const blob = new Blob([exportReportJson(r)], { type: "application/json" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `seo-report-${r.id}.json`; a.click(); }} className="text-violet-700 hover:underline">Download</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Field({ label, value, onChange, className }: { label: string; value: string; onChange: (v: string) => void; className?: string }) {
  return (
    <label className={className}>
      <span className="text-xs font-semibold uppercase text-slate-400">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
    </label>
  );
}
