import { useId } from "react";
import { ArrowRight, Home } from "lucide-react";

import type { ParsedSiteContent } from "@/templates/service-business/content";
import { LuxuryImage } from "@/templates/service-business/LuxuryImage";
import { luxuryFallbackImage } from "@/templates/service-business/luxury-fallback-images";
import { sectionContainer } from "@/templates/service-business/template-styles";

type Props = {
  site: ParsedSiteContent;
};

const DEFAULT_BENEFITS = [
  "Transform Your Home Effortlessly",
  "Expert Craftsmanship You Can Trust",
  "Stress-Free Renovation Process",
];

const DEFAULT_BODY =
  "Why Hire Our Experts. Our team brings years of experience, skill, and creativity to every renovation project. We focus on quality, attention to detail, and delivering results that exceed expectations.";

function QualitySeal({ accent, label }: { accent: string; label: string }) {
  const ringId = useId().replace(/:/g, "");
  return (
    <div
      className="pointer-events-none absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2"
      aria-hidden
    >
      <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-white shadow-lg ring-1 ring-slate-200/80 sm:h-32 sm:w-32">
        <svg viewBox="0 0 120 120" className="absolute inset-0 h-full w-full" role="presentation">
          <defs>
            <path
              id={ringId}
              d="M 60,60 m -44,0 a 44,44 0 1,1 88,0 a 44,44 0 1,1 -88,0"
            />
          </defs>
          <text fill="#1e293b" fontSize="9.5" fontWeight="600" letterSpacing="0.04em">
            <textPath href={`#${ringId}`} startOffset="50%" textAnchor="middle">
              {`${label} ★ ${label} ★`}
            </textPath>
          </text>
        </svg>
        <span
          className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-md sm:h-16 sm:w-16"
          style={{ backgroundColor: accent }}
        >
          <Home className="h-7 w-7 sm:h-8 sm:w-8" strokeWidth={1.75} />
        </span>
      </div>
    </div>
  );
}

function SideImage({
  src,
  alt,
  fallbackIndex,
}: {
  src?: string;
  alt: string;
  fallbackIndex: number;
}) {
  return (
    <div className="relative min-h-[240px] flex-1 overflow-hidden rounded-2xl bg-slate-200 sm:min-h-[320px] lg:min-h-[380px]">
      <LuxuryImage
        src={src || luxuryFallbackImage(fallbackIndex)}
        alt={alt}
        fill
        fallbackIndex={fallbackIndex}
      />
    </div>
  );
}

export function ModernOverlayWhyChooseUsSection({ site }: Props) {
  const { whyChooseUs, theme } = site;

  const label = whyChooseUs.label || "Quality You Trust";
  const heading =
    whyChooseUs.heading === "Trusted by Local Customers" || !whyChooseUs.heading.trim()
      ? "Why Our Experts Stand Out"
      : whyChooseUs.heading;
  const body = whyChooseUs.body?.trim() || DEFAULT_BODY;
  const badgeText = whyChooseUs.badgeText || "Built with lasting quality";

  const benefits =
    whyChooseUs.benefits.length >= 3
      ? whyChooseUs.benefits.slice(0, 3).map((b) => b.title)
      : DEFAULT_BENEFITS;

  const imageLeft = whyChooseUs.image?.trim() || luxuryFallbackImage(0);
  const imageRight = whyChooseUs.imageSecondary?.trim() || luxuryFallbackImage(1);

  return (
    <section id="why-us" className="bg-[#f7f5f0] py-16 sm:py-20 lg:py-24">
      <div className={sectionContainer}>
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
          <div>
            <p
              className="flex items-center gap-2 text-sm font-medium"
              style={{ color: theme.accent }}
            >
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: theme.accent }}
                aria-hidden
              />
              {label}
            </p>
            <h2 className="mt-4 max-w-xl text-[clamp(2rem,4vw,3.25rem)] font-bold leading-[1.12] tracking-tight text-slate-900">
              {heading}
            </h2>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-slate-600 sm:text-lg">
              {body}
            </p>
            <ul className="mt-8 space-y-4">
              {benefits.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <ArrowRight
                    className="mt-0.5 h-5 w-5 shrink-0"
                    style={{ color: theme.accent }}
                    strokeWidth={2.25}
                  />
                  <span className="text-base font-medium text-slate-900 sm:text-lg">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="relative flex gap-3 sm:gap-4">
            <SideImage
              src={imageLeft}
              alt={whyChooseUs.imageAlt || "Craftsmanship detail"}
              fallbackIndex={0}
            />
            <SideImage
              src={imageRight}
              alt={whyChooseUs.imageSecondaryAlt || "Our expert team"}
              fallbackIndex={1}
            />
            <QualitySeal accent={theme.accent} label={badgeText} />
          </div>
        </div>
      </div>
    </section>
  );
}
