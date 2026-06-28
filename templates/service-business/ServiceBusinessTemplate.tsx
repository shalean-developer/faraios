import type { CSSProperties } from "react";
import Image from "next/image";
import { ArrowRight, Star } from "lucide-react";

import { applyWebsiteVariantToSite, applyCompanyBrandingToSite, type CompanyBranding } from "@/lib/website-templates/apply-variant";
import { resolveWebsiteTemplateVariant } from "@/lib/website-templates/variants";
import type { WebsiteContent } from "@/types/database";
import { parseSiteContent } from "@/templates/service-business/content";
import { ServiceBusinessHome } from "@/templates/service-business/ServiceBusinessHome";
import { LuxuryFooter } from "@/templates/service-business/LuxuryFooter";
import { LuxuryHeroSection } from "@/templates/service-business/LuxuryHeroSection";
import {
  LuxuryAboutPage,
  LuxuryBlogPage,
  LuxuryContactPage,
  LuxuryFaqPage,
  LuxuryReviewsPage,
  LuxuryServicesPage,
} from "@/templates/service-business/luxury-pages";
import { LuxurySiteHeader } from "@/templates/service-business/LuxurySiteHeader";
import { SiteChrome } from "@/templates/service-business/SiteChrome";
import { SiteFooter } from "@/templates/service-business/SiteFooter";
import {
  buildTemplatePaths,
  resolveTemplateHref,
  type TemplatePage,
} from "@/templates/service-business/paths";

type Props = {
  content: WebsiteContent[];
  pageSection?: TemplatePage;
  bookingUrl?: string | null;
  marketplaceBookingUrl?: string | null;
  previewWebsiteId?: string | null;
  templateVariant?: string | null;
  companyBranding?: CompanyBranding | null;
};

function ServiceImage({ src, alt, className }: { src?: string; alt: string; className?: string }) {
  if (!src) {
    return (
      <div
        className={`flex items-center justify-center bg-slate-100 text-xs text-slate-500 ${className ?? ""}`}
      >
        Service photo
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      width={640}
      height={400}
      className={`object-cover ${className ?? ""}`}
      unoptimized
    />
  );
}

function ServicesPage({
  site,
  bookingUrl,
  paths,
}: {
  site: ReturnType<typeof parseSiteContent>;
  bookingUrl?: string | null;
  paths: ReturnType<typeof buildTemplatePaths>;
}) {
  const { services, hero, theme } = site;
  const bookHref = bookingUrl ?? resolveTemplateHref(hero.ctaHref, paths);
  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-4">
        <h1 className="text-3xl font-bold text-slate-900">{services.heading}</h1>
        <p className="mt-3 max-w-2xl text-slate-600">{services.subtitle}</p>
        <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {services.items.map((item) => (
            <li
              key={item.title}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <ServiceImage src={item.image} alt={item.imageAlt ?? item.title} className="h-44 w-full" />
              <div className="p-5">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="font-bold text-slate-900">{item.title}</h2>
                  <span className="text-sm font-semibold" style={{ color: theme.accent }}>
                    {item.priceFrom || hero.startingPrice}
                  </span>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {item.description || "Professional service from our trusted local team."}
                </p>
                <a
                  href={bookHref}
                  className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-slate-800"
                >
                  Book now
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function AboutPage({
  site,
  paths,
}: {
  site: ReturnType<typeof parseSiteContent>;
  paths: ReturnType<typeof buildTemplatePaths>;
}) {
  const { whyChooseUs, theme } = site;
  return (
    <section className="bg-slate-50 py-16">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 lg:grid-cols-2 lg:items-center">
        <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-lg">
          <ServiceImage
            src={whyChooseUs.image}
            alt={whyChooseUs.imageAlt}
            className="h-80 w-full lg:h-[420px]"
          />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">{whyChooseUs.heading}</h1>
          <p className="mt-4 leading-relaxed text-slate-600">{whyChooseUs.body}</p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {whyChooseUs.benefits.map((b) => (
              <li key={b.title} className="rounded-xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold text-slate-900">{b.title}</p>
                {b.description ? (
                  <p className="mt-1 text-xs text-slate-500">{b.description}</p>
                ) : null}
              </li>
            ))}
          </ul>
          <a
            href={resolveTemplateHref(whyChooseUs.ctaHref, paths)}
            className="mt-8 inline-flex rounded-xl px-6 py-3.5 text-sm font-semibold text-white"
            style={{ backgroundColor: theme.accent }}
          >
            {whyChooseUs.ctaLabel}
          </a>
        </div>
      </div>
    </section>
  );
}

function ReviewsPage({
  site,
  bookingUrl,
  paths,
}: {
  site: ReturnType<typeof parseSiteContent>;
  bookingUrl?: string | null;
  paths: ReturnType<typeof buildTemplatePaths>;
}) {
  const { hero, theme } = site;
  const bookHref = bookingUrl ?? resolveTemplateHref(hero.ctaHref, paths);

  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-7xl px-4">
        <h1 className="text-3xl font-bold text-slate-900">Customer Reviews</h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          See what local customers say about {site.businessName}.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Established</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{site.socialProof.establishedYear}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Jobs completed</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{site.socialProof.jobsCompleted}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:col-span-2">
            <div className="flex text-amber-400">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-current" />
              ))}
            </div>
            <p className="mt-3 text-sm italic leading-relaxed text-slate-700">
              &ldquo;{site.socialProof.reviewQuote}&rdquo;
            </p>
            <p className="mt-3 text-sm font-semibold text-slate-900">{site.socialProof.reviewAuthor}</p>
          </div>
          <div
            className="rounded-2xl p-6 text-white sm:col-span-2 lg:col-span-4"
            style={{ backgroundColor: theme.primary }}
          >
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-lg font-bold">Google Reviews</p>
                <p className="text-slate-200">{site.socialProof.googleReviews}</p>
              </div>
              <a
                href={bookHref}
                className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-900"
              >
                Read reviews & book
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function ContactPage({
  site,
  bookingUrl,
  paths,
}: {
  site: ReturnType<typeof parseSiteContent>;
  bookingUrl?: string | null;
  paths: ReturnType<typeof buildTemplatePaths>;
}) {
  const { contact, topbar, hero, theme } = site;
  const phoneHref = contact.phone.replace(/\s+/g, "");
  const bookHref = bookingUrl ?? resolveTemplateHref(hero.ctaHref, paths);
  const bookExternal = Boolean(bookHref?.startsWith("http"));

  return (
    <section className="bg-white py-16">
      <div className="mx-auto max-w-3xl px-4">
        <h1 className="text-3xl font-bold text-slate-900">{contact.heading}</h1>
        <p className="mt-3 text-slate-600">
          Reach out for quotes, scheduling, or questions about service in {topbar.serviceArea}.
        </p>
        <div className="mt-8 space-y-4">
          {contact.phone ? (
            <a
              href={`tel:${phoneHref}`}
              className="block rounded-2xl border border-slate-200 bg-slate-50 p-6 hover:shadow-sm"
            >
              <p className="text-xs font-semibold uppercase text-slate-400">Phone</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{contact.phone}</p>
            </a>
          ) : null}
          {contact.email ? (
            <a
              href={`mailto:${contact.email}`}
              className="block rounded-2xl border border-slate-200 bg-slate-50 p-6 hover:shadow-sm"
            >
              <p className="text-xs font-semibold uppercase text-slate-400">Email</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{contact.email}</p>
            </a>
          ) : null}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
            <p className="text-xs font-semibold uppercase text-slate-400">Business hours</p>
            <p className="mt-2 text-lg font-semibold text-slate-900">{topbar.hours}</p>
          </div>
        </div>
        {contact.details ? (
          <p className="mt-6 whitespace-pre-wrap text-slate-600">{contact.details}</p>
        ) : null}
        <div className="mt-8 flex flex-wrap gap-3">
          {bookHref ? (
            <a
              href={bookHref}
              {...(bookExternal ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold text-white"
              style={{ backgroundColor: theme.accent }}
            >
              Book online
              <ArrowRight className="h-4 w-4" />
            </a>
          ) : (
            <a
              href={resolveTemplateHref(hero.ctaHref, paths)}
              className="inline-flex rounded-xl px-6 py-3.5 text-sm font-semibold text-white"
              style={{ backgroundColor: theme.accent }}
            >
              {hero.ctaLabel}
            </a>
          )}
        </div>
      </div>
    </section>
  );
}

export default function ServiceBusinessTemplate({
  content,
  pageSection = "home",
  bookingUrl,
  marketplaceBookingUrl,
  previewWebsiteId,
  templateVariant,
  companyBranding,
}: Props) {
  const parsed = parseSiteContent(content);
  const variant = resolveWebsiteTemplateVariant(templateVariant);
  const site = applyCompanyBrandingToSite(
    applyWebsiteVariantToSite(parsed, variant),
    companyBranding
  );
  const paths = buildTemplatePaths(previewWebsiteId);
  const resolvedBookingUrl = bookingUrl ?? marketplaceBookingUrl;
  const isLuxuryLayout = site.variant === "beauty";
  const isLuxuryHome = isLuxuryLayout && pageSection === "home";

  return (
    <div
      className={`min-h-screen font-sans antialiased ${isLuxuryLayout ? "bg-[#f5f3e7] text-[#2d2926]" : "bg-white text-slate-900"}`}
      data-website-variant={site.variant}
      data-website-layout={isLuxuryLayout ? "luxury" : "classic"}
      style={
        {
          "--site-primary": site.theme.primary,
          "--site-accent": site.theme.accent,
          "--site-hero-from": site.variantTheme.heroGradientFrom,
          "--site-hero-to": site.variantTheme.heroGradientTo,
        } as CSSProperties
      }
    >
      {isLuxuryLayout ? (
        // eslint-disable-next-line @next/next/no-page-custom-font
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=DM+Sans:wght@400;500;600&display=swap" />
      ) : null}
      {isLuxuryHome ? null : isLuxuryLayout ? (
        <LuxurySiteHeader
          site={site}
          bookingUrl={resolvedBookingUrl}
          paths={paths}
          activePage={pageSection}
        />
      ) : (
        <SiteChrome site={site} bookingUrl={resolvedBookingUrl} paths={paths} />
      )}
      <main>
        {isLuxuryHome ? (
          <LuxuryHeroSection
            site={site}
            paths={paths}
            bookingUrl={resolvedBookingUrl}
          />
        ) : null}
        {pageSection === "home" ? (
          <ServiceBusinessHome
            site={site}
            bookingUrl={resolvedBookingUrl}
            paths={paths}
            skipHero={isLuxuryHome}
          />
        ) : null}
        {pageSection === "services" ? (
          isLuxuryLayout ? (
            <LuxuryServicesPage site={site} paths={paths} bookingUrl={resolvedBookingUrl} />
          ) : (
            <ServicesPage site={site} bookingUrl={resolvedBookingUrl} paths={paths} />
          )
        ) : null}
        {pageSection === "about" ? (
          isLuxuryLayout ? (
            <LuxuryAboutPage site={site} paths={paths} bookingUrl={resolvedBookingUrl} />
          ) : (
            <AboutPage site={site} paths={paths} />
          )
        ) : null}
        {pageSection === "reviews" ? (
          isLuxuryLayout ? (
            <LuxuryReviewsPage site={site} paths={paths} bookingUrl={resolvedBookingUrl} />
          ) : (
            <ReviewsPage site={site} bookingUrl={resolvedBookingUrl} paths={paths} />
          )
        ) : null}
        {pageSection === "contact" ? (
          isLuxuryLayout ? (
            <LuxuryContactPage site={site} bookingUrl={resolvedBookingUrl} />
          ) : (
            <ContactPage site={site} bookingUrl={resolvedBookingUrl} paths={paths} />
          )
        ) : null}
        {pageSection === "blog" ? (
          isLuxuryLayout ? (
            <LuxuryBlogPage site={site} paths={paths} />
          ) : (
            <section className="bg-white py-16">
              <div className="mx-auto max-w-3xl px-4">
                <h1 className="text-3xl font-bold text-slate-900">Blog</h1>
                <p className="mt-3 text-slate-600">Tips, guides, and updates from our team.</p>
              </div>
            </section>
          )
        ) : null}
        {pageSection === "faq" ? (
          isLuxuryLayout ? (
            <LuxuryFaqPage site={site} paths={paths} bookingUrl={resolvedBookingUrl} />
          ) : (
            <section className="bg-white py-16">
              <div className="mx-auto max-w-3xl px-4">
                <h1 className="text-3xl font-bold text-slate-900">FAQ</h1>
              </div>
            </section>
          )
        ) : null}
      </main>
      {isLuxuryLayout ? (
        <LuxuryFooter site={site} paths={paths} />
      ) : (
        <SiteFooter site={site} paths={paths} />
      )}
    </div>
  );
}
