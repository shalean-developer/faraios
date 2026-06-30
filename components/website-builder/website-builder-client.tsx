"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  ExternalLink,
  Eye,
  Globe,
  Loader2,
  Monitor,
  Smartphone,
} from "lucide-react";

import {
  deleteServicePageAction,
  initializeWebsiteBuilderAction,
  markEnquiryReadAction,
  publishWebsiteAction,
  regenerateLandingPageAction,
  saveServicePageAction,
  toggleServicePageVisibilityAction,
  updateBookingButtonAction,
  updateDomainSettingsAction,
  updateWwwRedirectAction,
  updateLandingPageAction,
} from "@/app/actions/website-builder";
import { BuilderLockedCard } from "@/components/website-builder/builder-locked-card";
import { PageBuilderEditor } from "@/components/website-builder/page-builder/page-builder-editor";
import { TemplatesSection } from "@/components/website-builder/templates-section";
import { ComponentsSection } from "@/components/website-builder/components-section";
import { MediaLibrarySection } from "@/components/website-builder/media-library-section";
import { BlogSection } from "@/components/website-builder/blog-section";
import { FormsEditor } from "@/components/website-builder/forms-editor";
import { SeoEditor } from "@/components/website-builder/seo-editor";
import { AnalyticsSection } from "@/components/website-builder/analytics-section";
import { NavigationEditor } from "@/components/website-builder/navigation-editor";
import { SettingsEditor } from "@/components/website-builder/settings-editor";
import { ThemeEditor } from "@/components/website-builder/theme-editor";
import {
  PublicSite,
  PublicSitePreviewFrame,
} from "@/components/website-builder/public-site";
import {
  canAccessWebsiteBuilderFeature,
  resolvePublicSiteUrl,
  type WebsiteBuilderFeature,
} from "@/lib/website-builder/access";
import {
  formatCustomDomainStatus,
  primaryWebsiteDomain,
} from "@/lib/website-builder/domains";
import {
  describeWwwRedirect,
  normalizeWwwRedirectMode,
  WWW_REDIRECT_OPTIONS,
  type WwwRedirectMode,
} from "@/lib/website-builder/www-redirect";
import { WebsiteDomainsPanelWithSearch } from "@/components/websites/website-domains-panel-with-search";
import type { WebsiteDomainDnsHelp } from "@/components/websites/website-domains-panel";
import { publicSitePath, companyWebsiteBuilderSectionPath } from "@/lib/paths/company";
import { cn } from "@/lib/utils";
import type { CompanyService, CompanyWithIndustry } from "@/types/database";
import type { SubscriptionCompanyFields } from "@/lib/subscriptions/types";
import type {
  BuilderWebsite,
  DomainSettingsRecord,
  LandingPageContent,
  WebsiteEnquiryRecord,
  WebsiteServicePageRecord,
} from "@/types/website-builder";
import type { WebsiteComponentRecord } from "@/types/website-builder-components";
import type { WebsiteMediaRecord } from "@/types/website-builder-media";
import type { ContentPost } from "@/types/growth-engine";
import type { ContentPostSummary } from "@/lib/services/content-posts";
import type { BlogCategory, BlogTag } from "@/types/website-builder-blog";
import type { BuilderAnalytics } from "@/types/website-builder-analytics";
import type { PublishSnapshotSummary } from "@/types/website-builder-settings";
import type { WebsiteDnsRecord, WebsiteDomain } from "@/types/website-engine";
import type { HostingPlanRow } from "@/types/hosting-automation";
import type { DomainPurchaseNotice } from "@/lib/services/domain-purchase-notice";
import type { DomainDnsGuidance } from "@/lib/hosting/external-dns-guidance";
import type { WebsiteEditorChoice } from "@/lib/websites/editor-choice";
import { WebsiteEditorChoicePanel } from "@/components/websites/website-editor-choice";
import { WebsiteContentEditor } from "@/components/websites/website-content-editor";
import { isModernOverlayWebsite } from "@/lib/website-templates/modern-overlay";
import type { WebsiteContent } from "@/types/database";

export type BuilderSection =
  | "overview"
  | "pages"
  | "page-builder"
  | "homepage-sections"
  | "templates"
  | "components"
  | "theme"
  | "media"
  | "navigation"
  | "service-pages"
  | "contact"
  | "booking"
  | "seo"
  | "blog"
  | "analytics"
  | "publish"
  | "domains"
  | "enquiries"
  | "preview"
  | "settings";

type Props = {
  slug: string;
  companyId: string;
  company: SubscriptionCompanyFields & CompanyWithIndustry;
  section: BuilderSection;
  website: BuilderWebsite | null;
  landingContent: LandingPageContent | null;
  servicePages: WebsiteServicePageRecord[];
  enquiries: WebsiteEnquiryRecord[];
  domainSettings: DomainSettingsRecord | null;
  websiteDomains: WebsiteDomain[];
  dnsByDomain: Record<string, WebsiteDnsRecord[]>;
  domainDnsHelp: WebsiteDomainDnsHelp | null;
  companyServices: CompanyService[];
  savedComponents?: WebsiteComponentRecord[];
  mediaItems?: WebsiteMediaRecord[];
  contentPosts?: ContentPost[];
  contentSummary?: ContentPostSummary;
  blogCategories?: BlogCategory[];
  blogTags?: BlogTag[];
  postTagIds?: Record<string, string[]>;
  blogTaxonomyReady?: boolean;
  builderAnalytics?: BuilderAnalytics | null;
  publishSnapshots?: PublishSnapshotSummary[];
  hostingPlans?: HostingPlanRow[];
  billingEmail?: string | null;
  domainPurchaseNotice?: DomainPurchaseNotice | null;
  domainDnsGuidanceById?: Record<string, DomainDnsGuidance>;
  editorChoice?: WebsiteEditorChoice;
  classicContentRows?: WebsiteContent[];
  classicWebsiteMeta?: { id: string; template: string | null; industry: string | null } | null;
};

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-5 py-4">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function Gate({
  slug,
  company,
  feature,
  children,
}: {
  slug: string;
  company: SubscriptionCompanyFields;
  feature: WebsiteBuilderFeature;
  children: React.ReactNode;
}) {
  if (!canAccessWebsiteBuilderFeature(company, feature)) {
    return (
      <div className="py-8">
        <BuilderLockedCard slug={slug} feature={feature} />
      </div>
    );
  }
  return <>{children}</>;
}

const SECTION_TITLES: Record<BuilderSection, { title: string; description: string }> = {
  overview: {
    title: "Website builder",
    description: "Generate a public business website from your profile.",
  },
  pages: { title: "Pages", description: "Manage site pages and open the visual page builder." },
  "page-builder": {
    title: "Page Builder",
    description: "Drag-and-drop sections with live split-screen preview.",
  },
  "homepage-sections": {
    title: "Homepage sections",
    description:
      "Edit construction template sections — Dreams Into Reality, Clients Love Us, and more.",
  },
  templates: { title: "Templates", description: "Industry templates library." },
  components: { title: "Components", description: "Reusable blocks saved across pages." },
  theme: { title: "Theme", description: "Site-wide colors, fonts, and layout." },
  media: { title: "Media Library", description: "Upload and organize images and files." },
  navigation: { title: "Navigation", description: "Header, footer, and menu structure." },
  "service-pages": {
    title: "Service pages",
    description: "Create dedicated pages for each service.",
  },
  contact: {
    title: "Forms",
    description: "Public visitors can send enquiries from your site.",
  },
  booking: {
    title: "Booking",
    description: "Customize the CTA that links to your booking flow.",
  },
  seo: { title: "Site SEO", description: "Page titles, meta tags, and social previews for your website." },
  blog: { title: "Blog", description: "Blog posts and categories." },
  analytics: { title: "Analytics", description: "Page views, conversions, and performance." },
  publish: { title: "Publishing", description: "Save draft, preview, or go live." },
  domains: {
    title: "Domains",
    description: "Your FaraiOS URL and custom domain options.",
  },
  enquiries: { title: "Website enquiries", description: "Messages from your contact form." },
  preview: { title: "Preview", description: "See your site before publishing." },
  settings: { title: "Settings", description: "Builder preferences and advanced options." },
};

export function WebsiteBuilderClient(props: Props) {
  const {
    slug,
    company,
    section,
    savedComponents = [],
    mediaItems = [],
    contentPosts = [],
    contentSummary = { total: 0, drafts: 0, published: 0, byCategory: { blog: 0, guide: 0, service_article: 0, faq: 0 } },
    blogCategories = [],
    blogTags = [],
    postTagIds = {},
    blogTaxonomyReady = true,
  } = props;
  const meta = SECTION_TITLES[section];
  const previewOnly =
    canAccessWebsiteBuilderFeature(company, "websiteBuilderPreview") &&
    !canAccessWebsiteBuilderFeature(company, "websiteBuilder");

  const isCompactBuilder =
    section === "page-builder" ||
    section === "navigation" ||
    section === "contact" ||
    section === "seo";

  return (
    <div
      className={cn(
        "bg-[#f0f2f5]",
        isCompactBuilder ? "px-2 py-2 sm:px-3" : "px-4 py-4 sm:px-5 sm:py-5"
      )}
    >
      {isCompactBuilder ? (
        <div className="mb-2 px-1">
          <h1 className="text-base font-medium text-slate-800">{meta.title}</h1>
        </div>
      ) : (
        <div className="mb-4 rounded-xl border border-slate-200 bg-white px-4 py-4 shadow-sm sm:px-5">
          <h1 className="text-lg font-medium text-slate-800">{meta.title}</h1>
          <p className="mt-1 text-sm text-slate-500">{meta.description}</p>
          {previewOnly && section !== "preview" ? (
            <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Starter plan: preview only. Upgrade to Business to edit and publish your website.
            </p>
          ) : null}
        </div>
      )}

      {section === "overview" ? <OverviewSection {...props} /> : null}
      {section === "pages" ? <PagesSection {...props} /> : null}
      {section === "page-builder" ? <PageBuilderSection {...props} /> : null}
      {section === "homepage-sections" ? <HomepageSectionsSection {...props} /> : null}
      {section === "theme" ? <ThemeSection {...props} /> : null}
      {section === "templates" ? (
        <TemplatesSection {...props} companyServices={props.companyServices} />
      ) : null}
      {section === "components" ? (
        <ComponentsSection {...props} savedComponents={savedComponents} />
      ) : null}
      {section === "media" ? (
        <MediaLibrarySection {...props} mediaItems={mediaItems} />
      ) : null}
      {section === "navigation" ? <NavigationSection {...props} /> : null}
      {section === "blog" ? (
        <BlogSection
          slug={slug}
          companyId={props.companyId}
          company={company}
          website={props.website}
          mediaItems={mediaItems}
          posts={contentPosts}
          summary={contentSummary}
          categories={blogCategories}
          tags={blogTags}
          postTagIds={postTagIds}
          taxonomyReady={blogTaxonomyReady}
        />
      ) : null}
      {section === "analytics" ? <AnalyticsSectionWrapper {...props} /> : null}
      {section === "settings" ? <SettingsSection {...props} /> : null}
      {section === "service-pages" ? <ServicePagesSection {...props} /> : null}
      {section === "contact" ? <ContactSection {...props} /> : null}
      {section === "booking" ? <BookingSection {...props} /> : null}
      {section === "seo" ? <SeoSection {...props} /> : null}
      {section === "publish" ? <PublishSection {...props} /> : null}
      {section === "domains" ? <DomainsSection {...props} /> : null}
      {section === "enquiries" ? <EnquiriesSection {...props} /> : null}
      {section === "preview" ? <PreviewSection {...props} /> : null}
    </div>
  );
}

function emptyWebsiteState({
  slug,
  companyId,
  editorChoice,
}: Pick<Props, "slug" | "companyId" | "editorChoice">) {
  return <EmptyWebsite slug={slug} companyId={companyId} editorChoice={editorChoice} />;
}

function OverviewSection({
  slug,
  companyId,
  company,
  website,
  domainSettings,
  editorChoice,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const canBuild = canAccessWebsiteBuilderFeature(company, "websiteBuilder");
  const canPreview = canAccessWebsiteBuilderFeature(company, "websiteBuilderPreview");

  if (!canPreview) {
    return <BuilderLockedCard slug={slug} feature="websiteBuilderPreview" />;
  }

  async function onCreate() {
    setError(null);
    startTransition(async () => {
      const result = await initializeWebsiteBuilderAction({ companyId, companySlug: slug });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  const publicUrl = resolvePublicSiteUrl(slug, domainSettings?.default_url);

  return (
    <div className="space-y-6">
      <SectionCard title="Your business website">
        {!website ? (
          editorChoice?.legacy || editorChoice?.builder ? (
            <WebsiteEditorChoicePanel
              slug={slug}
              companyId={companyId}
              editorChoice={editorChoice ?? { legacy: null, builder: null }}
            />
          ) : (
          <div className="text-center">
            <p className="text-sm text-slate-600">
              Generate a landing page using your business profile, services, and brand colors.
            </p>
            {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
            <button
              type="button"
              disabled={pending || !canBuild}
              onClick={onCreate}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Globe className="h-4 w-4" />}
              {canBuild ? "Create website from profile" : "Preview only on Starter"}
            </button>
          </div>
          )
        ) : (
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-semibold uppercase text-slate-500">Status</dt>
              <dd className="mt-1 capitalize text-slate-900">{website.status}</dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-slate-500">Public URL</dt>
              <dd className="mt-1">
                <a
                  href={publicUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-sm font-medium text-violet-700 hover:text-violet-900"
                >
                  {publicUrl}
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold uppercase text-slate-500">Last updated</dt>
              <dd className="mt-1 text-slate-900">
                {new Date(website.updated_at).toLocaleString()}
              </dd>
            </div>
            {website.published_at ? (
              <div>
                <dt className="text-xs font-semibold uppercase text-slate-500">Published</dt>
                <dd className="mt-1 text-slate-900">
                  {new Date(website.published_at).toLocaleString()}
                </dd>
              </div>
            ) : null}
          </dl>
        )}
      </SectionCard>
    </div>
  );
}

function BuilderPlaceholderSection({ section }: { section: BuilderSection }) {
  const copy: Record<string, string> = {
    templates: "Browse and apply industry templates (cleaning, plumbing, salon, and more).",
    components: "Save hero, footer, FAQ, and CTA blocks to reuse across pages.",
    media: "Upload, crop, tag, and organize images and files.",
    navigation: "Edit header, footer, dropdowns, and mobile menus.",
  };
  return (
    <section className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
      <p className="text-sm font-medium text-slate-800">{SECTION_TITLES[section].title}</p>
      <p className="mx-auto mt-2 max-w-lg text-sm text-slate-500">{copy[section]}</p>
      <p className="mt-4 text-xs text-slate-400">Phase 3 of Website Builder V2 — see docs/website-builder-v2-upgrade.md</p>
    </section>
  );
}

function HomepageSectionsSection({
  slug,
  classicContentRows = [],
  classicWebsiteMeta,
}: Props) {
  if (!classicWebsiteMeta?.id) {
    return (
      <SectionCard title="No homepage template" description="Create a website first from the overview.">
        <p className="text-sm text-slate-600">
          Homepage section editing is available for construction-style templates.
        </p>
      </SectionCard>
    );
  }

  const modernOverlay = isModernOverlayWebsite(
    classicWebsiteMeta.template,
    classicContentRows
  );

  if (!modernOverlay) {
    return (
      <SectionCard title="Classic template only" description="This layout does not use construction homepage sections.">
        <Link
          href={`/${encodeURIComponent(slug)}/dashboard/websites/${encodeURIComponent(classicWebsiteMeta.id)}/edit`}
          className="text-sm font-medium text-violet-700 hover:text-violet-900"
        >
          Open classic content editor →
        </Link>
      </SectionCard>
    );
  }

  return (
    <WebsiteContentEditor
      websiteId={classicWebsiteMeta.id}
      companySlug={slug}
      previewPath={`/preview/${classicWebsiteMeta.id}`}
      websiteIndustry={classicWebsiteMeta.industry ?? undefined}
      websiteTemplate={classicWebsiteMeta.template ?? undefined}
      contentRows={classicContentRows}
      embedded
    />
  );
}

function PageBuilderSection(props: Props) {
  const {
    slug,
    companyId,
    company,
    website,
    landingContent,
    servicePages,
    savedComponents = [],
  } = props;
  if (!website) return emptyWebsiteState(props);
  if (!landingContent) {
    return (
      <p className="text-sm text-slate-600">Create your website first, then open the page builder.</p>
    );
  }
  return (
    <Gate slug={slug} company={company} feature="websiteBuilder">
      <PageBuilderEditor
        slug={slug}
        companyId={companyId}
        company={company}
        website={website}
        landingContent={landingContent}
        servicePages={servicePages}
        savedComponents={savedComponents}
      />
    </Gate>
  );
}

function ThemeSection(props: Props) {
  const { slug, companyId, company, website } = props;
  if (!website) return emptyWebsiteState(props);
  return (
    <Gate slug={slug} company={company} feature="websiteBuilder">
      <ThemeEditor slug={slug} companyId={companyId} website={website} />
    </Gate>
  );
}

function NavigationSection(props: Props) {
  const { slug, companyId, company, website, landingContent, servicePages } = props;
  if (!website) return emptyWebsiteState(props);
  return (
    <Gate slug={slug} company={company} feature="websiteBuilder">
      <NavigationEditor
        slug={slug}
        companyId={companyId}
        website={website}
        companyName={website.title}
        landingContent={landingContent}
        servicePages={servicePages}
      />
    </Gate>
  );
}

function SettingsSection(props: Props) {
  const { slug, companyId, company, website, domainSettings, publishSnapshots = [] } = props;
  if (!website) return emptyWebsiteState(props);
  return (
    <Gate slug={slug} company={company} feature="websiteBuilder">
      <SettingsEditor
        slug={slug}
        companyId={companyId}
        website={website}
        domainSettings={domainSettings}
        publishSnapshots={publishSnapshots}
      />
    </Gate>
  );
}

function PagesSection(props: Props) {
  const { slug, companyId, company, website, landingContent } = props;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [content, setContent] = useState<LandingPageContent | null>(landingContent);
  const [message, setMessage] = useState<string | null>(null);

  if (!website) return emptyWebsiteState(props);

  return (
    <Gate slug={slug} company={company} feature="websiteBuilder">
      <div className="space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-slate-600">
            Use the visual page builder for drag-and-drop sections, hero settings, and live preview.
          </p>
          <Link
            href={companyWebsiteBuilderSectionPath(slug, "page-builder")}
            className="mt-3 inline-flex rounded-md bg-[#5a8dee] px-4 py-2 text-sm font-medium text-white hover:bg-[#4a7de0]"
          >
            Open Page Builder
          </Link>
        </div>
        <SectionCard title="Landing page" description="Quick text edits (legacy).">
          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await regenerateLandingPageAction({ companyId, companySlug: slug });
                  setMessage(result.ok ? "Landing page regenerated." : result.error);
                  if (result.ok) router.refresh();
                })
              }
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Regenerate from profile
            </button>
          </div>
          {content ? (
            <div className="space-y-4">
              <label className="block text-sm">
                <span className="font-medium text-slate-900">Hero headline</span>
                <input
                  value={content.hero.headline}
                  onChange={(e) =>
                    setContent({ ...content, hero: { ...content.hero, headline: e.target.value } })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-900">Hero subheadline</span>
                <textarea
                  rows={2}
                  value={content.hero.subheadline}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      hero: { ...content.hero, subheadline: e.target.value },
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-900">About</span>
                <textarea
                  rows={4}
                  value={content.about.body}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      about: { ...content.about, body: e.target.value },
                    })
                  }
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                />
              </label>
            </div>
          ) : null}
          {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
          <button
            type="button"
            disabled={pending || !content}
            onClick={() =>
              startTransition(async () => {
                if (!content) return;
                const result = await updateLandingPageAction({
                  companyId,
                  companySlug: slug,
                  content,
                });
                setMessage(result.ok ? "Page saved." : result.error);
                if (result.ok) router.refresh();
              })
            }
            className="mt-4 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700 disabled:opacity-60"
          >
            Save draft
          </button>
        </SectionCard>
      </div>
    </Gate>
  );
}

function ServicePagesSection(props: Props) {
  const {
    slug,
    companyId,
    company,
    website,
    servicePages,
    companyServices,
  } = props;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  if (!website) return emptyWebsiteState(props);

  return (
    <Gate slug={slug} company={company} feature="websiteServicePages">
      <div className="space-y-6">
        <SectionCard title="Service pages">
          {servicePages.length === 0 ? (
            <p className="text-sm text-slate-600">No service pages yet.</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {servicePages.map((page) => (
                <li key={page.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div>
                    <p className="font-medium text-slate-900">{page.title}</p>
                    <p className="text-xs capitalize text-slate-500">{page.status}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          const next =
                            page.status === "published" ? "unpublished" : "published";
                          const result = await toggleServicePageVisibilityAction({
                            companyId,
                            companySlug: slug,
                            id: page.id,
                            status: next,
                          });
                          setMessage(result.ok ? "Updated." : result.error);
                          if (result.ok) router.refresh();
                        })
                      }
                      className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium"
                    >
                      {page.status === "published" ? "Hide" : "Publish"}
                    </button>
                    {page.status === "draft" ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() =>
                          startTransition(async () => {
                            const result = await deleteServicePageAction({
                              companyId,
                              companySlug: slug,
                              id: page.id,
                            });
                            setMessage(result.ok ? "Deleted." : result.error);
                            if (result.ok) router.refresh();
                          })
                        }
                        className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700"
                      >
                        Delete draft
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
          {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
        </SectionCard>

        <SectionCard title="Add service page" description="Create from an existing service.">
          <div className="space-y-3">
            {companyServices.slice(0, 8).map((service) => {
              const exists = servicePages.some((p) => p.service_id === service.id);
              return (
                <div
                  key={service.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-100 px-4 py-3"
                >
                  <div>
                    <p className="font-medium text-slate-900">{service.name}</p>
                    <p className="text-xs text-slate-500">{service.description?.slice(0, 80)}</p>
                  </div>
                  <button
                    type="button"
                    disabled={pending || exists}
                    onClick={() =>
                      startTransition(async () => {
                        const price =
                          service.base_price_cents > 0
                            ? `R${Math.round(service.base_price_cents / 100)}`
                            : undefined;
                        const result = await saveServicePageAction({
                          companyId,
                          companySlug: slug,
                          serviceId: service.id,
                          title: service.name,
                          slug: service.name,
                          description: service.description ?? undefined,
                          startingPrice: price,
                          benefits: ["Professional service", "Transparent pricing", "Easy booking"],
                          faqs: [],
                        });
                        setMessage(result.ok ? "Service page created." : result.error);
                        if (result.ok) router.refresh();
                      })
                    }
                    className="rounded-lg bg-violet-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50"
                  >
                    {exists ? "Added" : "Add page"}
                  </button>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>
    </Gate>
  );
}

function ContactSection(props: Props) {
  const { slug, companyId, company, website, landingContent, servicePages } = props;
  if (!website) return emptyWebsiteState(props);
  return (
    <Gate slug={slug} company={company} feature="websiteBuilder">
      <FormsEditor
        slug={slug}
        companyId={companyId}
        website={website}
        landingContent={landingContent}
        servicePages={servicePages}
      />
    </Gate>
  );
}

function BookingSection(props: Props) {
  const { slug, companyId, company, website } = props;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [label, setLabel] = useState(website?.booking_button_label ?? "Book Now");
  const [message, setMessage] = useState<string | null>(null);

  if (!website) return emptyWebsiteState(props);

  const presets = ["Book Now", "Request a Quote", "Schedule Appointment"];

  return (
    <Gate slug={slug} company={company} feature="websiteBuilder">
      <SectionCard title="Booking CTA">
        <p className="text-sm text-slate-600">
          Links to your existing booking flow and preserves the selected service on service pages.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {presets.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setLabel(preset)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium",
                label === preset
                  ? "border-violet-300 bg-violet-50 text-violet-800"
                  : "border-slate-200 text-slate-600"
              )}
            >
              {preset}
            </button>
          ))}
        </div>
        <label className="mt-4 block text-sm">
          <span className="font-medium text-slate-900">Button label</span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="mt-1 w-full max-w-sm rounded-xl border border-slate-200 px-3 py-2"
          />
        </label>
        {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await updateBookingButtonAction({
                companyId,
                companySlug: slug,
                label,
              });
              setMessage(result.ok ? "Button label saved." : result.error);
              if (result.ok) router.refresh();
            })
          }
          className="mt-4 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-700"
        >
          Save
        </button>
      </SectionCard>
    </Gate>
  );
}

function AnalyticsSectionWrapper(props: Props) {
  const { slug, companyId, company, website, builderAnalytics } = props;
  if (!website) return emptyWebsiteState(props);
  if (!builderAnalytics) {
    return (
      <p className="text-sm text-slate-600">Loading analytics…</p>
    );
  }
  return (
    <Gate slug={slug} company={company} feature="websiteBuilder">
      <AnalyticsSection
        slug={slug}
        company={company}
        website={website}
        analytics={builderAnalytics}
      />
    </Gate>
  );
}

function SeoSection(props: Props) {
  const {
    slug,
    companyId,
    company,
    website,
    landingContent,
    servicePages,
    mediaItems = [],
    domainSettings,
  } = props;
  if (!website) return emptyWebsiteState(props);
  return (
    <Gate slug={slug} company={company} feature="websiteSeo">
      <SeoEditor
        slug={slug}
        companyId={companyId}
        company={company as CompanyWithIndustry}
        website={website}
        landingContent={landingContent}
        servicePages={servicePages}
        mediaItems={mediaItems}
        domainSettings={domainSettings}
      />
    </Gate>
  );
}

function PublishSection(props: Props) {
  const { slug, companyId, company, website } = props;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  if (!website) return emptyWebsiteState(props);

  return (
    <Gate slug={slug} company={company} feature="websitePublish">
      <SectionCard title="Publish status">
        <p className="text-sm text-slate-600">
          Current status: <span className="font-semibold capitalize">{website.status}</span>
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {(["draft", "published", "unpublished"] as const).map((status) => (
            <button
              key={status}
              type="button"
              disabled={pending || website.status === status}
              onClick={() =>
                startTransition(async () => {
                  const result = await publishWebsiteAction({
                    companyId,
                    companySlug: slug,
                    status,
                  });
                  setMessage(result.ok ? `Status set to ${status}.` : result.error);
                  if (result.ok) router.refresh();
                })
              }
              className={cn(
                "rounded-xl px-4 py-2 text-sm font-medium capitalize",
                website.status === status
                  ? "bg-violet-600 text-white"
                  : "border border-slate-200 text-slate-700 hover:bg-slate-50"
              )}
            >
              {status}
            </button>
          ))}
        </div>
        <Link
          href={publicSitePath(slug)}
          target="_blank"
          className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-violet-700"
        >
          <Eye className="h-4 w-4" />
          View public URL
        </Link>
        {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
      </SectionCard>
    </Gate>
  );
}

function DomainsSection({
  slug,
  companyId,
  company,
  website,
  domainSettings,
  websiteDomains,
  dnsByDomain,
  domainDnsHelp,
  hostingPlans,
  billingEmail,
  domainPurchaseNotice,
  domainDnsGuidanceById,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [subdomain, setSubdomain] = useState(domainSettings?.requested_subdomain ?? slug);
  const [wwwRedirect, setWwwRedirect] = useState<WwwRedirectMode>(
    normalizeWwwRedirectMode(domainSettings?.www_redirect)
  );
  const [message, setMessage] = useState<string | null>(null);
  const [redirectMessage, setRedirectMessage] = useState<string | null>(null);
  const canReserve = canAccessWebsiteBuilderFeature(company, "websiteDomains");
  const primaryDomain = primaryWebsiteDomain(websiteDomains);
  const customDomainLabel =
    primaryDomain?.domain ??
    (domainSettings?.custom_domain &&
    domainSettings.custom_domain_status !== "coming_soon"
      ? domainSettings.custom_domain
      : null);
  const customDomainStatus = primaryDomain
    ? primaryDomain.verification_status
    : domainSettings?.custom_domain_status;
  const showCustomDomainStatus =
    customDomainStatus &&
    customDomainStatus !== "not_connected" &&
    customDomainStatus !== "coming_soon";

  return (
    <Gate slug={slug} company={company} feature="websiteBuilder">
      <SectionCard title="Domain settings">
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="font-medium text-slate-900">Default FaraiOS URL</dt>
            <dd className="text-slate-600">
              <a
                href={resolvePublicSiteUrl(slug, domainSettings?.default_url)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-violet-700 hover:text-violet-900"
              >
                {resolvePublicSiteUrl(slug, domainSettings?.default_url)}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </dd>
          </div>
          <div>
            <dt className="font-medium text-slate-900">Custom domain</dt>
            <dd className="text-slate-600">
              {customDomainLabel ? (
                <>
                  {customDomainLabel}
                  {showCustomDomainStatus ? (
                    <span className="text-slate-500">
                      {" "}
                      ({formatCustomDomainStatus(customDomainStatus)})
                    </span>
                  ) : null}
                </>
              ) : (
                "Not connected"
              )}
            </dd>
          </div>
        </dl>

        <div className="mt-6 border-t border-slate-100 pt-6">
          <WebsiteDomainsPanelWithSearch
            companyId={companyId}
            slug={slug}
            domains={websiteDomains}
            dnsByDomain={dnsByDomain}
            websiteId={website?.id}
            variant="embedded"
            dnsHelp={domainDnsHelp}
            hostingPlans={hostingPlans}
            billingEmail={billingEmail}
            domainPurchaseNotice={domainPurchaseNotice}
            domainDnsGuidanceById={domainDnsGuidanceById}
          />
        </div>

        {customDomainLabel ? (
          <div className="mt-6 border-t border-slate-100 pt-6">
            <h3 className="text-sm font-semibold text-slate-900">WWW redirect</h3>
            <p className="mt-1 text-sm text-slate-500">
              {describeWwwRedirect(wwwRedirect, customDomainLabel)}
            </p>
            <div className="mt-3 space-y-2">
              {WWW_REDIRECT_OPTIONS.map((option) => (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 px-3 py-3 hover:bg-slate-50"
                >
                  <input
                    type="radio"
                    name="www-redirect"
                    value={option.value}
                    checked={wwwRedirect === option.value}
                    onChange={() => setWwwRedirect(option.value)}
                    className="mt-1"
                  />
                  <span>
                    <span className="block text-sm font-medium text-slate-900">{option.label}</span>
                    <span className="block text-xs text-slate-500">{option.description}</span>
                  </span>
                </label>
              ))}
            </div>
            {redirectMessage ? (
              <p
                className={cn(
                  "mt-3 text-sm",
                  redirectMessage.includes("migration") || redirectMessage.includes("Upgrade")
                    ? "text-amber-700"
                    : redirectMessage.endsWith("saved.")
                      ? "text-emerald-700"
                      : "text-red-600"
                )}
              >
                {redirectMessage}
              </p>
            ) : null}
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await updateWwwRedirectAction({
                    companyId,
                    companySlug: slug,
                    wwwRedirect,
                  });
                  setRedirectMessage(result.ok ? "WWW redirect saved." : result.error);
                  if (result.ok) router.refresh();
                })
              }
              className="mt-4 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white"
            >
              Save WWW redirect
            </button>
          </div>
        ) : null}

        {canReserve ? (
          <>
            <label className="mt-6 block border-t border-slate-100 pt-6 text-sm">
              <span className="font-medium text-slate-900">Reserve preferred subdomain</span>
              <input
                value={subdomain}
                onChange={(e) => setSubdomain(e.target.value)}
                placeholder="your-business"
                className="mt-1 w-full max-w-sm rounded-xl border border-slate-200 px-3 py-2"
              />
              <p className="mt-1 text-xs text-slate-500">
                Example: {subdomain || "business"}.faraios.com (future)
              </p>
            </label>
            {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await updateDomainSettingsAction({
                    companyId,
                    companySlug: slug,
                    requestedSubdomain: subdomain,
                  });
                  setMessage(result.ok ? "Subdomain preference saved." : result.error);
                  if (result.ok) router.refresh();
                })
              }
              className="mt-4 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white"
            >
              Save preference
            </button>
          </>
        ) : (
          <p className="mt-6 border-t border-slate-100 pt-6 text-sm text-slate-500">
            Subdomain reservation is available on Enterprise. Your public URL is ready to use today.
          </p>
        )}
      </SectionCard>
    </Gate>
  );
}

function EnquiriesSection({ slug, companyId, company, enquiries }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Gate slug={slug} company={company} feature="websiteEnquiries">
      <SectionCard title="Recent enquiries">
        {enquiries.length === 0 ? (
          <p className="text-sm text-slate-600">No enquiries yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {enquiries.map((enquiry) => (
              <li key={enquiry.id} className="py-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{enquiry.name}</p>
                    <p className="text-xs text-slate-500">
                      {enquiry.email ?? enquiry.phone ?? "No contact"} ·{" "}
                      {new Date(enquiry.created_at).toLocaleString()}
                    </p>
                    {enquiry.service_interest ? (
                      <p className="mt-1 text-xs text-violet-700">{enquiry.service_interest}</p>
                    ) : null}
                    {enquiry.message ? (
                      <p className="mt-2 text-sm text-slate-600">{enquiry.message}</p>
                    ) : null}
                  </div>
                  {enquiry.status === "new" ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          await markEnquiryReadAction({
                            companyId,
                            companySlug: slug,
                            enquiryId: enquiry.id,
                          });
                          router.refresh();
                        })
                      }
                      className="rounded-lg border border-slate-200 px-3 py-1 text-xs font-medium"
                    >
                      Mark read
                    </button>
                  ) : (
                    <span className="text-xs capitalize text-slate-400">{enquiry.status}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </Gate>
  );
}

function PreviewSection(props: Props) {
  const {
    slug,
    companyId,
    company,
    website,
    landingContent,
    servicePages,
  } = props;
  const [mode, setMode] = useState<"desktop" | "mobile">("desktop");

  if (!canAccessWebsiteBuilderFeature(company, "websiteBuilderPreview")) {
    return <BuilderLockedCard slug={slug} feature="websiteBuilderPreview" />;
  }

  if (!website || !landingContent) {
    return emptyWebsiteState(props);
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("desktop")}
          className={cn(
            "inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-medium",
            mode === "desktop" ? "bg-violet-600 text-white" : "border border-slate-200"
          )}
        >
          <Monitor className="h-4 w-4" />
          Desktop
        </button>
        <button
          type="button"
          onClick={() => setMode("mobile")}
          className={cn(
            "inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-medium",
            mode === "mobile" ? "bg-violet-600 text-white" : "border border-slate-200"
          )}
        >
          <Smartphone className="h-4 w-4" />
          Mobile
        </button>
      </div>
      <PublicSitePreviewFrame mode={mode}>
        <PublicSite
          companySlug={slug}
          companyId={companyId}
          companyName={website.title}
          website={website}
          landing={landingContent}
          servicePages={servicePages.filter((p) => p.status === "published")}
          preview
        />
      </PublicSitePreviewFrame>
    </div>
  );
}

function EmptyWebsite({
  slug,
  companyId,
  editorChoice,
}: {
  slug: string;
  companyId: string;
  editorChoice?: WebsiteEditorChoice;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const choice = editorChoice ?? { legacy: null, builder: null };

  if (choice.legacy || choice.builder) {
    return (
      <WebsiteEditorChoicePanel slug={slug} companyId={companyId} editorChoice={choice} />
    );
  }

  return (
    <SectionCard title="Get started">
      <p className="text-sm text-slate-600">
        Create your website from the overview, or choose an editor on the Websites hub.
      </p>
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            await initializeWebsiteBuilderAction({ companyId, companySlug: slug });
            router.refresh();
          })
        }
        className="mt-4 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white"
      >
        Create website
      </button>
    </SectionCard>
  );
}
