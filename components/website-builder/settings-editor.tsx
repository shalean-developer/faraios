"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  Calendar,
  Copy,
  Globe,
  Key,
  Link2,
  Loader2,
  Plug,
  RefreshCw,
  Save,
  Search,
  Settings2,
  Share2,
  Trash2,
  Webhook,
} from "lucide-react";

import {
  generatePreviewTokenAction,
  revokePreviewTokenAction,
  updateWebsiteBuilderSettingsAction,
} from "@/app/actions/website-builder";
import { publicSiteUrl } from "@/lib/website-builder/access";
import { getBuilderSettings, buildPreviewShareUrl } from "@/lib/website-builder/settings";
import { parseSeoSettings } from "@/lib/website-builder/seo";
import {
  companyAnalyticsPath,
  companySeoPath,
  companyWebsiteBuilderSectionPath,
  companyWebsiteApiKeysPath,
  companyWebsiteConnectionPath,
  companyWebsiteHostingPath,
  companyWebsiteTrackingPath,
} from "@/lib/paths/company";
import { cn } from "@/lib/utils";
import type { BuilderWebsite, DomainSettingsRecord } from "@/types/website-builder";
import type { PublishSnapshotSummary, WebsiteBuilderSettings } from "@/types/website-builder-settings";
import type { BuilderViewport } from "@/types/website-builder-sections";

const riseCardClassName = "rounded-xl border border-slate-200 bg-white shadow-sm";
const inputClass =
  "mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm";

type Props = {
  slug: string;
  companyId: string;
  website: BuilderWebsite;
  domainSettings: DomainSettingsRecord | null;
  publishSnapshots?: PublishSnapshotSummary[];
};

function IntegrationCard({
  title,
  description,
  href,
  icon: Icon,
  badge,
}: {
  title: string;
  description: string;
  href: string;
  icon: typeof Globe;
  badge?: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md"
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
          {badge ? (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-slate-500">
              {badge}
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
        <span className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-violet-700 group-hover:text-violet-900">
          Open
          <ArrowRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </Link>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-start justify-between gap-4 py-3">
      <span>
        <span className="text-sm font-medium text-slate-900">{label}</span>
        {description ? <p className="mt-0.5 text-sm text-slate-500">{description}</p> : null}
      </span>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 h-4 w-4 rounded border-slate-300"
      />
    </label>
  );
}

export function SettingsEditor({
  slug,
  companyId,
  website,
  domainSettings,
  publishSnapshots = [],
}: Props) {
  const router = useRouter();
  const publicUrl = domainSettings?.default_url ?? publicSiteUrl(slug);
  const appUrl = typeof window !== "undefined" ? window.location.origin : "";

  const initialSettings = useMemo(
    () =>
      getBuilderSettings({
        website,
        bookingEnabled: website.booking_enabled,
      }),
    [website]
  );

  const thirdPartyAnalyticsConfigured = useMemo(() => {
    const seo = parseSeoSettings(website.theme_settings.seoSettings);
    if (!seo) return false;
    return Object.values(seo.analytics).some((item) => item.enabled && item.id.trim().length > 0);
  }, [website.theme_settings.seoSettings]);

  const [settings, setSettings] = useState<WebsiteBuilderSettings>(initialSettings);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const [tokenPending, startTokenTransition] = useTransition();

  const previewShareUrl =
    settings.preview.token && settings.preview.shareEnabled
      ? buildPreviewShareUrl(slug, settings.preview.token, appUrl || undefined)
      : null;

  function patchSettings(
    patch: Partial<WebsiteBuilderSettings> | ((current: WebsiteBuilderSettings) => WebsiteBuilderSettings)
  ) {
    setSettings((current) =>
      typeof patch === "function" ? patch(current) : { ...current, ...patch }
    );
  }

  function saveSettings() {
    setError(null);
    setMessage(null);
    startTransition(async () => {
      const result = await updateWebsiteBuilderSettingsAction({
        companyId,
        companySlug: slug,
        settings,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("Settings saved.");
      router.refresh();
    });
  }

  function generatePreviewLink() {
    setError(null);
    setMessage(null);
    startTokenTransition(async () => {
      const result = await generatePreviewTokenAction({
        companyId,
        companySlug: slug,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSettings((current) => ({
        ...current,
        preview: {
          shareEnabled: true,
          token: result.token ?? null,
          expiresAt: result.expiresAt ?? null,
        },
      }));
      setMessage("Preview link generated.");
      router.refresh();
    });
  }

  function revokePreviewLink() {
    setError(null);
    setMessage(null);
    startTokenTransition(async () => {
      const result = await revokePreviewTokenAction({
        companyId,
        companySlug: slug,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSettings((current) => ({
        ...current,
        preview: { shareEnabled: false, token: null, expiresAt: null },
      }));
      setMessage("Preview link revoked.");
      router.refresh();
    });
  }

  async function copyPreviewLink() {
    if (!previewShareUrl) return;
    try {
      await navigator.clipboard.writeText(previewShareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Could not copy link.");
    }
  }

  return (
    <div className="space-y-6">
      <section className={riseCardClassName}>
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-violet-600" />
            <h2 className="text-sm font-semibold text-slate-900">Site identity</h2>
          </div>
        </div>
        <dl className="grid gap-4 p-5 sm:grid-cols-2">
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-500">Website ID</dt>
            <dd className="mt-1 font-mono text-sm text-slate-900">{website.id}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-500">Business ID</dt>
            <dd className="mt-1 font-mono text-sm text-slate-900">{companyId}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-500">Public URL</dt>
            <dd className="mt-1 text-sm text-slate-900">{publicUrl}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-500">Status</dt>
            <dd className="mt-1 capitalize text-sm text-slate-900">{website.status}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase text-slate-500">Last updated</dt>
            <dd className="mt-1 text-sm text-slate-900">
              {new Date(website.updated_at).toLocaleString()}
            </dd>
          </div>
          {website.published_at ? (
            <div>
              <dt className="text-xs font-semibold uppercase text-slate-500">Last published</dt>
              <dd className="mt-1 text-sm text-slate-900">
                {new Date(website.published_at).toLocaleString()}
              </dd>
            </div>
          ) : null}
        </dl>
      </section>

      <section className={riseCardClassName}>
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 text-violet-600" />
            <h2 className="text-sm font-semibold text-slate-900">Builder preferences</h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Defaults for autosave, preview, and site chrome across the builder.
          </p>
        </div>
        <div className="divide-y divide-slate-100 px-5">
          <ToggleRow
            label="Auto-save"
            description="Automatically save page builder changes after a short delay."
            checked={settings.preferences.autoSave}
            onChange={(autoSave) =>
              patchSettings({ preferences: { ...settings.preferences, autoSave } })
            }
          />
          <div className="py-3">
            <label className="text-sm font-medium text-slate-900">Auto-save delay</label>
            <select
              className={cn(inputClass, "max-w-xs")}
              value={settings.preferences.autoSaveDelayMs}
              disabled={!settings.preferences.autoSave}
              onChange={(e) =>
                patchSettings({
                  preferences: {
                    ...settings.preferences,
                    autoSaveDelayMs: Number(e.target.value) as WebsiteBuilderSettings["preferences"]["autoSaveDelayMs"],
                  },
                })
              }
            >
              <option value={1500}>1.5 seconds</option>
              <option value={2500}>2.5 seconds</option>
              <option value={5000}>5 seconds</option>
            </select>
          </div>
          <div className="py-3">
            <label className="text-sm font-medium text-slate-900">Default preview viewport</label>
            <select
              className={cn(inputClass, "max-w-xs")}
              value={settings.preferences.defaultPreviewViewport}
              onChange={(e) =>
                patchSettings({
                  preferences: {
                    ...settings.preferences,
                    defaultPreviewViewport: e.target.value as BuilderViewport,
                  },
                })
              }
            >
              <option value="desktop">Desktop</option>
              <option value="tablet">Tablet</option>
              <option value="mobile">Mobile</option>
            </select>
          </div>
          <ToggleRow
            label="Show powered by FaraiOS"
            description="Display a small footer credit on your public site."
            checked={settings.preferences.showPoweredBy}
            onChange={(showPoweredBy) =>
              patchSettings({ preferences: { ...settings.preferences, showPoweredBy } })
            }
          />
          <ToggleRow
            label="Email on new enquiry"
            description="Send a notification when someone submits your contact form."
            checked={settings.notifications.emailOnEnquiry}
            onChange={(emailOnEnquiry) =>
              patchSettings({ notifications: { ...settings.notifications, emailOnEnquiry } })
            }
          />
        </div>
        <div className="border-t border-slate-100 px-5 py-3 text-sm text-slate-500">
          SEO auto-save is configured separately in the{" "}
          <Link
            href={companyWebsiteBuilderSectionPath(slug, "seo")}
            className="font-medium text-violet-700 hover:text-violet-900"
          >
            SEO editor
          </Link>
          .
        </div>
      </section>

      <section className={riseCardClassName}>
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <Share2 className="h-4 w-4 text-violet-600" />
            <h2 className="text-sm font-semibold text-slate-900">Preview sharing</h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Share a private link to your current draft. The public URL only shows published content.
          </p>
        </div>
        <div className="space-y-4 p-5">
          {previewShareUrl ? (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <p className="text-xs font-semibold uppercase text-slate-500">Share link</p>
              <p className="mt-2 break-all font-mono text-sm text-slate-800">{previewShareUrl}</p>
              {settings.preview.expiresAt ? (
                <p className="mt-2 text-xs text-slate-500">
                  Expires {new Date(settings.preview.expiresAt).toLocaleString()}
                </p>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={copyPreviewLink}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  <Copy className="h-4 w-4" />
                  {copied ? "Copied" : "Copy link"}
                </button>
                <button
                  type="button"
                  disabled={tokenPending}
                  onClick={generatePreviewLink}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                >
                  <RefreshCw className="h-4 w-4" />
                  Regenerate
                </button>
                <button
                  type="button"
                  disabled={tokenPending}
                  onClick={revokePreviewLink}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                  Revoke
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              disabled={tokenPending}
              onClick={generatePreviewLink}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
            >
              {tokenPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              Generate preview link
            </button>
          )}
        </div>
      </section>

      <section className={riseCardClassName}>
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Publishing & history</h2>
          <p className="mt-1 text-sm text-slate-500">
            Publish your site and review deployment history.
          </p>
        </div>
        <div className="space-y-4 p-5">
          <div className="flex flex-wrap gap-3">
            <Link
              href={companyWebsiteBuilderSectionPath(slug, "publish")}
              className="inline-flex items-center gap-1 text-sm font-medium text-violet-700 hover:text-violet-900"
            >
              Open publishing
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href={companyWebsiteHostingPath(slug)}
              className="inline-flex items-center gap-1 text-sm font-medium text-violet-700 hover:text-violet-900"
            >
              Deployment logs
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {publishSnapshots.length > 0 ? (
            <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
              {publishSnapshots.map((snapshot) => (
                <li
                  key={snapshot.id}
                  className="flex items-center justify-between px-4 py-3 text-sm"
                >
                  <span className="text-slate-700">
                    {new Date(snapshot.publishedAt).toLocaleString()}
                  </span>
                  <span className="text-slate-500">
                    {snapshot.pageCount} pages · {snapshot.status}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-slate-200 px-4 py-3 text-sm text-slate-500">
              Publish snapshots will appear here once version history is enabled. Publishing today
              updates your live site without storing a restore point.
            </p>
          )}
        </div>
      </section>

      <section className={riseCardClassName}>
        <div className="border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-2">
            <Plug className="h-4 w-4 text-violet-600" />
            <h2 className="text-sm font-semibold text-slate-900">Hosted site integrations</h2>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Toggles apply to your FaraiOS-hosted site. External widgets live on the website hub.
          </p>
        </div>
        <div className="divide-y divide-slate-100 px-5">
          <ToggleRow
            label="Booking on public site"
            description="Show booking CTAs that link to your FaraiOS booking flow."
            checked={settings.integrations.bookingEnabled}
            onChange={(bookingEnabled) =>
              patchSettings({
                integrations: { ...settings.integrations, bookingEnabled },
              })
            }
          />
          <ToggleRow
            label="Native analytics"
            description="Track page views, clicks, and Web Vitals on your public site."
            checked={settings.integrations.nativeAnalyticsEnabled}
            onChange={(nativeAnalyticsEnabled) =>
              patchSettings({
                integrations: { ...settings.integrations, nativeAnalyticsEnabled },
              })
            }
          />
          <ToggleRow
            label="Third-party tags from SEO editor"
            description={
              thirdPartyAnalyticsConfigured
                ? "GA4, GTM, and other tags are configured in SEO. Public rendering ships in a future update."
                : "Configure GA4, GTM, Meta Pixel, and more in the SEO editor."
            }
            checked={settings.integrations.inheritSeoAnalytics}
            onChange={(inheritSeoAnalytics) =>
              patchSettings({
                integrations: { ...settings.integrations, inheritSeoAnalytics },
              })
            }
          />
        </div>
      </section>

      <div>
        <h2 className="mb-3 text-sm font-semibold text-slate-900">Connected services</h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <IntegrationCard
            title="SEO editor"
            description="Per-page metadata, schema, sitemap, and third-party analytics tags."
            href={companyWebsiteBuilderSectionPath(slug, "seo")}
            icon={Search}
          />
          <IntegrationCard
            title="SEO V10 platform"
            description="Crawl audits, Google Search Console, and advanced growth SEO."
            href={companySeoPath(slug)}
            icon={BarChart3}
            badge="Growth"
          />
          <IntegrationCard
            title="Analytics dashboard"
            description="Campaign performance, funnels, and revenue attribution."
            href={companyAnalyticsPath(slug)}
            icon={BarChart3}
          />
          <IntegrationCard
            title="Booking CTA"
            description="Customize the label and style of your booking button."
            href={companyWebsiteBuilderSectionPath(slug, "booking")}
            icon={Calendar}
          />
          <IntegrationCard
            title="Enquiries inbox"
            description="Contact form submissions from your public site."
            href={companyWebsiteBuilderSectionPath(slug, "enquiries")}
            icon={Webhook}
          />
          <IntegrationCard
            title="External site connection"
            description="Booking widget, tracking snippet, and iframe embed for non-FaraiOS sites."
            href={companyWebsiteConnectionPath(slug)}
            icon={Globe}
            badge="Hub"
          />
          <IntegrationCard
            title="API keys"
            description="Public API credentials and booking endpoint for integrations."
            href={companyWebsiteApiKeysPath(slug)}
            icon={Key}
            badge="Hub"
          />
          <IntegrationCard
            title="External tracking"
            description="tracking.js snippet and recent events for connected external sites."
            href={companyWebsiteTrackingPath(slug)}
            icon={Link2}
            badge="Hub"
          />
        </div>
      </div>

      <div
        className={cn(
          "sticky bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-lg",
          riseCardClassName
        )}
      >
        <div className="text-sm">
          {message ? <span className="text-emerald-700">{message}</span> : null}
          {error ? <span className="text-red-600">{error}</span> : null}
          {!message && !error ? (
            <span className="text-slate-500">Unsaved changes are not applied until you save.</span>
          ) : null}
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={saveSettings}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save settings
        </button>
      </div>
    </div>
  );
}
