"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  BarChart3,
  FileSearch,
  Globe,
  Map,
  RefreshCw,
  Save,
  Search,
  Settings2,
  Share2,
  Shuffle,
  Sparkles,
  Wrench,
} from "lucide-react";

import { updateWebsiteSeoSettingsAction } from "@/app/actions/website-builder";
import { publicSiteUrl } from "@/lib/website-builder/access";
import {
  computeSeoScore,
  generateAiSeoDraft,
  getSeoSettings,
  keywordsFromString,
} from "@/lib/website-builder/seo";
import { companyWebsiteBuilderSectionPath, publicSitePath } from "@/lib/paths/company";
import { cn } from "@/lib/utils";
import type { CompanyWithIndustry } from "@/types/database";
import type {
  BuilderWebsite,
  DomainSettingsRecord,
  LandingPageContent,
  WebsiteServicePageRecord,
} from "@/types/website-builder";
import type { WebsiteMediaRecord } from "@/types/website-builder-media";
import type { SeoEditorSection, WebsiteSeoSettings } from "@/types/website-builder-seo";

import {
  AnalyticsPanel,
  BasicSeoPanel,
  HealthPanel,
  LocalSeoPanel,
  OverviewPanel,
  PreferencesPanel,
  RedirectsPanel,
  SchemaPanel,
  SitemapPanel,
  SocialSeoPanel,
  TechnicalSeoPanel,
  type SeoEditorState,
} from "./seo/seo-panels";
import { riseCardClassName } from "./seo/seo-ui";

const AUTOSAVE_MS = 2500;

const SEO_NAV: { key: SeoEditorSection; label: string; icon: typeof Search }[] = [
  { key: "overview", label: "Overview", icon: Activity },
  { key: "basic", label: "Basic SEO", icon: Search },
  { key: "social", label: "Social Sharing", icon: Share2 },
  { key: "local", label: "Local SEO", icon: Map },
  { key: "schema", label: "Schema", icon: FileSearch },
  { key: "technical", label: "Technical SEO", icon: Wrench },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "sitemap", label: "Sitemap", icon: Globe },
  { key: "redirects", label: "Redirects", icon: Shuffle },
  { key: "health", label: "SEO Health", icon: Activity },
];

type Props = {
  slug: string;
  companyId: string;
  company: CompanyWithIndustry;
  website: BuilderWebsite;
  landingContent: LandingPageContent | null;
  servicePages: WebsiteServicePageRecord[];
  mediaItems: WebsiteMediaRecord[];
  domainSettings: DomainSettingsRecord | null;
};

export function SeoEditor({
  slug,
  companyId,
  company,
  website,
  landingContent,
  servicePages,
  mediaItems,
  domainSettings,
}: Props) {
  const router = useRouter();
  const publicUrl = domainSettings?.default_url ?? publicSiteUrl(slug);
  const initialSettings = useMemo(
    () => getSeoSettings({ company, website, landing: landingContent, publicUrl }),
    [company, website, landingContent, publicUrl]
  );

  const [section, setSection] = useState<SeoEditorSection>("overview");
  const [search, setSearch] = useState("");
  const [pending, startTransition] = useTransition();
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [toast, setToast] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const dirtyRef = useRef(false);
  const skipAutosaveRef = useRef(true);
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [state, setState] = useState<SeoEditorState>(() => ({
    seoTitle: website.seo_title ?? "",
    seoDescription: website.seo_description ?? "",
    seoKeywords: website.seo_keywords ?? "",
    ogTitle: website.og_title ?? website.seo_title ?? "",
    ogDescription: website.og_description ?? website.seo_description ?? "",
    settings: initialSettings,
  }));

  const score = useMemo(
    () =>
      computeSeoScore({
        website: {
          ...website,
          seo_title: state.seoTitle,
          seo_description: state.seoDescription,
          seo_keywords: state.seoKeywords,
          og_title: state.ogTitle,
          og_description: state.ogDescription,
          og_image_url: state.settings.social.ogImageUrl,
        },
        settings: state.settings,
        landing: landingContent,
        servicePages,
        mediaItems,
      }),
    [website, state, landingContent, servicePages, mediaItems]
  );

  const serviceNames = useMemo(
    () => servicePages.map((p) => p.title),
    [servicePages]
  );

  const filteredNav = SEO_NAV.filter((item) =>
    item.label.toLowerCase().includes(search.trim().toLowerCase())
  );

  const persist = useCallback(
    (manual = false) => {
      setSaveStatus("saving");
      if (manual) setToast(null);
      startTransition(async () => {
        const result = await updateWebsiteSeoSettingsAction({
          companyId,
          companySlug: slug,
          seoTitle: state.seoTitle,
          seoDescription: state.seoDescription,
          seoKeywords: state.seoKeywords,
          ogTitle: state.ogTitle,
          ogDescription: state.ogDescription,
          ogImageUrl: state.settings.social.ogImageUrl,
          settings: state.settings,
        });
        if (result.ok) {
          dirtyRef.current = false;
          setIsDirty(false);
          setSaveStatus("saved");
          if (manual) setToast("SEO settings saved.");
          router.refresh();
        } else {
          setSaveStatus("error");
          setToast(result.error);
        }
      });
    },
    [companyId, slug, state, router]
  );

  useEffect(() => {
    if (!state.settings.preferences.autoSave) return;
    if (skipAutosaveRef.current) {
      skipAutosaveRef.current = false;
      return;
    }
    dirtyRef.current = true;
    queueMicrotask(() => {
      setIsDirty(true);
      setSaveStatus("idle");
    });
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => {
      if (dirtyRef.current) persist(false);
    }, AUTOSAVE_MS);
    return () => {
      if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    };
  }, [state, persist]);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        persist(true);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [persist]);

  function patchState(patch: Partial<SeoEditorState>) {
    setState((current) => ({ ...current, ...patch }));
  }

  function patchSettings(
    patch: Partial<WebsiteSeoSettings> | ((settings: WebsiteSeoSettings) => WebsiteSeoSettings)
  ) {
    setState((current) => ({
      ...current,
      settings: typeof patch === "function" ? patch(current.settings) : { ...current.settings, ...patch },
    }));
  }

  function resetChanges() {
    setState({
      seoTitle: website.seo_title ?? "",
      seoDescription: website.seo_description ?? "",
      seoKeywords: website.seo_keywords ?? "",
      ogTitle: website.og_title ?? website.seo_title ?? "",
      ogDescription: website.og_description ?? website.seo_description ?? "",
      settings: getSeoSettings({ company, website, landing: landingContent, publicUrl }),
    });
    setToast("Changes reset.");
  }

  function runGenerateAi() {
    const draft = generateAiSeoDraft({ company, services: serviceNames, publicUrl });
    setState((current) => ({
      ...current,
      seoTitle: draft.seoTitle,
      seoDescription: draft.seoDescription,
      seoKeywords: draft.seoKeywords,
      ogTitle: draft.ogTitle,
      ogDescription: draft.ogDescription,
      settings: {
        ...current.settings,
        basic: {
          ...current.settings.basic,
          focusKeywords: keywordsFromString(draft.seoKeywords),
        },
        social: {
          ...current.settings.social,
          twitterTitle: draft.twitterTitle,
          twitterDescription: draft.twitterDescription,
          ogImageAlt: draft.ogImageAlt,
        },
      },
    }));
    setToast("AI draft generated — review and save.");
  }

  const panelProps = {
    state,
    onChange: patchState,
    onSettingsChange: patchSettings,
    website,
    companyId,
    company,
    publicUrl,
    score,
    servicePages,
    mediaItems,
    onNavigate: setSection,
    onGenerateAi: runGenerateAi,
  };

  const saveLabel =
    saveStatus === "saving" || pending
      ? "Saving…"
      : saveStatus === "saved"
        ? "Saved"
        : saveStatus === "error"
          ? "Save failed"
          : "Save";

  return (
    <div className="flex min-h-[calc(100dvh-10rem)] flex-col gap-2 pb-20">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-[#eef2ff] px-2.5 py-1 text-xs font-semibold text-[#4a6fd8]">
            SEO {score.overall}/100
          </span>
          <span className="text-xs text-slate-400">
            {saveStatus === "saved"
              ? "Autosaved"
              : isDirty
                ? "Unsaved changes"
                : "All changes saved"}
          </span>
        </div>
        <input
          type="search"
          placeholder="Search SEO settings…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="h-9 w-full max-w-xs rounded-md border border-slate-200 px-3 text-sm dark:border-slate-700 dark:bg-slate-950"
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-2 lg:flex-row">
        <nav
          className={cn(
            riseCardClassName,
            "flex shrink-0 flex-row gap-1 overflow-x-auto p-2 lg:hidden"
          )}
          aria-label="SEO sections"
        >
          {filteredNav.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => setSection(item.key)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium transition-colors",
                  section === item.key
                    ? "bg-[#eef2ff] text-[#4a6fd8]"
                    : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                )}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" />
                {item.label}
              </button>
            );
          })}
        </nav>

        <aside
          className={cn(
            riseCardClassName,
            "hidden w-[220px] shrink-0 flex-col overflow-hidden lg:flex"
          )}
        >
          <div className="border-b border-slate-100 px-2.5 py-2 dark:border-slate-800">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">SEO</p>
          </div>
          <nav className="flex-1 overflow-y-auto p-2" aria-label="SEO sections">
            <ul className="space-y-1">
              {filteredNav.map((item) => {
                const Icon = item.icon;
                return (
                  <li key={item.key}>
                    <button
                      type="button"
                      onClick={() => setSection(item.key)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors",
                        section === item.key
                          ? "bg-[#eef2ff] font-medium text-[#4a6fd8]"
                          : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
          <div className="border-t border-slate-100 p-2 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setSection("health")}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800"
            >
              <Settings2 className="h-4 w-4" />
              Settings
            </button>
          </div>
        </aside>

        <main className={cn(riseCardClassName, "min-w-0 flex-1 overflow-y-auto p-4 sm:p-5")}>
          {section === "overview" ? <OverviewPanel {...panelProps} /> : null}
          {section === "basic" ? <BasicSeoPanel {...panelProps} /> : null}
          {section === "social" ? <SocialSeoPanel {...panelProps} /> : null}
          {section === "local" ? <LocalSeoPanel {...panelProps} /> : null}
          {section === "schema" ? <SchemaPanel {...panelProps} /> : null}
          {section === "technical" ? <TechnicalSeoPanel {...panelProps} /> : null}
          {section === "analytics" ? <AnalyticsPanel {...panelProps} /> : null}
          {section === "sitemap" ? <SitemapPanel {...panelProps} /> : null}
          {section === "redirects" ? <RedirectsPanel {...panelProps} /> : null}
          {section === "health" ? (
            <>
              <HealthPanel {...panelProps} />
              <div className="mt-6 border-t border-slate-100 pt-6 dark:border-slate-800">
                <PreferencesPanel {...panelProps} />
              </div>
            </>
          ) : null}
        </main>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur dark:border-slate-800 dark:bg-slate-950/95">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-slate-500">
            {score.publishReadiness}% ready to publish · Ctrl+S to save
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => persist(true)}
              disabled={pending}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-medium hover:bg-slate-50"
            >
              Save draft
            </button>
            <Link
              href={publicSitePath(slug)}
              target="_blank"
              className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-medium hover:bg-slate-50"
            >
              Preview
            </Link>
            <button
              type="button"
              onClick={() => setSection("health")}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-medium hover:bg-slate-50"
            >
              Run SEO audit
            </button>
            <button
              type="button"
              onClick={runGenerateAi}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-violet-200 bg-violet-50 px-3 text-sm font-medium text-violet-700 hover:bg-violet-100"
            >
              <Sparkles className="h-4 w-4" />
              Generate with AI
            </button>
            <Link
              href={companyWebsiteBuilderSectionPath(slug, "publish")}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-emerald-600 px-3 text-sm font-medium text-white hover:bg-emerald-700"
            >
              Publish
            </Link>
            <button
              type="button"
              onClick={resetChanges}
              className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 px-3 text-sm font-medium hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              Reset
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => persist(true)}
              className="inline-flex h-9 items-center gap-2 rounded-md bg-[#5a8dee] px-4 text-sm font-medium text-white hover:bg-[#4a7de0] disabled:opacity-60"
            >
              <Save className="h-4 w-4" />
              {saveLabel}
            </button>
          </div>
        </div>
      </div>

      {toast ? (
        <div
          className={cn(
            "fixed bottom-20 right-4 z-50 rounded-lg px-4 py-2 text-sm shadow-lg",
            saveStatus === "error" ? "bg-red-600 text-white" : "bg-slate-900 text-white"
          )}
          role="status"
        >
          {toast}
        </div>
      ) : null}
    </div>
  );
}
