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
  updateLandingPageAction,
  updateWebsiteSeoAction,
} from "@/app/actions/website-builder";
import { BuilderLockedCard } from "@/components/website-builder/builder-locked-card";
import {
  PublicSite,
  PublicSitePreviewFrame,
} from "@/components/website-builder/public-site";
import {
  canAccessWebsiteBuilderFeature,
  publicSiteUrl,
  type WebsiteBuilderFeature,
} from "@/lib/website-builder/access";
import { publicSitePath } from "@/lib/paths/company";
import { cn } from "@/lib/utils";
import type { CompanyService } from "@/types/database";
import type { SubscriptionCompanyFields } from "@/lib/subscriptions/types";
import type {
  BuilderWebsite,
  DomainSettingsRecord,
  LandingPageContent,
  WebsiteEnquiryRecord,
  WebsiteServicePageRecord,
} from "@/types/website-builder";

export type BuilderSection =
  | "overview"
  | "pages"
  | "service-pages"
  | "contact"
  | "booking"
  | "seo"
  | "publish"
  | "domains"
  | "enquiries"
  | "preview";

type Props = {
  slug: string;
  companyId: string;
  company: SubscriptionCompanyFields;
  section: BuilderSection;
  website: BuilderWebsite | null;
  landingContent: LandingPageContent | null;
  servicePages: WebsiteServicePageRecord[];
  enquiries: WebsiteEnquiryRecord[];
  domainSettings: DomainSettingsRecord | null;
  companyServices: CompanyService[];
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
  pages: { title: "Pages", description: "Edit your landing page content." },
  "service-pages": {
    title: "Service pages",
    description: "Create dedicated pages for each service.",
  },
  contact: {
    title: "Contact form",
    description: "Public visitors can send enquiries from your site.",
  },
  booking: {
    title: "Booking button",
    description: "Customize the CTA that links to your booking flow.",
  },
  seo: { title: "SEO settings", description: "Search and social metadata." },
  publish: { title: "Publish settings", description: "Save draft, preview, or go live." },
  domains: {
    title: "Domain settings",
    description: "Your FaraiOS URL and future custom domain options.",
  },
  enquiries: { title: "Website enquiries", description: "Messages from your contact form." },
  preview: { title: "Preview", description: "See your site before publishing." },
};

export function WebsiteBuilderClient(props: Props) {
  const { slug, company, section } = props;
  const meta = SECTION_TITLES[section];
  const previewOnly =
    canAccessWebsiteBuilderFeature(company, "websiteBuilderPreview") &&
    !canAccessWebsiteBuilderFeature(company, "websiteBuilder");

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">Website</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900 sm:text-3xl">{meta.title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">{meta.description}</p>
        {previewOnly && section !== "preview" ? (
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
            Starter plan: preview only. Upgrade to Business to edit and publish your website.
          </p>
        ) : null}
      </header>

      {section === "overview" ? <OverviewSection {...props} /> : null}
      {section === "pages" ? <PagesSection {...props} /> : null}
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

function OverviewSection({
  slug,
  companyId,
  company,
  website,
  domainSettings,
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

  const publicUrl = domainSettings?.default_url ?? publicSiteUrl(slug);

  return (
    <div className="space-y-6">
      <SectionCard title="Your business website">
        {!website ? (
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

function PagesSection(props: Props) {
  const { slug, companyId, company, website, landingContent } = props;
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [content, setContent] = useState<LandingPageContent | null>(landingContent);
  const [message, setMessage] = useState<string | null>(null);

  if (!website) return <EmptyWebsite slug={slug} companyId={companyId} />;

  return (
    <Gate slug={slug} company={company} feature="websiteBuilder">
      <div className="space-y-6">
        <SectionCard title="Landing page" description="Generated from your business profile.">
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

function ServicePagesSection({
  slug,
  companyId,
  company,
  website,
  servicePages,
  companyServices,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  if (!website) return <EmptyWebsite slug={slug} companyId={companyId} />;

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

function ContactSection({ slug, company }: Props) {
  return (
    <Gate slug={slug} company={company} feature="websiteBuilder">
      <SectionCard title="Contact form fields">
        <ul className="list-inside list-disc text-sm text-slate-600">
          <li>Name (required)</li>
          <li>Email</li>
          <li>Phone</li>
          <li>Service interested in</li>
          <li>Message (required)</li>
        </ul>
        <p className="mt-4 text-sm text-slate-500">
          Enquiries are saved to your dashboard and can trigger notifications on Pro plans.
        </p>
      </SectionCard>
    </Gate>
  );
}

function BookingSection({ slug, companyId, company, website }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [label, setLabel] = useState(website?.booking_button_label ?? "Book Now");
  const [message, setMessage] = useState<string | null>(null);

  if (!website) return <EmptyWebsite slug={slug} companyId={companyId} />;

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

function SeoSection({ slug, companyId, company, website }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [seoTitle, setSeoTitle] = useState(website?.seo_title ?? "");
  const [seoDescription, setSeoDescription] = useState(website?.seo_description ?? "");
  const [seoKeywords, setSeoKeywords] = useState(website?.seo_keywords ?? "");
  const [ogTitle, setOgTitle] = useState(website?.og_title ?? "");
  const [ogDescription, setOgDescription] = useState(website?.og_description ?? "");
  const [message, setMessage] = useState<string | null>(null);

  if (!website) return <EmptyWebsite slug={slug} companyId={companyId} />;

  return (
    <Gate slug={slug} company={company} feature="websiteSeo">
      <SectionCard title="Main website SEO">
        <div className="grid gap-4 sm:grid-cols-2">
          {[
            ["SEO title", seoTitle, setSeoTitle],
            ["SEO description", seoDescription, setSeoDescription],
            ["Keywords", seoKeywords, setSeoKeywords],
            ["Open Graph title", ogTitle, setOgTitle],
            ["Open Graph description", ogDescription, setOgDescription],
          ].map(([label, value, setter]) => (
            <label key={label as string} className="block text-sm sm:col-span-2">
              <span className="font-medium text-slate-900">{label as string}</span>
              <input
                value={value as string}
                onChange={(e) => (setter as (v: string) => void)(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              />
            </label>
          ))}
        </div>
        {message ? <p className="mt-3 text-sm text-slate-600">{message}</p> : null}
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await updateWebsiteSeoAction({
                companyId,
                companySlug: slug,
                seoTitle,
                seoDescription,
                seoKeywords,
                ogTitle,
                ogDescription,
              });
              setMessage(result.ok ? "SEO settings saved." : result.error);
              if (result.ok) router.refresh();
            })
          }
          className="mt-4 rounded-xl bg-violet-600 px-4 py-2 text-sm font-medium text-white"
        >
          Save SEO
        </button>
      </SectionCard>
    </Gate>
  );
}

function PublishSection({ slug, companyId, company, website }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  if (!website) return <EmptyWebsite slug={slug} companyId={companyId} />;

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

function DomainsSection({ slug, companyId, company, website, domainSettings }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [subdomain, setSubdomain] = useState(domainSettings?.requested_subdomain ?? slug);
  const [message, setMessage] = useState<string | null>(null);
  const canReserve = canAccessWebsiteBuilderFeature(company, "websiteDomains");

  if (!website) return <EmptyWebsite slug={slug} companyId={companyId} />;

  return (
    <Gate slug={slug} company={company} feature="websiteBuilder">
      <SectionCard title="Domain settings">
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="font-medium text-slate-900">Default FaraiOS URL</dt>
            <dd className="text-slate-600">{domainSettings?.default_url ?? publicSiteUrl(slug)}</dd>
          </div>
          <div>
            <dt className="font-medium text-slate-900">Custom domain</dt>
            <dd className="text-slate-600">
              Coming soon
              {domainSettings?.custom_domain_status
                ? ` (${domainSettings.custom_domain_status.replace(/_/g, " ")})`
                : ""}
            </dd>
          </div>
        </dl>
        {canReserve ? (
          <>
            <label className="mt-4 block text-sm">
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
          <p className="mt-4 text-sm text-slate-500">
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

function PreviewSection({
  slug,
  companyId,
  company,
  website,
  landingContent,
  servicePages,
}: Props) {
  const [mode, setMode] = useState<"desktop" | "mobile">("desktop");

  if (!canAccessWebsiteBuilderFeature(company, "websiteBuilderPreview")) {
    return <BuilderLockedCard slug={slug} feature="websiteBuilderPreview" />;
  }

  if (!website || !landingContent) {
    return <EmptyWebsite slug={slug} companyId={companyId} />;
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

function EmptyWebsite({ slug, companyId }: { slug: string; companyId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <SectionCard title="Get started">
      <p className="text-sm text-slate-600">Create your website from the overview first.</p>
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
