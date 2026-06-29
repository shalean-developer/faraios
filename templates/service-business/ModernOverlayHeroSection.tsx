import { Star } from "lucide-react";

import type { ParsedSiteContent } from "@/templates/service-business/content";
import { LuxuryImage } from "@/templates/service-business/LuxuryImage";
import { LUXURY_HERO_FALLBACK, resolveLuxuryImageUrl } from "@/templates/service-business/luxury-fallback-images";
import { ModernOverlaySiteHeader } from "@/templates/service-business/ModernOverlaySiteHeader";
import {
  resolveTemplateHref,
  type TemplatePaths,
} from "@/templates/service-business/paths";

type Props = {
  site: ParsedSiteContent;
  paths: TemplatePaths;
  bookingUrl?: string | null;
};

export function ModernOverlayHeroSection({ site, paths, bookingUrl }: Props) {
  const { hero, theme } = site;
  const heroImage = resolveLuxuryImageUrl(hero.image, 0) || LUXURY_HERO_FALLBACK;
  const servicesHref = paths.services;
  const exploreHref = resolveTemplateHref(hero.ctaHref, paths) || servicesHref;
  const ratingValue = parseFloat(hero.rating) || 5;

  return (
    <section className="relative min-h-[min(900px,100svh)] overflow-hidden bg-[#1a1a1a]">
      <div className="absolute inset-0">
        <LuxuryImage src={heroImage} alt={hero.imageAlt} fill priority fallbackIndex={0} />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(105deg, rgba(0,0,0,0.62) 0%, rgba(0,0,0,0.35) 55%, rgba(0,0,0,0.2) 100%)",
          }}
        />
      </div>

      <ModernOverlaySiteHeader
        site={site}
        paths={paths}
        bookingUrl={bookingUrl}
        overlay
        activePage="home"
      />

      <div className="relative z-10 mx-auto flex max-w-7xl flex-col justify-center px-5 pb-16 pt-10 sm:px-8 sm:pb-20 lg:min-h-[520px]">
        <div className="max-w-2xl lg:max-w-3xl">
          <h1 className="text-[clamp(2rem,5vw,3.75rem)] font-bold leading-[1.08] tracking-tight text-white">
            {hero.title}
          </h1>
          <p className="mt-5 max-w-xl text-base leading-relaxed text-white/90 sm:text-lg">
            {hero.subtitle}
          </p>
          <a
            href={exploreHref}
            className="mt-8 inline-flex rounded-lg px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:opacity-90"
            style={{ backgroundColor: theme.accent }}
          >
            {hero.ctaLabel || "Explore Services"}
          </a>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <span
              className="inline-flex h-8 w-8 items-center justify-center rounded-full text-white"
              style={{ backgroundColor: theme.accent }}
              aria-hidden
            >
              <Star className="h-4 w-4 fill-current" />
            </span>
            <div className="flex text-amber-400">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-current" />
              ))}
            </div>
            <span className="text-sm font-semibold text-white">{ratingValue}/5</span>
            <span className="text-sm text-white/80">{hero.ratingCount}</span>
          </div>
        </div>
      </div>
    </section>
  );
}
