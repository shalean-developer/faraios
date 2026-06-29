"use client";

import { useState, type CSSProperties } from "react";
import { Check, ChevronDown } from "lucide-react";

import type { ParsedSiteContent } from "@/templates/service-business/content";
import { LuxuryImage } from "@/templates/service-business/LuxuryImage";
import { luxuryFallbackImage } from "@/templates/service-business/luxury-fallback-images";
import { sectionContainer } from "@/templates/service-business/template-styles";

type TransformSlide = {
  label: string;
  beforeImage: string;
  afterImage: string;
  thumbnailImage?: string;
};

type Props = {
  site: ParsedSiteContent;
};

const DEFAULT_FEATURES = ["Green Home Upgrade", "Smart Home Renovation"];

const DEFAULT_SLIDES: TransformSlide[] = [
  {
    label: "Home Planning",
    beforeImage:
      "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=900&q=80",
    afterImage:
      "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=900&q=80",
    thumbnailImage:
      "https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=200&q=80",
  },
  {
    label: "Dream Home",
    beforeImage:
      "https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=900&q=80",
    afterImage:
      "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=900&q=80",
    thumbnailImage:
      "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?auto=21&fit=crop&w=200&q=80",
  },
  {
    label: "Home Vision",
    beforeImage:
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=900&q=80",
    afterImage:
      "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?auto=format&fit=crop&w=900&q=80",
    thumbnailImage:
      "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=200&q=80",
  },
  {
    label: "Space Design",
    beforeImage:
      "https://images.unsplash.com/photo-1504148455328-c37690790506?auto=format&fit=crop&w=900&q=80",
    afterImage:
      "https://images.unsplash.com/photo-1600573472592-401b389b0cc3?auto=format&fit=crop&w=900&q=80",
    thumbnailImage:
      "https://images.unsplash.com/photo-1600585154526-990dced4db0d?auto=format&fit=crop&w=200&q=80",
  },
];

export function ModernOverlayTransformSection({ site }: Props) {
  const { transformShowcase, theme } = site;
  const slides =
    transformShowcase.slides.length >= 4
      ? transformShowcase.slides.slice(0, 4)
      : DEFAULT_SLIDES;
  const features =
    transformShowcase.features.length >= 2
      ? transformShowcase.features.slice(0, 2)
      : DEFAULT_FEATURES;

  const [activeIndex, setActiveIndex] = useState(0);
  const active = slides[activeIndex] ?? slides[0];

  return (
    <section id="transform" className="bg-white py-16 sm:py-20 lg:py-24">
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
              {transformShowcase.label}
            </p>
            <h2 className="mt-4 max-w-xl text-[clamp(2rem,4vw,3.25rem)] font-bold leading-[1.12] tracking-tight text-slate-900">
              {transformShowcase.heading}
            </h2>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-slate-600 sm:text-lg">
              {transformShowcase.body}
            </p>
            <div className="mt-10 flex flex-col gap-5 sm:flex-row sm:flex-wrap sm:gap-8">
              {features.map((feature) => (
                <div key={feature} className="flex items-center gap-3">
                  <span
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-white shadow-sm"
                    style={{ backgroundColor: theme.accent }}
                  >
                    <Check className="h-5 w-5" strokeWidth={2.5} />
                  </span>
                  <span className="text-base font-semibold text-slate-900 sm:text-lg">
                    {feature}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="relative overflow-hidden rounded-2xl bg-slate-200 shadow-sm ring-1 ring-slate-200/80">
              <div className="relative aspect-[4/5] w-full sm:aspect-[5/6]">
                <div className="absolute inset-0 bottom-1/2 top-0">
                  <LuxuryImage
                    src={active.beforeImage}
                    alt={`${active.label} before renovation`}
                    fill
                    fallbackIndex={0}
                  />
                </div>
                <div className="absolute inset-0 top-1/2 bottom-0">
                  <LuxuryImage
                    src={active.afterImage}
                    alt={`${active.label} after renovation`}
                    fill
                    fallbackIndex={1}
                  />
                </div>
                <div
                  className="pointer-events-none absolute inset-x-0 top-1/2 z-10 -translate-y-1/2"
                  aria-hidden
                >
                  <div className="relative flex items-center justify-center">
                    <div
                      className="absolute inset-x-0 h-px"
                      style={{ backgroundColor: theme.accent }}
                    />
                    <span
                      className="relative flex h-9 w-9 items-center justify-center rounded-full text-white shadow-md"
                      style={{ backgroundColor: theme.accent }}
                    >
                      <ChevronDown className="h-5 w-5" strokeWidth={2.25} />
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <ul className="mt-6 grid grid-cols-4 gap-3 sm:gap-4">
              {slides.map((slide, index) => {
                const isActive = index === activeIndex;
                const thumb =
                  slide.thumbnailImage ||
                  slide.afterImage ||
                  luxuryFallbackImage(index);
                return (
                  <li key={`${slide.label}-${index}`}>
                    <button
                      type="button"
                      onClick={() => setActiveIndex(index)}
                      className="group flex w-full flex-col items-center gap-2 text-center"
                    >
                      <span
                        className={`relative block h-14 w-14 overflow-hidden rounded-full transition sm:h-16 sm:w-16 ${
                          isActive ? "ring-2 ring-offset-2" : "opacity-80 hover:opacity-100"
                        }`}
                        style={
                          isActive
                            ? ({ "--tw-ring-color": theme.accent } as CSSProperties)
                            : undefined
                        }
                      >
                        <LuxuryImage
                          src={thumb}
                          alt={slide.label}
                          fill
                          fallbackIndex={index}
                          className="rounded-full"
                        />
                      </span>
                      <span
                        className={`text-xs font-medium sm:text-sm ${
                          isActive ? "text-slate-900" : "text-slate-500"
                        }`}
                      >
                        {slide.label}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
