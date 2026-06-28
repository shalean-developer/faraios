import { ArrowUpRight } from "lucide-react";

import type { ParsedSiteContent } from "@/templates/service-business/content";
import { LuxuryImage } from "@/templates/service-business/LuxuryImage";
import { luxuryFallbackImage } from "@/templates/service-business/luxury-fallback-images";
import { luxury } from "@/templates/service-business/luxury-styles";
import { sectionContainer } from "@/templates/service-business/template-styles";
import type { TemplatePaths } from "@/templates/service-business/paths";

type Props = {
  site: ParsedSiteContent;
  paths: TemplatePaths;
};

function AboutImage({
  src,
  alt,
  className,
  fallbackIndex = 0,
}: {
  src?: string;
  alt: string;
  className?: string;
  fallbackIndex?: number;
}) {
  return (
    <div className={`relative overflow-hidden bg-[#d8d0c0] ${className ?? ""}`}>
      <LuxuryImage src={src || luxuryFallbackImage(fallbackIndex)} alt={alt} fill fallbackIndex={fallbackIndex} />
    </div>
  );
}

export function LuxuryAboutSection({ site, paths }: Props) {
  const { hero, whyChooseUs, services, topbar, businessName } = site;
  const serviceImages = services.items.slice(0, 3);

  const imageLeft = serviceImages[0]?.image || whyChooseUs.image || luxuryFallbackImage(0);
  const imageTall = whyChooseUs.image || serviceImages[1]?.image || luxuryFallbackImage(1);
  const imageRight = serviceImages[2]?.image || serviceImages[1]?.image || luxuryFallbackImage(2);

  const subheading = topbar.tagline || whyChooseUs.heading;

  return (
    <section className="bg-[#eae5d1] py-16 sm:py-20 lg:py-24">
      <div className={sectionContainer}>
        <p
          className="text-sm font-medium tracking-wide text-[#1f1612]/70"
          style={{ fontFamily: luxury.sans }}
        >
          <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-[#1f1612]/50" aria-hidden />
          About Us
        </p>
        <h2
          className="mt-4 max-w-4xl text-[clamp(2rem,4.5vw,3.75rem)] font-medium leading-[1.08] tracking-tight text-[#1f1612]"
          style={{ fontFamily: luxury.serif }}
        >
          {hero.title}
        </h2>

        <div className="mt-12 grid gap-6 lg:mt-16 lg:grid-cols-12 lg:gap-5 lg:items-start">
          <div className="lg:col-span-3">
            <AboutImage
              src={imageLeft}
              alt={serviceImages[0]?.imageAlt ?? whyChooseUs.imageAlt ?? businessName}
              className="aspect-square w-full"
              fallbackIndex={0}
            />
          </div>

          <div className="flex flex-col justify-center lg:col-span-4 lg:py-4">
            <h3
              className="text-2xl font-medium leading-snug text-[#1f1612] sm:text-3xl"
              style={{ fontFamily: luxury.serif }}
            >
              {subheading}
            </h3>
            <p
              className="mt-5 text-base leading-relaxed text-[#1f1612]/80 sm:text-lg"
              style={{ fontFamily: luxury.sans }}
            >
              {whyChooseUs.body}
            </p>
            <a
              href={paths.about}
              className="mt-8 inline-flex w-full max-w-xs items-stretch overflow-hidden rounded-sm bg-[#2a2018] text-[#eae5d1] shadow-md transition hover:bg-[#1f1612] sm:max-w-sm"
              style={{ fontFamily: luxury.sans }}
            >
              <span className="flex flex-1 items-center px-5 py-3.5 text-sm font-semibold">
                Learn More
              </span>
              <span className="flex w-12 shrink-0 items-center justify-center border-l border-[#eae5d1]/15 bg-[#342820]">
                <ArrowUpRight className="h-4 w-4" strokeWidth={2} />
              </span>
            </a>
          </div>

          <div className="lg:col-span-3">
            <AboutImage
              src={imageTall}
              alt={whyChooseUs.imageAlt || "Spa treatment"}
              className="aspect-[3/4] w-full lg:aspect-auto lg:min-h-[420px] lg:h-full"
              fallbackIndex={1}
            />
          </div>

          <div className="hidden lg:col-span-2 lg:block">
            <AboutImage
              src={imageRight}
              alt={serviceImages[2]?.title ?? "Wellness treatment"}
              className="min-h-[420px] w-full"
              fallbackIndex={2}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
