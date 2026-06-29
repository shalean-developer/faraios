import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import {
  ArrowRight,
  BadgeCheck,
  Building2,
  CalendarCheck,
  Check,
  ChevronRight,
  Clock,
  Home,
  Leaf,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
  UserCheck,
  Users,
  Wrench,
} from "lucide-react";

import { LuxuryAboutSection } from "@/templates/service-business/LuxuryAboutSection";
import { ModernOverlayAboutSection } from "@/templates/service-business/ModernOverlayAboutSection";
import { ModernOverlayServicesSection } from "@/templates/service-business/ModernOverlayServicesSection";
import { ModernOverlayWorkProcessSection } from "@/templates/service-business/ModernOverlayWorkProcessSection";
import { ModernOverlayBlogSection } from "@/templates/service-business/ModernOverlayBlogSection";
import { ModernOverlayCraftsmanshipSection } from "@/templates/service-business/ModernOverlayCraftsmanshipSection";
import { ModernOverlayFaqSection } from "@/templates/service-business/ModernOverlayFaqSection";
import { ModernOverlayTestimonialsSection } from "@/templates/service-business/ModernOverlayTestimonialsSection";
import { ModernOverlayTransformSection } from "@/templates/service-business/ModernOverlayTransformSection";
import { ModernOverlayFeatureBannerSection } from "@/templates/service-business/ModernOverlayFeatureBannerSection";
import { ModernOverlayWhyChooseUsSection } from "@/templates/service-business/ModernOverlayWhyChooseUsSection";
import { LuxuryBlogSection } from "@/templates/service-business/LuxuryBlogSection";
import { LuxuryContactSection } from "@/templates/service-business/LuxuryContactSection";
import { LuxuryFaqSection } from "@/templates/service-business/LuxuryFaqSection";
import { LuxuryReviewsSection } from "@/templates/service-business/LuxuryReviewsSection";
import { LuxuryServicesSection } from "@/templates/service-business/LuxuryServicesSection";
import { LuxuryStrategySection } from "@/templates/service-business/LuxuryStrategySection";
import { FaqAccordion } from "@/templates/service-business/FaqAccordion";
import type { ParsedSiteContent } from "@/templates/service-business/content";
import {
  badgePill,
  bodyText,
  contactCard,
  outlineBtn,
  primaryBtn,
  sectionContainer,
  sectionHeading,
  sectionLead,
  sectionY,
  statCard,
} from "@/templates/service-business/template-styles";
import {
  resolveTemplateHref,
  type TemplatePaths,
} from "@/templates/service-business/paths";

const CHIP_ICONS = [Home, Building2, Sparkles, Wrench, Leaf, ShieldCheck];
const TRUST_ICONS = [UserCheck, Leaf, ShieldCheck, Clock];
const WHY_ICONS = [MapPin, BadgeCheck, ShieldCheck, CalendarCheck];
const AVATAR_COLORS = ["#2563eb", "#0ea5e9", "#6366f1", "#8b5cf6"];

const PLACEHOLDER_STYLES: { from: string; to: string; icon: LucideIcon }[] = [
  { from: "#dbeafe", to: "#93c5fd", icon: Home },
  { from: "#e0e7ff", to: "#a5b4fc", icon: Building2 },
  { from: "#d1fae5", to: "#6ee7b7", icon: Sparkles },
  { from: "#fef3c7", to: "#fcd34d", icon: Wrench },
  { from: "#fce7f3", to: "#f9a8d4", icon: Leaf },
  { from: "#e0f2fe", to: "#7dd3fc", icon: ShieldCheck },
];

type Props = {
  site: ParsedSiteContent;
  bookingUrl?: string | null;
  paths: TemplatePaths;
  skipHero?: boolean;
  homeLayout?: "classic" | "luxury" | "modern-overlay";
};

function ServiceImage({
  src,
  alt,
  className,
  index = 0,
}: {
  src?: string;
  alt: string;
  className?: string;
  index?: number;
}) {
  if (!src) {
    const style = PLACEHOLDER_STYLES[index % PLACEHOLDER_STYLES.length];
    const Icon = style.icon;
    return (
      <div
        className={`flex h-full min-h-[inherit] flex-col items-center justify-center gap-3 bg-gradient-to-br px-4 text-center ${className ?? ""}`}
        style={{
          backgroundImage: `linear-gradient(135deg, ${style.from}, ${style.to})`,
        }}
      >
        <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white/80 text-slate-700 shadow-sm">
          <Icon className="h-7 w-7" />
        </span>
        <span className="text-sm font-semibold text-slate-700">{alt}</span>
      </div>
    );
  }
  return (
    <Image
      src={src}
      alt={alt}
      width={640}
      height={400}
      className={`block object-cover ${className ?? ""}`}
      unoptimized
    />
  );
}

function AvatarStack() {
  return (
    <div className="flex -space-x-2">
      {AVATAR_COLORS.map((color, i) => (
        <span
          key={color}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white"
          style={{ backgroundColor: color }}
        >
          {String.fromCharCode(65 + i)}
        </span>
      ))}
    </div>
  );
}

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden>
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export function ServiceBusinessHome({
  site,
  bookingUrl,
  paths,
  skipHero = false,
  homeLayout = "classic",
}: Props) {
  const { hero, theme, services, contact, topbar } = site;
  const phoneHref = topbar.phone.replace(/\s+/g, "");
  const bookHref = bookingUrl ?? resolveTemplateHref(hero.ctaHref, paths);
  const quoteHref = resolveTemplateHref(hero.secondaryCtaHref, paths);
  const whyBookHref = resolveTemplateHref(site.whyChooseUs.ctaHref, paths);
  const finalBookHref = resolveTemplateHref(site.finalCta.primaryHref, paths);
  const finalQuoteHref = resolveTemplateHref(site.finalCta.secondaryHref, paths);
  const whatsappHref = site.whyChooseUs.whatsapp
    ? `https://wa.me/${site.whyChooseUs.whatsapp.replace(/\D/g, "")}`
    : null;

  const displayServices = services.items.slice(0, 6);
  const serviceChips = site.serviceChips.slice(0, 6);
  const primaryMosaic = site.whyChooseUs.image || displayServices[0]?.image;
  const mosaicImages: (string | undefined)[] = [
    primaryMosaic,
    displayServices[1]?.image && displayServices[1].image !== primaryMosaic
      ? displayServices[1].image
      : undefined,
    displayServices[2]?.image &&
    displayServices[2].image !== primaryMosaic &&
    displayServices[2].image !== displayServices[1]?.image
      ? displayServices[2].image
      : undefined,
  ];

  const stats = [
    { label: "Established", value: site.socialProof.establishedYear },
    { label: "Jobs completed", value: site.socialProof.jobsCompleted, highlight: true },
    { label: "Google rating", value: hero.rating, stars: true },
    { label: "Satisfaction rate", value: site.socialProof.satisfactionRate },
    { label: "Response time", value: site.socialProof.responseTime },
  ];

  const locationLabel = contact.address || topbar.serviceArea;

  return (
    <>
      {!skipHero ? (
      <section className="bg-white pb-8 pt-12 lg:pb-12 lg:pt-20">
        <div className={`${sectionContainer} grid gap-10 lg:grid-cols-2 lg:items-start lg:gap-16`}>
          <div>
            <span
              className={`${badgePill} bg-blue-50`}
              style={{ color: theme.accent }}
            >
              {hero.badge}
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.1] tracking-tight text-slate-900 sm:text-5xl lg:text-[3.25rem]">
              {hero.title}
            </h1>
            <p className="mt-4 text-2xl font-bold sm:text-3xl" style={{ color: theme.accent }}>
              {hero.startingPrice}
            </p>
            <p className={`mt-5 max-w-xl ${sectionLead}`}>{hero.subtitle}</p>

            <ul className="mt-6 space-y-3">
              {hero.trustBullets.map((bullet) => (
                <li key={bullet} className="flex items-start gap-3 text-base text-slate-700 sm:text-lg">
                  <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" strokeWidth={2.5} />
                  {bullet}
                </li>
              ))}
            </ul>

            <div className="mt-10 flex flex-wrap gap-4">
              <a href={bookHref} className={primaryBtn} style={{ backgroundColor: theme.accent }}>
                {hero.ctaLabel}
                <ArrowRight className="h-5 w-5" />
              </a>
              <a
                href={quoteHref}
                className={outlineBtn}
                style={{ borderColor: theme.accent, color: theme.accent }}
              >
                {hero.secondaryCtaLabel}
              </a>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-5 py-4">
              <span className="text-sm font-bold uppercase tracking-wide text-slate-500">Google</span>
              <div className="flex text-amber-400">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-5 w-5 fill-current" />
                ))}
              </div>
              <p className="text-base font-bold text-slate-900 sm:text-lg">{hero.rating} on Google</p>
              <p className="text-base text-slate-600">{hero.ratingCount}</p>
              <AvatarStack />
            </div>

            {serviceChips.length > 0 ? (
              <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {serviceChips.map((chip, index) => {
                  const Icon = CHIP_ICONS[index % CHIP_ICONS.length];
                  return (
                    <div
                      key={`${chip.title}-${index}`}
                      className="flex min-h-[5.5rem] items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm"
                    >
                      <span
                        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white shadow-md"
                        style={{ backgroundColor: theme.accent }}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-bold leading-snug text-slate-900 sm:text-base">
                          {chip.title}
                        </p>
                        <p className="mt-0.5 text-sm font-semibold text-slate-600">{chip.priceFrom}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-3xl shadow-xl ring-1 ring-slate-200/80">
              <ServiceImage
                src={hero.image}
                alt={hero.imageAlt}
                className="h-56 w-full sm:h-64 lg:h-72"
                index={0}
              />
            </div>
            <div className="absolute bottom-6 left-6 flex items-center gap-4 rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-xl">
              <span
                className="inline-flex h-12 w-12 items-center justify-center rounded-full text-white"
                style={{ backgroundColor: theme.accent }}
              >
                <Users className="h-5 w-5" />
              </span>
              <div>
                <p className="text-base font-bold text-slate-900">{hero.floatingStatValue}</p>
                <p className="text-sm text-slate-600">{hero.floatingStatLabel}</p>
              </div>
            </div>
          </div>
        </div>
      </section>
      ) : null}

      {skipHero && serviceChips.length > 0 ? (
        <section
          className={
            homeLayout === "modern-overlay"
              ? "bg-[#f7f5f0] py-10"
              : "border-b border-[#2d2926]/10 bg-[#f5f3e7] py-10"
          }
        >
          <div className={`${sectionContainer} grid gap-4 sm:grid-cols-3`}>
            {serviceChips.slice(0, 3).map((chip, index) => {
              const Icon = CHIP_ICONS[index % CHIP_ICONS.length];
              const isOverlay = homeLayout === "modern-overlay";
              return (
                <div
                  key={`${chip.title}-${index}`}
                  className={
                    isOverlay
                      ? "flex min-h-[5.5rem] items-center gap-4 rounded-2xl border border-slate-200/80 bg-[#ebe7d8] px-5 py-4 shadow-sm"
                      : "flex min-h-[5.5rem] items-center gap-4 rounded-sm border border-[#2d2926]/10 bg-[#ebe7d8] px-5 py-4"
                  }
                >
                  <span
                    className={
                      isOverlay
                        ? "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-white"
                        : "inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#2a2018] text-[#f2f0e6]"
                    }
                    style={isOverlay ? { backgroundColor: theme.accent } : undefined}
                  >
                    <Icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p
                      className={
                        isOverlay
                          ? "text-sm font-semibold text-slate-900 sm:text-base"
                          : "text-sm font-medium text-[#2d2926] sm:text-base"
                      }
                    >
                      {chip.title}
                    </p>
                    <p
                      className={
                        isOverlay
                          ? "mt-0.5 text-sm text-slate-500"
                          : "mt-0.5 text-sm text-[#2d2926]/60"
                      }
                    >
                      {chip.priceFrom}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      {skipHero && homeLayout === "modern-overlay" ? (
        <ModernOverlayAboutSection site={site} paths={paths} />
      ) : null}
      {skipHero && homeLayout === "luxury" ? (
        <LuxuryAboutSection site={site} paths={paths} />
      ) : null}

      {!skipHero ? (
      <section className="py-20 lg:py-24" style={{ backgroundColor: theme.primary }}>
        <div className={`${sectionContainer} grid gap-6 sm:grid-cols-2 lg:grid-cols-4`}>
          {site.trustBand.map((item, index) => {
            const Icon = TRUST_ICONS[index % TRUST_ICONS.length];
            return (
              <div
                key={item.title}
                className="flex flex-col rounded-2xl border border-white/10 bg-white/5 p-8 text-center sm:text-left"
              >
                <span className="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-xl bg-white/10 sm:mx-0">
                  <Icon className="h-7 w-7 text-sky-300" strokeWidth={1.5} />
                </span>
                <p className="mt-5 text-lg font-semibold leading-snug text-white">{item.title}</p>
                {item.description ? (
                  <p className="mt-2 text-base leading-relaxed text-slate-300">{item.description}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
      ) : null}

      {skipHero && homeLayout === "modern-overlay" ? (
        <ModernOverlayServicesSection site={site} />
      ) : skipHero ? (
        <LuxuryServicesSection site={site} paths={paths} bookingUrl={bookHref} />
      ) : (
      <section id="services" className={`bg-white ${sectionY}`}>
        <div className={sectionContainer}>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <h2 className={sectionHeading}>{services.heading}</h2>
              <p className={sectionLead}>{services.subtitle}</p>
            </div>
            <a
              href={paths.services}
              className="inline-flex items-center gap-2 text-base font-semibold"
              style={{ color: theme.accent }}
            >
              View all services
              <ArrowRight className="h-5 w-5" />
            </a>
          </div>
          <ul className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {displayServices.map((item, index) => {
              const Icon = CHIP_ICONS[index % CHIP_ICONS.length];
              return (
                <li
                  key={`${item.title}-${index}`}
                  className="group overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:shadow-lg"
                >
                  <div className="relative aspect-[4/3] overflow-hidden bg-slate-100">
                    <ServiceImage
                      src={item.image}
                      alt={item.imageAlt ?? item.title}
                      className="h-full w-full"
                      index={index}
                    />
                    <span
                      className="absolute bottom-4 left-4 inline-flex h-11 w-11 items-center justify-center rounded-full text-white shadow-lg"
                      style={{ backgroundColor: theme.accent }}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                  </div>
                  <div className="p-6">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="text-xl font-bold text-slate-900">{item.title}</h3>
                      <span className="shrink-0 text-base font-bold" style={{ color: theme.accent }}>
                        {item.priceFrom || hero.startingPrice}
                      </span>
                    </div>
                    <p className={`mt-3 ${bodyText}`}>
                      {item.description ||
                        "Professional service delivered by our trusted local team."}
                    </p>
                    <a
                      href={bookHref}
                      className="mt-5 inline-flex items-center gap-2 text-base font-semibold group-hover:gap-3"
                      style={{ color: theme.accent }}
                    >
                      Book this service
                      <ChevronRight className="h-4 w-4" />
                    </a>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      </section>
      )}

      {skipHero && homeLayout === "modern-overlay" ? (
        <ModernOverlayWorkProcessSection site={site} />
      ) : null}

      {skipHero && homeLayout === "modern-overlay" ? (
        <ModernOverlayWhyChooseUsSection site={site} />
      ) : null}

      {!skipHero ? (
      <section className={`bg-slate-50 ${sectionY}`}>
        <div className={`${sectionContainer} grid gap-14 lg:grid-cols-2 lg:items-center`}>
          <div className="relative grid grid-cols-2 gap-4">
            <div className="row-span-2 overflow-hidden rounded-2xl shadow-lg">
              <ServiceImage
                src={mosaicImages[0]}
                alt={site.whyChooseUs.imageAlt}
                className="aspect-[3/4] h-full w-full min-h-[280px] sm:min-h-[360px]"
                index={0}
              />
            </div>
            <div className="overflow-hidden rounded-2xl shadow-md">
              <ServiceImage src={mosaicImages[1]} alt="" className="aspect-[4/3] w-full" index={1} />
            </div>
            <div className="overflow-hidden rounded-2xl shadow-md">
              <ServiceImage src={mosaicImages[2]} alt="" className="aspect-[4/3] w-full" index={2} />
            </div>
            <div className="absolute bottom-4 left-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-base font-semibold text-slate-900 shadow-lg">
              <MapPin className="h-4 w-4" style={{ color: theme.accent }} />
              Locally owned & operated
            </div>
          </div>
          <div>
            <h2 className={sectionHeading}>{site.whyChooseUs.heading}</h2>
            <p className={`mt-5 ${sectionLead}`}>{site.whyChooseUs.body}</p>
            <div className="mt-8 flex flex-wrap gap-4">
              <a
                href={whyBookHref}
                className={primaryBtn}
                style={{ backgroundColor: theme.accent }}
              >
                {site.whyChooseUs.ctaLabel}
                <ArrowRight className="h-5 w-5" />
              </a>
              {whatsappHref ? (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-emerald-500 bg-white px-7 py-4 text-base font-semibold text-emerald-600 transition hover:bg-emerald-50"
                >
                  <WhatsAppIcon className="h-5 w-5" />
                  Chat on WhatsApp
                </a>
              ) : null}
            </div>
            <ul className="mt-10 grid gap-5 sm:grid-cols-2">
              {site.whyChooseUs.benefits.map((b, index) => {
                const Icon = WHY_ICONS[index % WHY_ICONS.length];
                return (
                  <li key={b.title} className="flex gap-4">
                    <span
                      className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${theme.accent}15`, color: theme.accent }}
                    >
                      <Icon className="h-5 w-5" />
                    </span>
                    <div>
                      <p className="text-base font-semibold text-slate-900">{b.title}</p>
                      {b.description ? (
                        <p className="mt-1 text-base text-slate-600">{b.description}</p>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </section>
      ) : null}

      {skipHero && homeLayout === "luxury" ? <LuxuryStrategySection site={site} /> : null}

      {!skipHero ? (
      <section className="border-y border-slate-200 bg-white py-14 sm:py-16">
        <div className={`${sectionContainer} grid gap-5 sm:grid-cols-2 lg:grid-cols-5`}>
          {stats.map((stat) => (
            <div
              key={stat.label}
              className={`${statCard} ${
                stat.highlight
                  ? "text-white shadow-lg"
                  : "border border-slate-200 bg-white shadow-sm"
              }`}
              style={stat.highlight ? { backgroundColor: theme.accent } : undefined}
            >
              <p
                className={`text-xs font-bold uppercase tracking-wider sm:text-sm ${
                  stat.highlight ? "text-blue-100" : "text-slate-500"
                }`}
              >
                {stat.label}
              </p>
              {stat.stars ? (
                <div className="mt-3 flex justify-center text-amber-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-current" />
                  ))}
                </div>
              ) : null}
              <p
                className={`mt-3 text-3xl font-bold ${
                  stat.highlight ? "text-white" : "text-slate-900"
                }`}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </section>
      ) : null}

      {skipHero && homeLayout === "modern-overlay" ? (
        <ModernOverlayFeatureBannerSection site={site} />
      ) : skipHero ? (
        <LuxuryBlogSection site={site} paths={paths} />
      ) : (
      <section className={`bg-slate-50 ${sectionY}`}>
        <div className={sectionContainer}>
          <h2 className={`text-center ${sectionHeading}`}>{site.howItWorks.heading}</h2>
          <ol className="mt-12 flex flex-col gap-6 lg:flex-row lg:items-stretch lg:gap-0">
            {site.howItWorks.steps.map((step, index) => {
              const icons = [CalendarCheck, Users, Truck, Star];
              const Icon = icons[index % icons.length];
              const isLast = index === site.howItWorks.steps.length - 1;
              return (
                <li key={step.title} className="flex flex-1 items-stretch">
                  <div className="flex h-full flex-1 flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <span
                      className="inline-flex h-12 w-12 items-center justify-center rounded-full text-lg font-bold text-white shadow-md"
                      style={{ backgroundColor: theme.accent }}
                    >
                      {index + 1}
                    </span>
                    <Icon className="mt-5 h-6 w-6 text-slate-400" strokeWidth={1.5} />
                    <p className="mt-4 text-lg font-bold text-slate-900">{step.title}</p>
                    <p className={`mt-3 flex-1 ${bodyText}`}>{step.description}</p>
                  </div>
                  {!isLast ? (
                    <div className="hidden shrink-0 items-center px-3 lg:flex">
                      <ArrowRight className="h-6 w-6 text-slate-300" style={{ color: theme.accent }} />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>
        </div>
      </section>
      )}

      {skipHero && homeLayout === "modern-overlay" ? (
        <ModernOverlayTransformSection site={site} />
      ) : skipHero ? (
        <LuxuryReviewsSection site={site} paths={paths} />
      ) : (
      <section className="py-14 sm:py-16" style={{ backgroundColor: theme.primary }}>
        <div className={sectionContainer}>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-8 sm:p-10 lg:p-12">
            <div className="grid items-center gap-10 lg:grid-cols-12">
              <div className="lg:col-span-3">
                <p className="text-sm font-bold uppercase tracking-wide text-slate-300">Google Reviews</p>
                <div className="mt-3 flex text-amber-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-5 w-5 fill-current" />
                  ))}
                </div>
                <p className="mt-3 text-3xl font-bold text-white">{hero.rating}</p>
                <p className="mt-1 text-base text-slate-300">{site.socialProof.googleReviews}</p>
              </div>
              <blockquote className="lg:col-span-6">
                <p className="text-xl font-medium italic leading-relaxed text-white sm:text-2xl">
                  &ldquo;{site.socialProof.reviewQuote}&rdquo;
                </p>
                <footer className="mt-4 text-base font-semibold text-slate-200">
                  — {site.socialProof.reviewAuthor}
                </footer>
              </blockquote>
              <div className="lg:col-span-3 lg:flex lg:justify-end">
                <a
                  href={paths.reviews}
                  className="inline-flex w-full items-center justify-center rounded-xl border-2 border-white/40 px-6 py-4 text-base font-semibold text-white transition hover:bg-white/10 lg:w-auto"
                >
                  Read all reviews
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
      )}

      {skipHero && homeLayout === "modern-overlay" ? (
        <ModernOverlayTestimonialsSection site={site} />
      ) : skipHero ? (
        <LuxuryFaqSection site={site} paths={paths} bookingUrl={bookHref} />
      ) : (
      <section id="faq" className={`bg-white ${sectionY}`}>
        <div className={`${sectionContainer} grid gap-12 lg:grid-cols-2 lg:gap-16`}>
          <div>
            <h2 className={sectionHeading}>{site.faq.heading}</h2>
            <p className={sectionLead}>{site.faq.body}</p>
            <div className="mt-8">
              <FaqAccordion items={site.faq.items} />
            </div>
            <a
              href={paths.faq}
              className={`mt-6 inline-flex items-center gap-2 text-base font-semibold`}
              style={{ color: theme.accent }}
            >
              View all FAQs
              <ArrowRight className="h-4 w-4" />
            </a>
          </div>

          <div>
            <h2 className={sectionHeading}>{site.serviceAreas.heading}</h2>
            <p className={sectionLead}>{site.serviceAreas.intro}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              {site.serviceAreas.popular.map((area) => (
                <span
                  key={area}
                  className="rounded-full px-5 py-2 text-base font-semibold text-white"
                  style={{ backgroundColor: theme.accent }}
                >
                  {area}
                </span>
              ))}
            </div>
            <ul className="mt-8 grid gap-3 sm:grid-cols-2">
              {site.serviceAreas.areas.map((area) => (
                <li key={area} className="flex items-center gap-2.5 text-base text-slate-700">
                  <Check className="h-4 w-4 shrink-0 text-emerald-600" strokeWidth={2.5} />
                  {area}
                </li>
              ))}
            </ul>
            <a
              href={paths.contact}
              className={`mt-8 ${primaryBtn}`}
              style={{ backgroundColor: theme.accent }}
            >
              {site.serviceAreas.ctaLabel}
            </a>
          </div>
        </div>
      </section>
      )}

      {skipHero && homeLayout === "modern-overlay" ? (
        <ModernOverlayCraftsmanshipSection site={site} />
      ) : null}

      {skipHero && homeLayout === "modern-overlay" ? (
        <ModernOverlayFaqSection site={site} />
      ) : null}

      {skipHero && homeLayout === "modern-overlay" ? (
        <ModernOverlayBlogSection site={site} paths={paths} />
      ) : null}

      {!skipHero ? (
      <section className={sectionY}>
        <div className={sectionContainer}>
          <div
            className="overflow-hidden rounded-3xl p-8 sm:p-10 lg:p-12"
            style={{ backgroundColor: theme.primary }}
          >
            <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-16">
              <div className="text-white">
                <h2 className="text-3xl font-bold sm:text-4xl">{site.finalCta.heading}</h2>
                <p className="mt-4 text-base text-slate-300 sm:text-lg">{site.finalCta.body}</p>
                <div className="mt-8 flex flex-wrap gap-4">
                  <a
                    href={finalBookHref}
                    className={primaryBtn}
                    style={{ backgroundColor: theme.accent }}
                  >
                    {site.finalCta.primaryLabel}
                    <ArrowRight className="h-5 w-5" />
                  </a>
                  <a
                    href={finalQuoteHref}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border-2 border-white/40 bg-transparent px-7 py-4 text-base font-semibold text-white transition hover:bg-white/10"
                  >
                    {site.finalCta.secondaryLabel}
                  </a>
                </div>
              </div>
              <div className="flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 sm:p-8">
                <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
                  <ShieldCheck className="h-7 w-7 text-emerald-400" />
                </span>
                <div>
                  <p className="text-lg font-bold text-white">Satisfaction Guaranteed</p>
                  <p className="mt-1 text-base text-slate-300">{site.finalCta.guaranteeText}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      ) : null}

      {skipHero && homeLayout === "modern-overlay" ? null : skipHero ? (
        <LuxuryContactSection site={site} bookingUrl={bookHref} />
      ) : (
      <section className={`bg-slate-50 ${sectionY}`}>
        <div className={sectionContainer}>
          <h2 className={sectionHeading}>{contact.heading}</h2>
          <p className={sectionLead}>
            Reach us for quotes, scheduling, or questions about service in {topbar.serviceArea}.
          </p>

          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {topbar.phone ? (
              <a
                href={`tel:${phoneHref}`}
                className={`${contactCard} transition hover:shadow-md`}
              >
                <span
                  className="inline-flex h-12 w-12 items-center justify-center rounded-xl text-white"
                  style={{ backgroundColor: theme.accent }}
                >
                  <Phone className="h-5 w-5" />
                </span>
                <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Call us
                </p>
                <p className="mt-2 text-lg font-bold text-slate-900">{topbar.phone}</p>
              </a>
            ) : null}

            {topbar.email ? (
              <a
                href={`mailto:${topbar.email}`}
                className={`${contactCard} transition hover:shadow-md`}
              >
                <span
                  className="inline-flex h-12 w-12 items-center justify-center rounded-xl text-white"
                  style={{ backgroundColor: theme.accent }}
                >
                  <Mail className="h-5 w-5" />
                </span>
                <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Email us
                </p>
                <p className="mt-2 break-all text-lg font-bold text-slate-900">{topbar.email}</p>
              </a>
            ) : null}

            <div className={contactCard}>
              <span
                className="inline-flex h-12 w-12 items-center justify-center rounded-xl text-white"
                style={{ backgroundColor: theme.accent }}
              >
                <Clock className="h-5 w-5" />
              </span>
              <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-slate-500">
                Business hours
              </p>
              <p className="mt-2 text-lg font-bold text-slate-900">{topbar.hours}</p>
            </div>

            {locationLabel ? (
              contact.address ? (
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(contact.address)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`${contactCard} transition hover:shadow-md`}
                >
                  <span
                    className="inline-flex h-12 w-12 items-center justify-center rounded-xl text-white"
                    style={{ backgroundColor: theme.accent }}
                  >
                    <MapPin className="h-5 w-5" />
                  </span>
                  <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Service location
                  </p>
                  <p className="mt-2 text-lg font-bold text-slate-900">{locationLabel}</p>
                </a>
              ) : (
                <div className={contactCard}>
                  <span
                    className="inline-flex h-12 w-12 items-center justify-center rounded-xl text-white"
                    style={{ backgroundColor: theme.accent }}
                  >
                    <MapPin className="h-5 w-5" />
                  </span>
                  <p className="mt-5 text-sm font-semibold uppercase tracking-wide text-slate-500">
                    Service location
                  </p>
                  <p className="mt-2 text-lg font-bold text-slate-900">{locationLabel}</p>
                </div>
              )
            ) : null}
          </div>
        </div>
      </section>
      )}
    </>
  );
}
