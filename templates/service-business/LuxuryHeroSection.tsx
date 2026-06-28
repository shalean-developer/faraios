import { ArrowUpRight } from "lucide-react";

import type { ParsedSiteContent } from "@/templates/service-business/content";
import { LuxuryImage } from "@/templates/service-business/LuxuryImage";
import { LuxurySiteHeader } from "@/templates/service-business/LuxurySiteHeader";
import { LUXURY_HERO_FALLBACK, resolveLuxuryImageUrl } from "@/templates/service-business/luxury-fallback-images";
import type { TemplatePaths } from "@/templates/service-business/paths";
import { luxury } from "@/templates/service-business/luxury-styles";

type Props = {
  site: ParsedSiteContent;
  paths: TemplatePaths;
  bookingUrl?: string | null;
};

export function LuxuryHeroSection({ site, paths, bookingUrl }: Props) {
  const { hero, whyChooseUs, socialProof, services } = site;
  const heroImage = resolveLuxuryImageUrl(hero.image, 0) || LUXURY_HERO_FALLBACK;
  const testimonialImage = resolveLuxuryImageUrl(
    whyChooseUs.image || services.items[0]?.image || hero.image,
    1
  );
  const aboutHref = paths.about;

  return (
    <section className="relative min-h-[min(920px,100svh)] overflow-hidden bg-[#1f1612]">
      <div className="absolute inset-0">
        <LuxuryImage
          src={heroImage}
          alt={hero.imageAlt}
          fill
          priority
          fallbackIndex={0}
        />
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(20,14,10,0.35) 0%, rgba(20,14,10,0.25) 45%, rgba(20,14,10,0.88) 100%)",
          }}
        />
      </div>

      <LuxurySiteHeader
        site={site}
        paths={paths}
        bookingUrl={bookingUrl}
        overlay
        activePage="home"
      />

      {/* Headline */}
      <div className="relative z-10 mx-auto flex max-w-7xl flex-col justify-end px-5 pb-8 pt-32 sm:px-8 sm:pb-10 lg:min-h-[58vh] lg:pt-40">
        <div className="max-w-3xl">
          <h1
            className="text-[clamp(2.5rem,6vw,4.5rem)] font-medium leading-[1.05] tracking-tight text-[#f5f0e8]"
            style={{ fontFamily: luxury.serif }}
          >
            {hero.title}
          </h1>
          <p
            className="mt-4 max-w-xl text-xl italic leading-relaxed text-[#e8dfd0]/95 sm:text-2xl"
            style={{ fontFamily: luxury.serif }}
          >
            {hero.subtitle}
          </p>
        </div>
      </div>

      {/* Bottom dock */}
      <div
        className="relative z-10 border-t"
        style={{ borderColor: luxury.border, backgroundColor: luxury.overlayDeep }}
      >
        <div className="mx-auto grid max-w-7xl lg:grid-cols-2">
          {/* Testimonial */}
          <div
            className="border-b px-5 py-8 sm:px-8 sm:py-10 lg:border-b-0 lg:border-r"
            style={{ borderColor: luxury.border }}
          >
            <p
              className="text-xs font-semibold uppercase tracking-[0.2em] text-[#c9baa8]"
              style={{ fontFamily: luxury.sans }}
            >
              {hero.badge}
            </p>
            <div className="mt-5 flex gap-5">
              <div className="relative h-24 w-28 shrink-0 overflow-hidden rounded-sm bg-[#2a2018] sm:h-28 sm:w-32">
                <LuxuryImage src={testimonialImage} alt="" fill fallbackIndex={1} />
              </div>
              <div className="min-w-0 flex-1">
                <blockquote
                  className="text-lg leading-relaxed text-[#f5f0e8] sm:text-xl"
                  style={{ fontFamily: luxury.serif }}
                >
                  &ldquo;{socialProof.reviewQuote}&rdquo;
                </blockquote>
                <footer
                  className="mt-3 text-sm font-medium text-[#c9baa8]"
                  style={{ fontFamily: luxury.sans }}
                >
                  {socialProof.reviewAuthor}
                </footer>
              </div>
            </div>
          </div>

          {/* About */}
          <div className="px-5 py-8 sm:px-8 sm:py-10">
            <p
              className="text-xs font-semibold uppercase tracking-[0.2em] text-[#c9baa8]"
              style={{ fontFamily: luxury.sans }}
            >
              About Us
            </p>
            <p
              className="mt-4 max-w-lg text-2xl leading-snug text-[#f5f0e8] sm:text-[1.75rem]"
              style={{ fontFamily: luxury.serif }}
            >
              {whyChooseUs.body}
            </p>
            <a
              href={aboutHref}
              className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#e8dfd0] transition hover:text-white"
              style={{ fontFamily: luxury.sans }}
            >
              Learn More
              <ArrowUpRight className="h-4 w-4" strokeWidth={2} />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
