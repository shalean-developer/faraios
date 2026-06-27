"use client";

import { useMemo, useState } from "react";
import {
  AlertTriangle,
  Download,
  Plus,
  Sparkles,
  Trash2,
} from "lucide-react";

import { BuilderImageUploadField } from "@/components/website-builder/page-builder/builder-image-upload-field";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  buildSitemapPreview,
  generateJsonLd,
  slugifySeo,
} from "@/lib/website-builder/seo";
import { cn } from "@/lib/utils";
import type { CompanyWithIndustry } from "@/types/database";
import type { BuilderWebsite, WebsiteServicePageRecord } from "@/types/website-builder";
import type { WebsiteMediaRecord } from "@/types/website-builder-media";
import type {
  RobotsDirective,
  SeoEditorSection,
  SeoScoreBreakdown,
  WebsiteSeoSettings,
} from "@/types/website-builder-seo";

import {
  CharCounter,
  ChecklistItem,
  GoogleSearchPreview,
  MetricCard,
  PanelShell,
  ScoreRing,
  SeoField,
  SocialPlatformPreview,
  inputClassName,
  riseCardClassName,
} from "./seo-ui";

export type SeoEditorState = {
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  ogTitle: string;
  ogDescription: string;
  settings: WebsiteSeoSettings;
};

type PanelProps = {
  state: SeoEditorState;
  onChange: (patch: Partial<SeoEditorState>) => void;
  onSettingsChange: (patch: Partial<WebsiteSeoSettings> | ((s: WebsiteSeoSettings) => WebsiteSeoSettings)) => void;
  website: BuilderWebsite;
  companyId: string;
  company: CompanyWithIndustry;
  publicUrl: string;
  score: SeoScoreBreakdown;
  servicePages: WebsiteServicePageRecord[];
  mediaItems: WebsiteMediaRecord[];
  onNavigate: (section: SeoEditorSection) => void;
  onGenerateAi: () => void;
};

export function OverviewPanel({ score, state, onNavigate }: PanelProps) {
  const settings = state.settings;
  const lastSitemap = settings.sitemap.lastGenerated
    ? new Date(settings.sitemap.lastGenerated).toLocaleDateString()
    : "Not yet generated";

  return (
    <PanelShell title="SEO Overview" description="Monitor site-wide SEO health at a glance.">
      <div className="grid gap-4 lg:grid-cols-[auto_1fr]">
        <div className={cn(riseCardClassName, "flex items-center justify-center p-6")}>
          <ScoreRing score={score.overall} label="SEO Score" size={120} />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Readability" value={`${score.readability}%`} />
          <MetricCard label="Indexed pages" value={score.indexedPages} />
          <MetricCard label="Missing metadata" value={score.missingMetadata} />
          <MetricCard label="Missing alt text" value={score.missingAltText} />
          <MetricCard label="Broken links" value={score.brokenLinks} />
          <MetricCard label="Schema errors" value={score.schemaErrors} />
          <MetricCard label="Last sitemap" value={lastSitemap} />
          <MetricCard label="Publish readiness" value={`${score.publishReadiness}%`} sub="Checklist complete" />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className={cn(riseCardClassName, "p-4")}>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Publishing checklist</h3>
          <ul className="mt-3 space-y-2">
            <ChecklistItem done={Boolean(score.overall >= 70)} label="SEO score healthy" />
            <ChecklistItem done={score.missingMetadata === 0} label="Metadata complete" />
            <ChecklistItem done={score.missingAltText === 0} label="Image alt text" />
            <ChecklistItem done={settings.preferences.enableSchema} label="Schema enabled" />
            <ChecklistItem done={settings.preferences.enableSitemap} label="Sitemap enabled" />
          </ul>
          <p className="mt-4 text-sm font-medium text-[#4a6fd8]">
            {score.publishReadiness}% ready to publish
          </p>
        </div>
        <div className={cn(riseCardClassName, "p-4")}>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Top recommendations</h3>
          <ul className="mt-3 space-y-2">
            {score.issues.slice(0, 5).map((issue) => (
              <li key={issue.id}>
                <button
                  type="button"
                  onClick={() => issue.section && onNavigate(issue.section as SeoEditorSection)}
                  className="flex w-full items-start gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <AlertTriangle
                    className={cn(
                      "mt-0.5 h-4 w-4 shrink-0",
                      issue.severity === "error" ? "text-red-500" : "text-amber-500"
                    )}
                  />
                  <span>{issue.message}</span>
                </button>
              </li>
            ))}
            {score.issues.length === 0 ? (
              <li className="text-sm text-emerald-600">No issues detected — great work!</li>
            ) : null}
          </ul>
        </div>
      </div>
    </PanelShell>
  );
}

export function BasicSeoPanel({ state, onChange, onSettingsChange, publicUrl }: PanelProps) {
  const { seoTitle, seoDescription, settings } = state;

  function addKeyword(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    const next = [...settings.basic.focusKeywords.filter((k) => k !== trimmed), trimmed];
    onSettingsChange({ basic: { ...settings.basic, focusKeywords: next } });
    onChange({ seoKeywords: next.join(", ") });
  }

  return (
    <PanelShell title="Basic SEO" description="Core metadata for search engines.">
      <div className="grid gap-6 xl:grid-cols-2">
        <div className="space-y-4">
          <SeoField label="SEO title" hint="Keep between 30–60 characters.">
            <input
              className={inputClassName}
              value={seoTitle}
              onChange={(e) => {
                const value = e.target.value;
                onChange({ seoTitle: value });
                if (settings.preferences.autoSlug && !settings.basic.urlSlug) {
                  onSettingsChange({
                    basic: { ...settings.basic, urlSlug: slugifySeo(value) },
                  });
                }
              }}
            />
            <CharCounter value={seoTitle} max={60} type="title" />
          </SeoField>

          <SeoField label="Meta description" hint="Aim for 120–160 characters.">
            <textarea
              rows={4}
              className={inputClassName}
              value={seoDescription}
              onChange={(e) => onChange({ seoDescription: e.target.value })}
            />
            <CharCounter value={seoDescription} max={160} type="description" />
          </SeoField>

          <SeoField label="Focus keywords" hint="Press Enter to add a keyword.">
            <KeywordInput keywords={settings.basic.focusKeywords} onAdd={addKeyword} onRemove={(k) => {
              const next = settings.basic.focusKeywords.filter((item) => item !== k);
              onSettingsChange({ basic: { ...settings.basic, focusKeywords: next } });
              onChange({ seoKeywords: next.join(", ") });
            }} />
          </SeoField>

          <SeoField label="URL slug">
            <input
              className={inputClassName}
              value={settings.basic.urlSlug}
              onChange={(e) =>
                onSettingsChange({
                  basic: { ...settings.basic, urlSlug: slugifySeo(e.target.value) },
                })
              }
            />
          </SeoField>

          <SeoField label="Canonical URL">
            <input
              className={inputClassName}
              value={settings.basic.canonicalUrl}
              onChange={(e) =>
                onSettingsChange({ basic: { ...settings.basic, canonicalUrl: e.target.value } })
              }
            />
          </SeoField>

          <div className="grid gap-4 sm:grid-cols-2">
            <SeoField label="Robots meta">
              <select
                className={inputClassName}
                value={settings.basic.robots}
                onChange={(e) =>
                  onSettingsChange({
                    basic: { ...settings.basic, robots: e.target.value as RobotsDirective },
                  })
                }
              >
                <option value="index,follow">Index, Follow</option>
                <option value="noindex">No Index</option>
                <option value="nofollow">No Follow</option>
                <option value="noindex,nofollow">No Index, No Follow</option>
              </select>
            </SeoField>
            <SeoField label="Language">
              <input
                className={inputClassName}
                value={settings.basic.language}
                onChange={(e) =>
                  onSettingsChange({ basic: { ...settings.basic, language: e.target.value } })
                }
              />
            </SeoField>
            <SeoField label="Country">
              <input
                className={inputClassName}
                value={settings.basic.country}
                onChange={(e) =>
                  onSettingsChange({ basic: { ...settings.basic, country: e.target.value } })
                }
              />
            </SeoField>
            <SeoField label="Author">
              <input
                className={inputClassName}
                value={settings.basic.author}
                onChange={(e) =>
                  onSettingsChange({ basic: { ...settings.basic, author: e.target.value } })
                }
              />
            </SeoField>
          </div>
        </div>

        <GoogleSearchPreview
          title={seoTitle}
          description={seoDescription}
          url={settings.basic.canonicalUrl || publicUrl}
        />
      </div>
    </PanelShell>
  );
}

function KeywordInput({
  keywords,
  onAdd,
  onRemove,
}: {
  keywords: string[];
  onAdd: (value: string) => void;
  onRemove: (value: string) => void;
}) {
  const [draft, setDraft] = useState("");

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {keywords.map((keyword) => (
          <span
            key={keyword}
            className="inline-flex items-center gap-1 rounded-full bg-[#eef2ff] px-3 py-1 text-xs font-medium text-[#4a6fd8]"
          >
            {keyword}
            <button type="button" onClick={() => onRemove(keyword)} className="text-[#4a6fd8]/70 hover:text-[#4a6fd8]">
              ×
            </button>
          </span>
        ))}
      </div>
      <input
        className={cn(inputClassName, "mt-2")}
        value={draft}
        placeholder="Add keyword and press Enter"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            onAdd(draft);
            setDraft("");
          }
        }}
      />
    </div>
  );
}

export function SocialSeoPanel({ state, onChange, onSettingsChange, website, companyId, publicUrl }: PanelProps) {
  const { ogTitle, ogDescription, settings } = state;
  const social = settings.social;

  return (
    <PanelShell title="Social sharing" description="Control how your site appears when shared.">
      <Tabs defaultValue="facebook">
        <TabsList className="mb-4">
          <TabsTrigger value="facebook">Facebook</TabsTrigger>
          <TabsTrigger value="twitter">Twitter</TabsTrigger>
          <TabsTrigger value="linkedin">LinkedIn</TabsTrigger>
          <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
        </TabsList>

        <TabsContent value="facebook">
          <div className="grid gap-6 xl:grid-cols-2">
            <div className="space-y-4">
              <SeoField label="Open Graph title">
                <input className={inputClassName} value={ogTitle} onChange={(e) => onChange({ ogTitle: e.target.value })} />
              </SeoField>
              <SeoField label="Open Graph description">
                <textarea rows={3} className={inputClassName} value={ogDescription} onChange={(e) => onChange({ ogDescription: e.target.value })} />
              </SeoField>
              <BuilderImageUploadField
                label="Open Graph image (1200×630)"
                websiteId={website.id}
                companyId={companyId}
                value={social.ogImageUrl}
                onChange={(ogImageUrl) =>
                  onSettingsChange({ social: { ...social, ogImageUrl, twitterImageUrl: social.twitterImageUrl ?? ogImageUrl } })
                }
              />
              <SeoField label="Image alt text">
                <input className={inputClassName} value={social.ogImageAlt} onChange={(e) => onSettingsChange({ social: { ...social, ogImageAlt: e.target.value } })} />
              </SeoField>
            </div>
            <SocialPlatformPreview platform="facebook" title={ogTitle} description={ogDescription} imageUrl={social.ogImageUrl} url={publicUrl} />
          </div>
        </TabsContent>

        <TabsContent value="twitter">
          <div className="grid gap-6 xl:grid-cols-2">
            <div className="space-y-4">
              <SeoField label="Twitter title">
                <input className={inputClassName} value={social.twitterTitle} onChange={(e) => onSettingsChange({ social: { ...social, twitterTitle: e.target.value } })} />
              </SeoField>
              <SeoField label="Twitter description">
                <textarea rows={3} className={inputClassName} value={social.twitterDescription} onChange={(e) => onSettingsChange({ social: { ...social, twitterDescription: e.target.value } })} />
              </SeoField>
              <SeoField label="Twitter card type">
                <select className={inputClassName} value={social.twitterCard} onChange={(e) => onSettingsChange({ social: { ...social, twitterCard: e.target.value as typeof social.twitterCard } })}>
                  <option value="summary">Summary</option>
                  <option value="summary_large_image">Summary Large Image</option>
                </select>
              </SeoField>
              <BuilderImageUploadField label="Twitter image" websiteId={website.id} companyId={companyId} value={social.twitterImageUrl} onChange={(twitterImageUrl) => onSettingsChange({ social: { ...social, twitterImageUrl } })} compact />
            </div>
            <SocialPlatformPreview platform="twitter" title={social.twitterTitle || ogTitle} description={social.twitterDescription || ogDescription} imageUrl={social.twitterImageUrl ?? social.ogImageUrl} url={publicUrl} />
          </div>
        </TabsContent>

        <TabsContent value="linkedin">
          <SocialPlatformPreview platform="linkedin" title={ogTitle} description={ogDescription} imageUrl={social.ogImageUrl} url={publicUrl} />
        </TabsContent>

        <TabsContent value="whatsapp">
          <SocialPlatformPreview platform="whatsapp" title={ogTitle} description={ogDescription} imageUrl={social.ogImageUrl} url={publicUrl} />
        </TabsContent>
      </Tabs>
    </PanelShell>
  );
}

export function LocalSeoPanel({ state, onSettingsChange, website, companyId }: PanelProps) {
  const local = state.settings.local;

  function addServiceArea(value: string) {
    const trimmed = value.trim();
    if (!trimmed || local.serviceAreas.includes(trimmed)) return;
    onSettingsChange({ local: { ...local, serviceAreas: [...local.serviceAreas, trimmed] } });
  }

  return (
    <PanelShell title="Local SEO" description="Optimize for local search and Google Business visibility.">
      <div className="grid gap-4 sm:grid-cols-2">
        <SeoField label="Business name"><input className={inputClassName} value={local.businessName} onChange={(e) => onSettingsChange({ local: { ...local, businessName: e.target.value } })} /></SeoField>
        <SeoField label="Phone"><input className={inputClassName} value={local.phone} onChange={(e) => onSettingsChange({ local: { ...local, phone: e.target.value } })} /></SeoField>
        <SeoField label="Email" className="sm:col-span-2"><input className={inputClassName} value={local.email} onChange={(e) => onSettingsChange({ local: { ...local, email: e.target.value } })} /></SeoField>
        <SeoField label="Website" className="sm:col-span-2"><input className={inputClassName} value={local.website} onChange={(e) => onSettingsChange({ local: { ...local, website: e.target.value } })} /></SeoField>
        <SeoField label="Business description" className="sm:col-span-2"><textarea rows={3} className={inputClassName} value={local.businessDescription} onChange={(e) => onSettingsChange({ local: { ...local, businessDescription: e.target.value } })} /></SeoField>
        <SeoField label="Street address"><input className={inputClassName} value={local.streetAddress} onChange={(e) => onSettingsChange({ local: { ...local, streetAddress: e.target.value } })} /></SeoField>
        <SeoField label="City"><input className={inputClassName} value={local.city} onChange={(e) => onSettingsChange({ local: { ...local, city: e.target.value } })} /></SeoField>
        <SeoField label="Province"><input className={inputClassName} value={local.province} onChange={(e) => onSettingsChange({ local: { ...local, province: e.target.value } })} /></SeoField>
        <SeoField label="Postal code"><input className={inputClassName} value={local.postalCode} onChange={(e) => onSettingsChange({ local: { ...local, postalCode: e.target.value } })} /></SeoField>
        <SeoField label="Coordinates"><input className={inputClassName} value={local.coordinates} placeholder="-33.9249, 18.4241" onChange={(e) => onSettingsChange({ local: { ...local, coordinates: e.target.value } })} /></SeoField>
        <SeoField label="Opening hours"><input className={inputClassName} value={local.openingHours} onChange={(e) => onSettingsChange({ local: { ...local, openingHours: e.target.value } })} /></SeoField>
        <SeoField label="Emergency contact"><input className={inputClassName} value={local.emergencyContact} onChange={(e) => onSettingsChange({ local: { ...local, emergencyContact: e.target.value } })} /></SeoField>
        <SeoField label="Price range">
          <select className={inputClassName} value={local.priceRange} onChange={(e) => onSettingsChange({ local: { ...local, priceRange: e.target.value as typeof local.priceRange } })}>
            <option value="$">$</option>
            <option value="$$">$$</option>
            <option value="$$$">$$$</option>
          </select>
        </SeoField>
        <div className="sm:col-span-2">
          <BuilderImageUploadField label="Business logo" websiteId={website.id} companyId={companyId} value={local.logoUrl} onChange={(logoUrl) => onSettingsChange({ local: { ...local, logoUrl } })} />
        </div>
        <SeoField label="Service areas" className="sm:col-span-2">
          <ServiceAreaInput areas={local.serviceAreas} onAdd={addServiceArea} onRemove={(area) => onSettingsChange({ local: { ...local, serviceAreas: local.serviceAreas.filter((a) => a !== area) } })} />
        </SeoField>
      </div>
    </PanelShell>
  );
}

function ServiceAreaInput({ areas, onAdd, onRemove }: { areas: string[]; onAdd: (v: string) => void; onRemove: (v: string) => void }) {
  const [draft, setDraft] = useState("");
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {areas.map((area) => (
          <span key={area} className="inline-flex items-center gap-1 rounded-full border border-slate-200 px-3 py-1 text-xs">
            {area}
            <button type="button" onClick={() => onRemove(area)}>×</button>
          </span>
        ))}
      </div>
      <input className={cn(inputClassName, "mt-2")} value={draft} placeholder="Add area and press Enter" onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); onAdd(draft); setDraft(""); } }} />
    </div>
  );
}

export function SchemaPanel({ state, onSettingsChange, website, company, publicUrl }: PanelProps) {
  const schema = state.settings.schema;
  const jsonLd = useMemo(
    () => generateJsonLd({ website, settings: state.settings, company, publicUrl }),
    [website, state.settings, company, publicUrl]
  );

  const entries: { key: keyof typeof schema; label: string }[] = [
    { key: "organization", label: "Organization" },
    { key: "localBusiness", label: "Local Business" },
    { key: "cleaningService", label: "Cleaning Service" },
    { key: "website", label: "WebSite" },
    { key: "breadcrumb", label: "Breadcrumb" },
    { key: "faq", label: "FAQ" },
    { key: "review", label: "Review" },
    { key: "service", label: "Service" },
    { key: "article", label: "Article" },
    { key: "person", label: "Person" },
    { key: "video", label: "Video" },
    { key: "event", label: "Event" },
  ];

  return (
    <PanelShell title="Structured data (Schema)" description="Toggle schema types and preview generated JSON-LD.">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {entries.map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
            <Checkbox checked={schema[key]} onCheckedChange={(checked) => onSettingsChange({ schema: { ...schema, [key]: Boolean(checked) } })} />
            {label}
          </label>
        ))}
      </div>
      <div className={cn(riseCardClassName, "mt-4 overflow-hidden")}>
        <div className="border-b border-slate-100 px-4 py-2 text-xs font-medium text-slate-500 dark:border-slate-800">Generated JSON-LD</div>
        <pre className="max-h-96 overflow-auto p-4 text-xs text-slate-700 dark:text-slate-300">{JSON.stringify(jsonLd, null, 2)}</pre>
      </div>
    </PanelShell>
  );
}

export function TechnicalSeoPanel({ state, onSettingsChange, website, companyId }: PanelProps) {
  const tech = state.settings.technical;
  return (
    <PanelShell title="Technical SEO" description="Advanced head, verification, and robots configuration.">
      <div className="grid gap-4 sm:grid-cols-2">
        <SeoField label="Hreflang"><input className={inputClassName} value={tech.hreflang} onChange={(e) => onSettingsChange({ technical: { ...tech, hreflang: e.target.value } })} /></SeoField>
        <SeoField label="Theme color"><input type="color" className="mt-1 h-10 w-full rounded-md border border-slate-200" value={tech.themeColor} onChange={(e) => onSettingsChange({ technical: { ...tech, themeColor: e.target.value } })} /></SeoField>
        <div className="sm:col-span-2"><BuilderImageUploadField label="Favicon" websiteId={website.id} companyId={companyId} value={tech.faviconUrl} onChange={(faviconUrl) => onSettingsChange({ technical: { ...tech, faviconUrl } })} compact /></div>
        <div className="sm:col-span-2"><BuilderImageUploadField label="Apple touch icon" websiteId={website.id} companyId={companyId} value={tech.appleTouchIconUrl} onChange={(appleTouchIconUrl) => onSettingsChange({ technical: { ...tech, appleTouchIconUrl } })} compact /></div>
        <SeoField label="Manifest URL" className="sm:col-span-2"><input className={inputClassName} value={tech.manifestUrl} onChange={(e) => onSettingsChange({ technical: { ...tech, manifestUrl: e.target.value } })} /></SeoField>
        <SeoField label="Robots.txt editor" className="sm:col-span-2"><textarea rows={5} className={inputClassName} value={tech.robotsTxt} onChange={(e) => onSettingsChange({ technical: { ...tech, robotsTxt: e.target.value } })} /></SeoField>
        <SeoField label="Custom head scripts" className="sm:col-span-2"><textarea rows={3} className={inputClassName} value={tech.headScripts} onChange={(e) => onSettingsChange({ technical: { ...tech, headScripts: e.target.value } })} /></SeoField>
        <SeoField label="Custom body scripts" className="sm:col-span-2"><textarea rows={3} className={inputClassName} value={tech.bodyScripts} onChange={(e) => onSettingsChange({ technical: { ...tech, bodyScripts: e.target.value } })} /></SeoField>
        <SeoField label="Google Search Console"><input className={inputClassName} value={tech.googleVerification} onChange={(e) => onSettingsChange({ technical: { ...tech, googleVerification: e.target.value } })} /></SeoField>
        <SeoField label="Bing"><input className={inputClassName} value={tech.bingVerification} onChange={(e) => onSettingsChange({ technical: { ...tech, bingVerification: e.target.value } })} /></SeoField>
        <SeoField label="Pinterest"><input className={inputClassName} value={tech.pinterestVerification} onChange={(e) => onSettingsChange({ technical: { ...tech, pinterestVerification: e.target.value } })} /></SeoField>
        <SeoField label="Facebook"><input className={inputClassName} value={tech.facebookVerification} onChange={(e) => onSettingsChange({ technical: { ...tech, facebookVerification: e.target.value } })} /></SeoField>
      </div>
    </PanelShell>
  );
}

export function AnalyticsPanel({ state, onSettingsChange }: PanelProps) {
  const cards = [
    { key: "ga4" as const, label: "Google Analytics 4" },
    { key: "gtm" as const, label: "Google Tag Manager" },
    { key: "clarity" as const, label: "Microsoft Clarity" },
    { key: "metaPixel" as const, label: "Meta Pixel" },
    { key: "linkedIn" as const, label: "LinkedIn Insight" },
    { key: "tiktok" as const, label: "TikTok Pixel" },
  ];

  return (
    <PanelShell title="Analytics integrations" description="Connect tracking services to your public site.">
      <div className="grid gap-4 md:grid-cols-2">
        {cards.map(({ key, label }) => {
          const item = state.settings.analytics[key];
          return (
            <div key={key} className={cn(riseCardClassName, "p-4")}>
              <div className="flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{label}</h3>
                <label className="inline-flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={item.enabled} onChange={(e) => onSettingsChange({ analytics: { ...state.settings.analytics, [key]: { ...item, enabled: e.target.checked } } })} />
                  Enable
                </label>
              </div>
              <input className={cn(inputClassName, "mt-3")} placeholder="Measurement ID" value={item.id} onChange={(e) => onSettingsChange({ analytics: { ...state.settings.analytics, [key]: { ...item, id: e.target.value } } })} />
              <p className="mt-2 text-xs text-slate-500">{item.verified ? "Verified" : "Not verified"}</p>
            </div>
          );
        })}
      </div>
    </PanelShell>
  );
}

export function SitemapPanel({ state, onSettingsChange, publicUrl, servicePages }: PanelProps) {
  const sitemap = state.settings.sitemap;
  const xml = buildSitemapPreview({ publicUrl, slug: "", servicePages });
  const totalUrls = 1 + servicePages.filter((p) => p.status === "published").length;

  function generateNow() {
    onSettingsChange({ sitemap: { ...sitemap, lastGenerated: new Date().toISOString() } });
  }

  return (
    <PanelShell title="Sitemap" description="Configure XML sitemap generation for search engines.">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="Total URLs" value={totalUrls} />
        <MetricCard label="Pending URLs" value={0} />
        <MetricCard label="Excluded URLs" value={0} />
        <MetricCard label="Last generated" value={sitemap.lastGenerated ? new Date(sitemap.lastGenerated).toLocaleString() : "Never"} />
      </div>
      <div className="flex flex-wrap gap-3">
        <label className="inline-flex items-center gap-2 text-sm"><input type="checkbox" checked={sitemap.enabled} onChange={(e) => onSettingsChange({ sitemap: { ...sitemap, enabled: e.target.checked } })} />Enable sitemap</label>
        <select className={inputClassName} value={sitemap.frequency} onChange={(e) => onSettingsChange({ sitemap: { ...sitemap, frequency: e.target.value as typeof sitemap.frequency } })}>
          <option value="daily">Generate daily</option>
          <option value="weekly">Generate weekly</option>
          <option value="monthly">Generate monthly</option>
        </select>
        <button type="button" onClick={generateNow} className="rounded-md bg-[#5a8dee] px-4 py-2 text-sm font-medium text-white">Generate now</button>
        <a href={`data:text/xml;charset=utf-8,${encodeURIComponent(xml)}`} download="sitemap.xml" className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-4 py-2 text-sm font-medium"><Download className="h-4 w-4" />Download XML</a>
      </div>
      <pre className={cn(riseCardClassName, "max-h-64 overflow-auto p-4 text-xs")}>{xml}</pre>
    </PanelShell>
  );
}

export function RedirectsPanel({ state, onSettingsChange }: PanelProps) {
  const redirects = state.settings.redirects;

  function addRedirect() {
    onSettingsChange({
      redirects: [
        ...redirects,
        { id: crypto.randomUUID(), from: "/old-url", to: "/new-url", type: "301", createdAt: new Date().toISOString() },
      ],
    });
  }

  return (
    <PanelShell title="Redirect manager" description="Manage URL redirects for moved or renamed pages.">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={addRedirect} className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-3 py-2 text-sm"><Plus className="h-4 w-4" />Add redirect</button>
      </div>
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500 dark:bg-slate-900">
            <tr>
              <th className="px-3 py-2">Old URL</th>
              <th className="px-3 py-2">New URL</th>
              <th className="px-3 py-2">Type</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {redirects.length === 0 ? (
              <tr><td colSpan={4} className="px-3 py-6 text-center text-slate-500">No redirects yet.</td></tr>
            ) : (
              redirects.map((redirect, index) => (
                <tr key={redirect.id} className="border-t border-slate-100 dark:border-slate-800">
                  <td className="px-3 py-2"><input className={inputClassName} value={redirect.from} onChange={(e) => { const next = [...redirects]; next[index] = { ...redirect, from: e.target.value }; onSettingsChange({ redirects: next }); }} /></td>
                  <td className="px-3 py-2"><input className={inputClassName} value={redirect.to} onChange={(e) => { const next = [...redirects]; next[index] = { ...redirect, to: e.target.value }; onSettingsChange({ redirects: next }); }} /></td>
                  <td className="px-3 py-2">
                    <select className={inputClassName} value={redirect.type} onChange={(e) => { const next = [...redirects]; next[index] = { ...redirect, type: e.target.value as typeof redirect.type }; onSettingsChange({ redirects: next }); }}>
                      <option value="301">301</option><option value="302">302</option><option value="307">307</option><option value="308">308</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <button type="button" className="text-red-500" onClick={() => onSettingsChange({ redirects: redirects.filter((r) => r.id !== redirect.id) })}><Trash2 className="h-4 w-4" /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </PanelShell>
  );
}

export function HealthPanel({ score, mediaItems, onNavigate }: PanelProps) {
  return (
    <PanelShell title="SEO health checker" description="Audit results and actionable fixes.">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className={cn(riseCardClassName, "p-4")}>
          <h3 className="text-sm font-semibold">Issues</h3>
          <ul className="mt-3 space-y-2">
            {score.issues.map((issue) => (
              <li key={issue.id}>
                <button type="button" onClick={() => issue.section && onNavigate(issue.section as SeoEditorSection)} className="w-full rounded-lg border border-slate-100 px-3 py-2 text-left text-sm hover:bg-slate-50 dark:border-slate-800">
                  <span className="font-medium">{issue.category}</span> — {issue.message}
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className={cn(riseCardClassName, "p-4")}>
          <h3 className="text-sm font-semibold">Image SEO</h3>
          <ul className="mt-3 max-h-64 space-y-2 overflow-y-auto">
            {mediaItems.slice(0, 10).map((item) => (
              <li key={item.id} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate">{item.filename}</span>
                <span className={item.alt_text ? "text-emerald-600" : "text-amber-600"}>{item.alt_text ? "Alt set" : "Missing alt"}</span>
              </li>
            ))}
            {mediaItems.length === 0 ? <li className="text-sm text-slate-500">No media uploaded yet.</li> : null}
          </ul>
        </div>
      </div>
    </PanelShell>
  );
}

export function PreferencesPanel({ state, onSettingsChange, onGenerateAi }: PanelProps) {
  const prefs = state.settings.preferences;
  const entries: { key: keyof typeof prefs; label: string }[] = [
    { key: "autoSave", label: "Enable auto-save" },
    { key: "autoCanonical", label: "Auto-generate canonicals" },
    { key: "autoSlug", label: "Auto-generate slugs" },
    { key: "enableAi", label: "Enable AI assistant" },
    { key: "enableSitemap", label: "Enable sitemap" },
    { key: "enableSchema", label: "Enable schema" },
    { key: "enableImageOptimization", label: "Enable image optimization" },
    { key: "enableLazyLoading", label: "Enable lazy loading" },
    { key: "enableRedirectLogging", label: "Enable redirect logging" },
  ];

  return (
    <PanelShell title="SEO settings" description="Automation and assistant preferences.">
      <div className="grid gap-2 sm:grid-cols-2">
        {entries.map(({ key, label }) => (
          <label key={key} className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-700">
            <Checkbox checked={prefs[key]} onCheckedChange={(checked) => onSettingsChange({ preferences: { ...prefs, [key]: Boolean(checked) } })} />
            {label}
          </label>
        ))}
      </div>
      <button type="button" onClick={onGenerateAi} className="mt-4 inline-flex items-center gap-2 rounded-md bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700">
        <Sparkles className="h-4 w-4" />Generate SEO with AI
      </button>
    </PanelShell>
  );
}
