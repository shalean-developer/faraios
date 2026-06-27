"use client";

import type {
  BuilderWebsite,
  LandingPageContent,
  WebsiteServicePageRecord,
} from "@/types/website-builder";
import type { BuilderViewport, WebsitePageContentV2 } from "@/types/website-builder-sections";
import { getPageSections } from "@/lib/website-builder/page-sections";
import { publicBookPath } from "@/lib/paths/company";
import { cn } from "@/lib/utils";

import { PublicContactForm } from "./public-contact-form";
import { PublicSiteTracking } from "./public-site-tracking";
import { PublicSiteChrome, PublicSiteFooter } from "./public-site-chrome";
import { getContactFormSettings } from "@/lib/website-builder/forms";
import { getNavigationSettings } from "@/lib/website-builder/navigation";
import { getBuilderSettings } from "@/lib/website-builder/settings";
import { WebsiteSectionRenderer } from "./sections/website-section-renderer";
import type { ContentPost } from "@/types/growth-engine";

type PublicSiteProps = {
  companySlug: string;
  companyId: string;
  companyName: string;
  website: BuilderWebsite;
  landing: LandingPageContent | null;
  servicePage?: WebsiteServicePageRecord | null;
  servicePages?: WebsiteServicePageRecord[];
  contentPosts?: ContentPost[];
  preview?: boolean;
  chromeViewport?: "desktop" | "mobile";
  previewViewport?: BuilderViewport;
};

export function PublicSite({
  companySlug,
  companyId,
  companyName,
  website,
  landing,
  servicePage,
  servicePages = [],
  contentPosts = [],
  preview = false,
  chromeViewport = "desktop",
  previewViewport,
}: PublicSiteProps) {
  const theme = website.theme_settings ?? {};
  const primary =
    typeof theme.primaryColor === "string" ? theme.primaryColor : "#6366f1";
  const accent =
    typeof theme.accentColor === "string" ? theme.accentColor : "#4f46e5";
  const logoUrl =
    typeof theme.logoUrl === "string" ? theme.logoUrl : null;
  const bookingLabel = website.booking_button_label || "Book Now";

  const bookingBase = publicBookPath(companyId);
  const bookingHref = servicePage?.service_id
    ? `${bookingBase}?service=${encodeURIComponent(servicePage.service_id)}`
    : bookingBase;

  const navigation = getNavigationSettings({
    website,
    landing,
    servicePages,
    companySlug,
    companyName,
  });

  const formSettings = getContactFormSettings({ website, landing });
  const builderSettings = getBuilderSettings({
    website,
    bookingEnabled: website.booking_enabled,
  });
  const trackingNode =
    preview || !builderSettings.integrations.nativeAnalyticsEnabled ? null : (
      <PublicSiteTracking companyId={companyId} websiteId={website.id} preview={preview} />
    );

  if (servicePage) {
    return (
      <div className="min-h-screen bg-white text-slate-900">
        {trackingNode}
        {preview ? (
          <div className="bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-800">
            Preview mode — this page is not visible to the public until published.
          </div>
        ) : null}
        {navigation.header.enabled ? (
          <PublicSiteChrome
            website={website}
            companySlug={companySlug}
            companyId={companyId}
            companyName={companyName}
            landing={landing}
            servicePages={servicePages}
            navigation={navigation}
            preview={preview}
            viewport={chromeViewport}
          />
        ) : (
          <header className="border-b border-slate-100 px-4 py-4 sm:px-8">
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
              <a href={`/site/${companySlug}`} className="font-semibold text-slate-900">
                {companyName}
              </a>
              <a
                href={bookingHref}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
                style={{ backgroundColor: primary }}
              >
                {bookingLabel}
              </a>
            </div>
          </header>
        )}
        <main className="mx-auto max-w-5xl px-4 py-10 sm:px-8">
          {servicePage.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={servicePage.image_url}
              alt={servicePage.title}
              className="mb-8 h-64 w-full rounded-2xl object-cover"
            />
          ) : null}
          <h1 className="text-3xl font-bold text-slate-900">{servicePage.title}</h1>
          {servicePage.starting_price ? (
            <p className="mt-2 text-lg font-medium" style={{ color: accent }}>
              From {servicePage.starting_price}
              {servicePage.duration ? ` · ${servicePage.duration}` : ""}
            </p>
          ) : null}
          {servicePage.description ? (
            <p className="mt-6 text-slate-600">{servicePage.description}</p>
          ) : null}
          {servicePage.benefits?.length ? (
            <section className="mt-10">
              <h2 className="text-xl font-semibold text-slate-900">Benefits</h2>
              <ul className="mt-4 space-y-2">
                {servicePage.benefits.map((item) => (
                  <li key={item} className="flex gap-2 text-slate-600">
                    <span style={{ color: primary }}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
          {servicePage.faqs?.length ? (
            <section className="mt-10">
              <h2 className="text-xl font-semibold text-slate-900">FAQs</h2>
              <dl className="mt-4 space-y-4">
                {servicePage.faqs.map((faq) => (
                  <div key={faq.question} className="rounded-xl border border-slate-100 p-4">
                    <dt className="font-medium text-slate-900">{faq.question}</dt>
                    <dd className="mt-1 text-sm text-slate-600">{faq.answer}</dd>
                  </div>
                ))}
              </dl>
            </section>
          ) : null}
          <div className="mt-10">
            <a
              href={bookingHref}
              className="inline-flex rounded-xl px-6 py-3 text-sm font-semibold text-white"
              style={{ backgroundColor: primary }}
            >
              {bookingLabel}
            </a>
          </div>
        </main>
        {navigation.footer.enabled ? (
          <PublicSiteFooter
            website={website}
            companySlug={companySlug}
            companyId={companyId}
            companyName={companyName}
            landing={landing}
            servicePages={servicePages}
            navigation={navigation}
          />
        ) : null}
      </div>
    );
  }

  if (!landing) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
        Website content is not available yet.
      </div>
    );
  }

  const pageContent = landing as WebsitePageContentV2;
  const sections = getPageSections(pageContent);
  if (pageContent.schemaVersion === 2 && sections.length > 0) {
    const placeholderCtx = {
      company: {
        id: companyId,
        name: companyName,
        slug: companySlug,
        industry_id: null,
        created_at: "",
        primary_contact_email: landing.contact.email,
        contact_phone: landing.contact.phone,
        contact_location: landing.contact.location,
        production_url: null,
        business_description: landing.about.body,
        booking_hours: landing.contact.hours ? { hours: landing.contact.hours } : null,
        industries: null,
      } as import("@/types/database").CompanyWithIndustry,
      companyId,
      primaryServiceName: servicePages[0]?.title ?? null,
    };

    return (
      <>
        {trackingNode}
        <WebsiteSectionRenderer
          sections={sections}
          website={website}
          companySlug={companySlug}
          companyId={companyId}
          companyName={companyName}
          servicePages={servicePages}
          placeholderCtx={placeholderCtx}
          preview={preview}
          showSiteChrome
          viewport={previewViewport ?? (chromeViewport === "mobile" ? "mobile" : "desktop")}
          contentPosts={contentPosts}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      {trackingNode}
      {preview ? (
        <div className="bg-amber-50 px-4 py-2 text-center text-xs font-medium text-amber-800">
          Preview mode — your site is not live until you publish.
        </div>
      ) : null}

      {navigation.header.enabled ? (
        <PublicSiteChrome
          website={website}
          companySlug={companySlug}
          companyId={companyId}
          companyName={companyName}
          landing={landing}
          servicePages={servicePages}
          navigation={navigation}
          preview={preview}
          viewport={chromeViewport}
        />
      ) : (
        <header
          className="px-4 py-4 sm:px-8"
          style={{ background: `linear-gradient(135deg, ${primary}15, white)` }}
        >
          <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
              ) : null}
              <span className="font-semibold text-slate-900">{companyName}</span>
            </div>
            <a
              href={bookingHref}
              className="rounded-xl px-4 py-2 text-sm font-semibold text-white"
              style={{ backgroundColor: primary }}
            >
              {bookingLabel}
            </a>
          </div>
        </header>
      )}

      <section className="px-4 py-16 sm:px-8" style={{ backgroundColor: `${primary}08` }}>
        <div className="mx-auto max-w-5xl text-center">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl">
            {landing.hero.headline}
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600">
            {landing.hero.subheadline}
          </p>
          <a
            href={bookingHref}
            className="mt-8 inline-flex rounded-xl px-6 py-3 text-sm font-semibold text-white"
            style={{ backgroundColor: primary }}
          >
            {landing.hero.ctaLabel || bookingLabel}
          </a>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-8">
        <h2 className="text-2xl font-bold text-slate-900">{landing.about.heading}</h2>
        <p className="mt-4 text-slate-600">{landing.about.body}</p>
      </section>

      {landing.services.items.length > 0 ? (
        <section className="bg-slate-50 px-4 py-16 sm:px-8">
          <div className="mx-auto max-w-5xl">
            <h2 className="text-2xl font-bold text-slate-900">{landing.services.heading}</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {landing.services.items.map((service) => {
                const linked = servicePages.find(
                  (p) => p.title.toLowerCase() === service.title.toLowerCase()
                );
                return (
                  <article
                    key={service.title}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <h3 className="font-semibold text-slate-900">{service.title}</h3>
                    <p className="mt-2 text-sm text-slate-600">{service.description}</p>
                    {service.priceFrom ? (
                      <p className="mt-3 text-sm font-medium" style={{ color: accent }}>
                        {service.priceFrom}
                      </p>
                    ) : null}
                    {linked ? (
                      <a
                        href={`/site/${companySlug}/services/${linked.slug}`}
                        className="mt-4 inline-block text-sm font-medium"
                        style={{ color: primary }}
                      >
                        Learn more →
                      </a>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      ) : null}

      <section className="mx-auto max-w-5xl px-4 py-16 sm:px-8">
        <h2 className="text-2xl font-bold text-slate-900">{landing.whyChooseUs.heading}</h2>
        <ul className="mt-6 grid gap-3 sm:grid-cols-2">
          {landing.whyChooseUs.items.map((item) => (
            <li
              key={item}
              className="rounded-xl border border-slate-100 bg-white px-4 py-3 text-slate-700"
            >
              {item}
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-slate-50 px-4 py-16 sm:px-8" id="contact">
        <div className="mx-auto grid max-w-5xl gap-10 lg:grid-cols-2">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {formSettings.sectionHeading || landing.contact.heading}
            </h2>
            {formSettings.sectionDescription ? (
              <p className="mt-2 text-sm text-slate-600">{formSettings.sectionDescription}</p>
            ) : null}
            <dl className="mt-6 space-y-3 text-sm text-slate-600">
              {landing.contact.phone ? (
                <div>
                  <dt className="font-medium text-slate-900">Phone</dt>
                  <dd>{landing.contact.phone}</dd>
                </div>
              ) : null}
              {landing.contact.email ? (
                <div>
                  <dt className="font-medium text-slate-900">Email</dt>
                  <dd>{landing.contact.email}</dd>
                </div>
              ) : null}
              {landing.contact.location ? (
                <div>
                  <dt className="font-medium text-slate-900">Location</dt>
                  <dd>{landing.contact.location}</dd>
                </div>
              ) : null}
            </dl>
          </div>
          <PublicContactForm
            companySlug={companySlug}
            companyId={companyId}
            websiteId={website.id}
            services={landing.services.items.map((s) => s.title)}
            primaryColor={primary}
            formSettings={formSettings}
          />
        </div>
      </section>

      {navigation.footer.enabled ? (
        <PublicSiteFooter
          website={website}
          companySlug={companySlug}
          companyId={companyId}
          companyName={companyName}
          landing={landing}
          servicePages={servicePages}
          navigation={navigation}
        />
      ) : (
        <footer className="border-t border-slate-100 px-4 py-8 text-center text-sm text-slate-500">
          <p className="font-medium text-slate-700">{landing.footer.businessName}</p>
          {landing.footer.tagline ? <p className="mt-1">{landing.footer.tagline}</p> : null}
          <p className="mt-4 text-xs">Powered by FaraiOS</p>
        </footer>
      )}
    </div>
  );
}

export function PublicSitePreviewFrame({
  children,
  mode,
}: {
  children: React.ReactNode;
  mode: "desktop" | "mobile";
}) {
  return (
    <div
      className={cn(
        "mx-auto overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all",
        mode === "mobile" ? "max-w-[390px]" : "w-full"
      )}
    >
      {children}
    </div>
  );
}
