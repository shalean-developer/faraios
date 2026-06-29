import { Phone } from "lucide-react";

import type { ParsedSiteContent } from "@/templates/service-business/content";
import { LuxuryImage } from "@/templates/service-business/LuxuryImage";
import { luxuryFallbackImage } from "@/templates/service-business/luxury-fallback-images";
import { sectionContainer } from "@/templates/service-business/template-styles";

type Props = {
  site: ParsedSiteContent;
};

const DEFAULT_FEATURES = [
  "Modern designs that enhance daily living",
  "Durable materials ensure long-lasting quality.",
];

const DEFAULT_BODY =
  "Expert Craftsmanship Guaranteed. Our skilled team brings years of experience and meticulous attention to every renovation project.";

function CollageImage({
  src,
  alt,
  className,
  fallbackIndex,
}: {
  src?: string;
  alt: string;
  className?: string;
  fallbackIndex: number;
}) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-slate-200 ${className ?? ""}`}>
      <LuxuryImage
        src={src || luxuryFallbackImage(fallbackIndex)}
        alt={alt}
        fill
        fallbackIndex={fallbackIndex}
      />
    </div>
  );
}

export function ModernOverlayCraftsmanshipSection({ site }: Props) {
  const { craftsmanship, topbar, theme } = site;
  const features =
    craftsmanship.features.length >= 2
      ? craftsmanship.features.slice(0, 2)
      : DEFAULT_FEATURES;

  const imageMain = craftsmanship.image?.trim() || luxuryFallbackImage(0);
  const imageTop = craftsmanship.imageSecondary?.trim() || luxuryFallbackImage(1);
  const imageBottom = craftsmanship.imageTertiary?.trim() || luxuryFallbackImage(2);

  const phone = craftsmanship.phone?.trim() || topbar.phone?.trim();
  const phoneHref = phone ? `tel:${phone.replace(/\s+/g, "")}` : null;

  return (
    <section id="craftsmanship" className="bg-white py-16 sm:py-20 lg:py-24">
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
              {craftsmanship.label}
            </p>
            <h2 className="mt-4 max-w-xl text-[clamp(2rem,4vw,3.25rem)] font-bold leading-[1.12] tracking-tight text-slate-900">
              {craftsmanship.heading}
            </h2>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-slate-600 sm:text-lg">
              {craftsmanship.body || DEFAULT_BODY}
            </p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 sm:gap-6">
              {features.map((feature) => (
                <p key={feature} className="text-base leading-relaxed text-slate-700 sm:text-lg">
                  {feature}
                </p>
              ))}
            </div>
            {phone ? (
              <div className="mt-10 flex items-center gap-4">
                <span
                  className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white shadow-sm"
                  style={{ backgroundColor: theme.accent }}
                >
                  <Phone className="h-5 w-5" strokeWidth={2} />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {craftsmanship.phoneLabel}
                  </p>
                  {phoneHref ? (
                    <a
                      href={phoneHref}
                      className="mt-0.5 block text-xl font-bold text-slate-900 hover:underline sm:text-2xl"
                    >
                      {phone}
                    </a>
                  ) : (
                    <p className="mt-0.5 text-xl font-bold text-slate-900 sm:text-2xl">{phone}</p>
                  )}
                </div>
              </div>
            ) : null}
          </div>

          <div className="flex gap-3 sm:gap-4">
            <CollageImage
              src={imageMain}
              alt={craftsmanship.imageAlt || "Expert craftsmanship at work"}
              className="min-h-[320px] flex-[1.15] sm:min-h-[400px] lg:min-h-[460px]"
              fallbackIndex={0}
            />
            <div className="flex flex-1 flex-col gap-3 sm:gap-4">
              <CollageImage
                src={imageTop}
                alt="Modern kitchen renovation"
                className="min-h-[150px] flex-1 sm:min-h-[190px]"
                fallbackIndex={1}
              />
              <CollageImage
                src={imageBottom}
                alt="Finished living space"
                className="min-h-[150px] flex-1 sm:min-h-[190px]"
                fallbackIndex={2}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
