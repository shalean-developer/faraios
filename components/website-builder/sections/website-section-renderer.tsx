"use client";

import { Star } from "lucide-react";

import type { BuilderWebsite, WebsiteServicePageRecord } from "@/types/website-builder";
import type { HeroSectionProps, WebsiteSection } from "@/types/website-builder-sections";
import type { PlaceholderContext } from "@/lib/website-builder/dynamic-placeholders";
import { resolveDynamicPlaceholders } from "@/lib/website-builder/dynamic-placeholders";
import { publicBookPath, publicSiteBlogPath, publicSiteBlogPostPath } from "@/lib/paths/company";
import { cn } from "@/lib/utils";
import type { ContentPost } from "@/types/growth-engine";

import { PublicContactForm } from "../public-contact-form";
import { PublicSiteChrome, PublicSiteFooter } from "../public-site-chrome";
import { getContactFormSettings } from "@/lib/website-builder/forms";
import { getNavigationSettings, sectionAnchorId } from "@/lib/website-builder/navigation";

type Props = {
  sections: WebsiteSection[];
  website: BuilderWebsite;
  companySlug: string;
  companyId: string;
  companyName: string;
  servicePages?: WebsiteServicePageRecord[];
  placeholderCtx: PlaceholderContext;
  viewport?: "desktop" | "tablet" | "mobile";
  preview?: boolean;
  showSiteChrome?: boolean;
  contentPosts?: ContentPost[];
};

function heroHeightClass(height?: HeroSectionProps["height"], overlay?: boolean): string {
  if (overlay) {
    switch (height) {
      case "compact":
        return "min-h-[480px]";
      case "tall":
        return "min-h-[720px]";
      case "fullscreen":
        return "min-h-[min(900px,100svh)]";
      default:
        return "min-h-[min(800px,95svh)]";
    }
  }
  switch (height) {
    case "compact":
      return "min-h-[280px] py-12";
    case "tall":
      return "min-h-[520px] py-24";
    case "fullscreen":
      return "min-h-[85vh] py-24";
    default:
      return "min-h-[400px] py-20";
  }
}

function HeroReviewsBadge({
  badge,
  accent,
}: {
  badge: NonNullable<HeroSectionProps["reviewsBadge"]>;
  accent: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span
        className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white"
        style={{ backgroundColor: accent }}
        aria-hidden
      >
        <Star className="h-4 w-4 fill-current" />
      </span>
      <div className="flex text-amber-400">
        {Array.from({ length: 5 }).map((_, i) => (
          <Star key={i} className="h-4 w-4 fill-current" />
        ))}
      </div>
      <span className="text-sm font-semibold text-white">
        {badge.rating}/5
      </span>
      <span className="text-sm text-white/80">
        {badge.count} {badge.label ?? "reviews"}
      </span>
    </div>
  );
}

function resolveHref(href: string, ctx: PlaceholderContext): string {
  const resolved = resolveDynamicPlaceholders(href, ctx);
  if (resolved === "{{booking_url}}") return publicBookPath(ctx.companyId);
  return resolved;
}

export function WebsiteSectionRenderer({
  sections,
  website,
  companySlug,
  companyId,
  companyName,
  servicePages = [],
  placeholderCtx,
  viewport = "desktop",
  preview = false,
  showSiteChrome = true,
  contentPosts = [],
}: Props) {
  const theme = website.theme_settings ?? {};
  const primary = typeof theme.primaryColor === "string" ? theme.primaryColor : "#5a8dee";
  const accent = typeof theme.accentColor === "string" ? theme.accentColor : "#4a6fd8";
  const bookingLabel = website.booking_button_label || "Book Now";
  const bookingHref = publicBookPath(companyId);

  const navigation = getNavigationSettings({
    website,
    companySlug,
    companyName,
    servicePages,
  });

  const formSettings = getContactFormSettings({ website });

  const visibleSections = sections.filter((section) => {
    if (!section.visible) return false;
    if (viewport === "mobile" && !section.mobileVisible) return false;
    if (viewport === "desktop" && !section.desktopVisible) return false;
    return true;
  });

  const firstSection = visibleSections[0];
  const overlayHeroChrome =
    showSiteChrome &&
    navigation.header.enabled &&
    navigation.header.variant === "overlay" &&
    firstSection?.type === "hero";

  return (
    <div
      className={cn(
        "min-h-full bg-white text-slate-900",
        viewport === "mobile" && "max-w-[390px] mx-auto border-x border-slate-200",
        viewport === "tablet" && "max-w-[768px] mx-auto border-x border-slate-200"
      )}
    >
      {preview ? (
        <div className="bg-amber-50 px-3 py-1.5 text-center text-[10px] font-medium text-amber-800">
          Preview — not live until published
        </div>
      ) : null}

      {showSiteChrome && navigation.header.enabled && !overlayHeroChrome ? (
        <PublicSiteChrome
          website={website}
          companySlug={companySlug}
          companyId={companyId}
          companyName={companyName}
          servicePages={servicePages}
          navigation={navigation}
          viewport={viewport === "tablet" ? "desktop" : viewport}
          preview={preview}
        />
      ) : null}

      {visibleSections.map((section, sectionIndex) => {
        const anchorId = sectionAnchorId(section.type);
        if (section.type === "hero") {
          const p = section.props as HeroSectionProps;
          const headline = resolveDynamicPlaceholders(p.headline, placeholderCtx);
          const subheadline = resolveDynamicPlaceholders(p.subheadline, placeholderCtx);
          const isOverlayHero = overlayHeroChrome && sectionIndex === 0;
          const align =
            p.alignment === "left"
              ? "text-left items-start"
              : p.alignment === "right"
                ? "text-right items-end"
                : "text-center items-center";
          const reviewsBelow = p.reviewsPosition !== "above";
          const overlayOpacity = p.overlayOpacity ?? 0.35;
          const ctaColor = accent;

          const reviewsEl = p.reviewsBadge ? (
            <HeroReviewsBadge badge={p.reviewsBadge} accent={ctaColor} />
          ) : null;

          return (
            <section
              key={section.id}
              id={anchorId}
              className={cn(
                "relative flex flex-col overflow-hidden",
                isOverlayHero ? heroHeightClass(p.height, true) : heroHeightClass(p.height)
              )}
            >
              <div
                className="absolute inset-0 bg-cover bg-center"
                style={{
                  backgroundImage: p.backgroundImageUrl
                    ? `url(${p.backgroundImageUrl})`
                    : `linear-gradient(135deg, ${primary}22, ${primary}08)`,
                }}
              />
              {p.backgroundImageUrl ? (
                <div
                  className="absolute inset-0"
                  style={{
                    background: isOverlayHero
                      ? `linear-gradient(105deg, rgba(0,0,0,${Math.min(overlayOpacity + 0.15, 0.75)}) 0%, rgba(0,0,0,${overlayOpacity * 0.5}) 55%, rgba(0,0,0,${overlayOpacity * 0.25}) 100%)`
                      : `linear-gradient(rgba(0,0,0,${overlayOpacity}), rgba(0,0,0,${overlayOpacity}))`,
                  }}
                />
              ) : null}

              {isOverlayHero ? (
                <PublicSiteChrome
                  website={website}
                  companySlug={companySlug}
                  companyId={companyId}
                  companyName={companyName}
                  servicePages={servicePages}
                  navigation={navigation}
                  viewport={viewport === "tablet" ? "desktop" : viewport}
                  preview={preview}
                  chromePosition="overlay"
                />
              ) : null}

              <div
                className={cn(
                  "relative z-10 flex flex-1 flex-col justify-center px-6",
                  isOverlayHero ? "pb-16 pt-8 sm:px-8 lg:pb-20" : "py-20"
                )}
              >
                <div
                  className={cn(
                    "mx-auto flex w-full max-w-7xl flex-col gap-5",
                    align,
                    isOverlayHero && p.alignment === "left" && "max-w-2xl lg:max-w-3xl"
                  )}
                >
                  {!reviewsBelow && reviewsEl}
                  <h1
                    className={cn(
                      "font-bold tracking-tight",
                      isOverlayHero
                        ? "text-[clamp(2rem,5vw,3.75rem)] leading-[1.08]"
                        : "text-3xl sm:text-4xl",
                      p.backgroundImageUrl || isOverlayHero ? "text-white" : "text-slate-900"
                    )}
                  >
                    {headline}
                  </h1>
                  <p
                    className={cn(
                      "max-w-xl text-base leading-relaxed sm:text-lg",
                      p.backgroundImageUrl || isOverlayHero ? "text-white/90" : "text-slate-600"
                    )}
                  >
                    {subheadline}
                  </p>
                  {p.trustBadges && p.trustBadges.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {p.trustBadges.map((badge) => (
                        <span
                          key={badge}
                          className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-medium text-slate-600"
                        >
                          {badge}
                        </span>
                      ))}
                    </div>
                  ) : null}
                  <div className="flex flex-wrap gap-3">
                    {p.primaryCta ? (
                      <a
                        href={resolveHref(p.primaryCta.href, placeholderCtx)}
                        className={cn(
                          "rounded-lg px-6 py-3 text-sm font-semibold text-white transition hover:opacity-90",
                          isOverlayHero && "shadow-md"
                        )}
                        style={{ backgroundColor: ctaColor }}
                      >
                        {p.primaryCta.label}
                      </a>
                    ) : null}
                    {p.secondaryCta ? (
                      <a
                        href={resolveHref(p.secondaryCta.href, placeholderCtx)}
                        className="rounded-lg border border-white/40 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur-sm"
                      >
                        {p.secondaryCta.label}
                      </a>
                    ) : null}
                  </div>
                  {reviewsBelow ? reviewsEl : null}
                  {p.statistics && p.statistics.length > 0 ? (
                    <div className="mt-4 grid grid-cols-3 gap-4">
                      {p.statistics.map((stat) => (
                        <div key={stat.label}>
                          <p className="text-2xl font-bold" style={{ color: accent }}>
                            {stat.value}
                          </p>
                          <p className="text-xs text-slate-500">{stat.label}</p>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
              {p.floatingBookingButton ? (
                <a
                  href={bookingHref}
                  className="fixed bottom-6 right-6 z-20 rounded-full px-5 py-3 text-sm font-semibold text-white shadow-lg"
                  style={{ backgroundColor: primary }}
                >
                  {bookingLabel}
                </a>
              ) : null}
            </section>
          );
        }

        if (section.type === "about") {
          const p = section.props as { heading?: string; body?: string; imageUrl?: string; imageAlt?: string };
          return (
            <section key={section.id} id={anchorId} className="mx-auto max-w-4xl px-6 py-14">
              <div className={cn("grid gap-8", p.imageUrl ? "lg:grid-cols-2 lg:items-center" : "")}>
                <div>
                  <h2 className="text-2xl font-bold">{p.heading ?? "About"}</h2>
                  <p className="mt-4 text-slate-600">
                    {resolveDynamicPlaceholders(p.body ?? "", placeholderCtx)}
                  </p>
                </div>
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={p.imageUrl}
                    alt={p.imageAlt ?? p.heading ?? "About"}
                    className="h-56 w-full rounded-2xl object-cover lg:h-72"
                  />
                ) : null}
              </div>
            </section>
          );
        }

        if (section.type === "services") {
          const p = section.props as {
            heading?: string;
            items?: {
              title: string;
              description: string;
              priceFrom?: string;
              imageUrl?: string;
            }[];
          };
          return (
            <section key={section.id} id={anchorId} className="bg-slate-50 px-6 py-14">
              <div className="mx-auto max-w-4xl">
                <h2 className="text-2xl font-bold">{p.heading ?? "Services"}</h2>
                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  {(p.items ?? []).map((item) => (
                    <div key={item.title} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.imageUrl}
                          alt={item.title}
                          className="h-40 w-full object-cover"
                        />
                      ) : null}
                      <div className="p-4">
                        <h3 className="font-semibold text-slate-900">{item.title}</h3>
                        <p className="mt-2 text-sm text-slate-600">{item.description}</p>
                        {item.priceFrom ? (
                          <p className="mt-2 text-sm font-medium" style={{ color: accent }}>
                            {item.priceFrom}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          );
        }

        if (section.type === "why-choose-us") {
          const p = section.props as { heading?: string; items?: string[] };
          return (
            <section key={section.id} id={anchorId} className="mx-auto max-w-4xl px-6 py-14">
              <h2 className="text-2xl font-bold">{p.heading ?? "Why choose us"}</h2>
              <ul className="mt-6 space-y-2">
                {(p.items ?? []).map((item) => (
                  <li key={item} className="flex gap-2 text-slate-600">
                    <span style={{ color: primary }}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </section>
          );
        }

        if (section.type === "contact") {
          const p = section.props as {
            heading?: string;
            phone?: string | null;
            email?: string | null;
            location?: string | null;
            hours?: string | null;
          };
          return (
            <section key={section.id} id="contact" className="bg-slate-50 px-6 py-14">
              <div className="mx-auto grid max-w-4xl gap-8 lg:grid-cols-2">
                <div>
                  <h2 className="text-2xl font-bold">
                    {formSettings.sectionHeading || p.heading || "Contact"}
                  </h2>
                  {formSettings.sectionDescription ? (
                    <p className="mt-2 text-sm text-slate-600">{formSettings.sectionDescription}</p>
                  ) : null}
                  <dl className="mt-4 space-y-2 text-sm text-slate-600">
                    {p.phone ? <div>Phone: {resolveDynamicPlaceholders(p.phone, placeholderCtx)}</div> : null}
                    {p.email ? <div>Email: {resolveDynamicPlaceholders(p.email, placeholderCtx)}</div> : null}
                    {p.location ? <div>Location: {resolveDynamicPlaceholders(p.location, placeholderCtx)}</div> : null}
                    {p.hours ? <div>Hours: {p.hours}</div> : null}
                  </dl>
                </div>
                <PublicContactForm
                  companySlug={companySlug}
                  companyId={companyId}
                  websiteId={website.id}
                  services={servicePages.map((page) => page.title)}
                  primaryColor={primary}
                  formSettings={formSettings}
                />
              </div>
            </section>
          );
        }

        if (section.type === "booking-cta") {
          const p = section.props as { heading?: string; subheading?: string; buttonLabel?: string };
          return (
            <section key={section.id} className="px-6 py-14 text-center" style={{ backgroundColor: `${primary}10` }}>
              <h2 className="text-2xl font-bold">{p.heading ?? "Ready to book?"}</h2>
              {p.subheading ? <p className="mt-2 text-slate-600">{p.subheading}</p> : null}
              <a
                href={bookingHref}
                className="mt-6 inline-flex rounded-lg px-6 py-3 text-sm font-semibold text-white"
                style={{ backgroundColor: primary }}
              >
                {p.buttonLabel ?? bookingLabel}
              </a>
            </section>
          );
        }

        if (section.type === "custom-html") {
          const p = section.props as { html?: string };
          return (
            <section
              key={section.id}
              className="px-6 py-8"
              dangerouslySetInnerHTML={{ __html: p.html ?? "" }}
            />
          );
        }

        if (section.type === "pricing") {
          const p = section.props as {
            heading?: string;
            items?: { title: string; description: string; priceFrom?: string }[];
          };
          return (
            <section key={section.id} className="px-6 py-14">
              <div className="mx-auto max-w-4xl">
                <h2 className="text-center text-2xl font-bold">{p.heading ?? "Pricing"}</h2>
                <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {(p.items ?? []).map((item) => (
                    <div key={item.title} className="rounded-xl border border-slate-200 p-5 text-center">
                      <h3 className="font-semibold">{item.title}</h3>
                      {item.priceFrom ? (
                        <p className="mt-2 text-2xl font-bold" style={{ color: accent }}>
                          {item.priceFrom}
                        </p>
                      ) : null}
                      <p className="mt-2 text-sm text-slate-600">{item.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          );
        }

        if (section.type === "faq") {
          const p = section.props as { heading?: string; items?: { question: string; answer: string }[] };
          return (
            <section key={section.id} className="mx-auto max-w-3xl px-6 py-14">
              <h2 className="text-2xl font-bold">{p.heading ?? "FAQ"}</h2>
              <dl className="mt-6 space-y-4">
                {(p.items ?? []).map((item) => (
                  <div key={item.question} className="rounded-lg border border-slate-200 p-4">
                    <dt className="font-medium text-slate-900">{item.question}</dt>
                    <dd className="mt-2 text-sm text-slate-600">{item.answer}</dd>
                  </div>
                ))}
              </dl>
            </section>
          );
        }

        if (section.type === "testimonials") {
          const p = section.props as {
            heading?: string;
            items?: { name: string; quote: string; role?: string }[];
          };
          return (
            <section key={section.id} className="bg-slate-50 px-6 py-14">
              <div className="mx-auto max-w-4xl">
                <h2 className="text-center text-2xl font-bold">{p.heading ?? "Testimonials"}</h2>
                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  {(p.items ?? []).map((item) => (
                    <blockquote key={item.name + item.quote} className="rounded-xl bg-white p-5 shadow-sm">
                      <p className="text-slate-600">&ldquo;{item.quote}&rdquo;</p>
                      <footer className="mt-3 text-sm font-medium text-slate-900">
                        {item.name}
                        {item.role ? <span className="font-normal text-slate-500"> — {item.role}</span> : null}
                      </footer>
                    </blockquote>
                  ))}
                </div>
              </div>
            </section>
          );
        }

        if (section.type === "team") {
          const p = section.props as {
            heading?: string;
            items?: { name: string; role: string; imageUrl?: string }[];
          };
          return (
            <section key={section.id} className="px-6 py-14">
              <div className="mx-auto max-w-4xl">
                <h2 className="text-center text-2xl font-bold">{p.heading ?? "Our team"}</h2>
                <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {(p.items ?? []).map((item) => (
                    <div key={item.name} className="text-center">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt={item.name} className="mx-auto h-24 w-24 rounded-full object-cover" />
                      ) : (
                        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-slate-200 text-xl font-bold text-slate-500">
                          {item.name.charAt(0)}
                        </div>
                      )}
                      <h3 className="mt-3 font-semibold">{item.name}</h3>
                      <p className="text-sm text-slate-500">{item.role}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          );
        }

        if (section.type === "gallery") {
          const p = section.props as { heading?: string; images?: string[] };
          return (
            <section key={section.id} className="px-6 py-14">
              <div className="mx-auto max-w-5xl">
                {p.heading ? <h2 className="mb-6 text-2xl font-bold">{p.heading}</h2> : null}
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  {(p.images ?? []).filter(Boolean).map((url) => (
                    <img key={url} src={url} alt="" className="aspect-square rounded-lg object-cover" />
                  ))}
                </div>
              </div>
            </section>
          );
        }

        if (section.type === "statistics") {
          const p = section.props as { heading?: string; items?: { label: string; value: string }[] };
          return (
            <section key={section.id} className="px-6 py-14" style={{ backgroundColor: `${primary}08` }}>
              <div className="mx-auto max-w-4xl text-center">
                {p.heading ? <h2 className="text-2xl font-bold">{p.heading}</h2> : null}
                <div className="mt-8 grid grid-cols-2 gap-6 sm:grid-cols-4">
                  {(p.items ?? []).map((item) => (
                    <div key={item.label}>
                      <p className="text-3xl font-bold" style={{ color: accent }}>
                        {item.value}
                      </p>
                      <p className="mt-1 text-sm text-slate-600">{item.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          );
        }

        if (section.type === "logos") {
          const p = section.props as { heading?: string; items?: string[] };
          return (
            <section key={section.id} className="px-6 py-10">
              <div className="mx-auto max-w-4xl text-center">
                {p.heading ? <p className="text-sm font-medium text-slate-500">{p.heading}</p> : null}
                <div className="mt-4 flex flex-wrap items-center justify-center gap-6">
                  {(p.items ?? []).map((item) => (
                    <span key={item} className="text-sm font-semibold text-slate-400">
                      {item.startsWith("http") ? (
                        <img src={item} alt="" className="h-8 max-w-[120px] object-contain" />
                      ) : (
                        item
                      )}
                    </span>
                  ))}
                </div>
              </div>
            </section>
          );
        }

        if (section.type === "process") {
          const p = section.props as { heading?: string; items?: { title: string; description: string }[] };
          return (
            <section key={section.id} className="px-6 py-14">
              <div className="mx-auto max-w-4xl">
                <h2 className="text-center text-2xl font-bold">{p.heading ?? "How it works"}</h2>
                <ol className="mt-8 grid gap-6 sm:grid-cols-3">
                  {(p.items ?? []).map((item, index) => (
                    <li key={item.title} className="text-center">
                      <span
                        className="inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
                        style={{ backgroundColor: primary }}
                      >
                        {index + 1}
                      </span>
                      <h3 className="mt-3 font-semibold">{item.title}</h3>
                      <p className="mt-2 text-sm text-slate-600">{item.description}</p>
                    </li>
                  ))}
                </ol>
              </div>
            </section>
          );
        }

        if (section.type === "cta-banner") {
          const p = section.props as {
            heading?: string;
            body?: string;
            buttonLabel?: string;
            buttonHref?: string;
          };
          return (
            <section
              key={section.id}
              className="px-6 py-16 text-center text-white"
              style={{ backgroundColor: primary }}
            >
              <h2 className="text-2xl font-bold">{p.heading ?? "Get started"}</h2>
              {p.body ? <p className="mx-auto mt-2 max-w-xl opacity-90">{p.body}</p> : null}
              <a
                href={resolveHref(p.buttonHref ?? "{{booking_url}}", placeholderCtx)}
                className="mt-6 inline-flex rounded-lg bg-white px-6 py-3 text-sm font-semibold"
                style={{ color: primary }}
              >
                {p.buttonLabel ?? "Book Now"}
              </a>
            </section>
          );
        }

        if (section.type === "map") {
          const p = section.props as { heading?: string; embedUrl?: string; address?: string };
          return (
            <section key={section.id} className="px-6 py-14">
              <div className="mx-auto max-w-4xl">
                <h2 className="text-2xl font-bold">{p.heading ?? "Location"}</h2>
                {p.address ? (
                  <p className="mt-2 text-slate-600">
                    {resolveDynamicPlaceholders(p.address, placeholderCtx)}
                  </p>
                ) : null}
                {p.embedUrl ? (
                  <iframe
                    title="Map"
                    src={p.embedUrl}
                    className="mt-4 h-64 w-full rounded-xl border border-slate-200"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                ) : (
                  <div className="mt-4 flex h-48 items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-400">
                    Add a Google Maps embed URL
                  </div>
                )}
              </div>
            </section>
          );
        }

        if (section.type === "booking-form") {
          const p = section.props as { heading?: string; subheading?: string };
          return (
            <section key={section.id} className="bg-slate-50 px-6 py-14">
              <div className="mx-auto max-w-lg text-center">
                <h2 className="text-2xl font-bold">{p.heading ?? "Book online"}</h2>
                {p.subheading ? <p className="mt-2 text-slate-600">{p.subheading}</p> : null}
                <a
                  href={bookingHref}
                  className="mt-6 inline-flex rounded-lg px-6 py-3 text-sm font-semibold text-white"
                  style={{ backgroundColor: primary }}
                >
                  {bookingLabel}
                </a>
              </div>
            </section>
          );
        }

        if (section.type === "newsletter") {
          const p = section.props as {
            heading?: string;
            description?: string;
            buttonLabel?: string;
            placeholder?: string;
          };
          return (
            <section key={section.id} className="px-6 py-14">
              <div className="mx-auto max-w-xl rounded-xl border border-slate-200 p-8 text-center">
                <h2 className="text-xl font-bold">{p.heading ?? "Newsletter"}</h2>
                {p.description ? <p className="mt-2 text-sm text-slate-600">{p.description}</p> : null}
                <form className="mt-4 flex gap-2" onSubmit={(e) => e.preventDefault()}>
                  <input
                    type="email"
                    placeholder={p.placeholder ?? "you@email.com"}
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                  <button
                    type="submit"
                    className="rounded-lg px-4 py-2 text-sm font-medium text-white"
                    style={{ backgroundColor: primary }}
                  >
                    {p.buttonLabel ?? "Subscribe"}
                  </button>
                </form>
              </div>
            </section>
          );
        }

        if (section.type === "blog-posts") {
          const p = section.props as { heading?: string; limit?: number };
          const limit = p.limit ?? 3;
          const posts = contentPosts.slice(0, limit);
          return (
            <section key={section.id} className="px-6 py-14">
              <div className="mx-auto max-w-4xl">
                <h2 className="text-2xl font-bold">{p.heading ?? "Latest posts"}</h2>
                {posts.length === 0 ? (
                  <p className="mt-6 text-sm text-slate-500">
                    {preview
                      ? "Publish posts in Blog to populate this section."
                      : "No blog posts published yet."}
                  </p>
                ) : (
                  <div className="mt-6 grid gap-4 sm:grid-cols-3">
                    {posts.map((post) => (
                      <article
                        key={post.id}
                        className="rounded-lg border border-slate-200 p-4 shadow-sm"
                      >
                        {post.featured_image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={post.featured_image}
                            alt=""
                            className="mb-3 h-32 w-full rounded-md object-cover"
                          />
                        ) : null}
                        <h3 className="text-sm font-semibold text-slate-900">
                          <a
                            href={publicSiteBlogPostPath(companySlug, post.slug)}
                            className="hover:text-violet-700"
                          >
                            {post.title}
                          </a>
                        </h3>
                        {post.meta_description ? (
                          <p className="mt-2 line-clamp-3 text-xs text-slate-600">
                            {post.meta_description}
                          </p>
                        ) : null}
                      </article>
                    ))}
                  </div>
                )}
                {posts.length > 0 ? (
                  <div className="mt-6">
                    <a
                      href={publicSiteBlogPath(companySlug)}
                      className="text-sm font-medium text-violet-700 hover:text-violet-900"
                    >
                      View all posts
                    </a>
                  </div>
                ) : null}
              </div>
            </section>
          );
        }

        if (section.type === "footer") {
          if (showSiteChrome && navigation.footer.enabled) return null;
          const p = section.props as { businessName?: string; tagline?: string | null };
          const businessName = resolveDynamicPlaceholders(p.businessName ?? companyName, placeholderCtx);
          const tagline = p.tagline
            ? resolveDynamicPlaceholders(p.tagline, placeholderCtx)
            : null;
          return (
            <footer
              key={section.id}
              className="border-t border-slate-100 px-4 py-8 text-center text-sm text-slate-500"
            >
              <p className="font-medium text-slate-700">{businessName}</p>
              {tagline ? <p className="mt-1">{tagline}</p> : null}
            </footer>
          );
        }

        if (section.type === "custom-component") {
          const p = section.props as { componentKey?: string; note?: string };
          return (
            <section key={section.id} className="border-y border-dashed border-slate-200 px-6 py-10 text-center text-sm text-slate-400">
              Custom component: {p.componentKey || "not configured"}
              {p.note ? <p className="mt-1 text-xs">{p.note}</p> : null}
            </section>
          );
        }

        return (
          <section key={section.id} className="border-y border-dashed border-slate-200 px-6 py-10 text-center text-sm text-slate-400">
            {section.label ?? section.type} section
          </section>
        );
      })}

      {showSiteChrome && navigation.footer.enabled ? (
        <PublicSiteFooter
          website={website}
          companySlug={companySlug}
          companyId={companyId}
          companyName={companyName}
          servicePages={servicePages}
          navigation={navigation}
        />
      ) : null}
    </div>
  );
}
