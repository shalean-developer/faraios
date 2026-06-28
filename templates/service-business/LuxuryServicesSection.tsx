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
  bookingUrl?: string | null;
};

export function LuxuryServicesSection({ site, paths, bookingUrl }: Props) {
  const { services, whyChooseUs, hero } = site;
  const items = services.items.slice(0, 4);
  const heroImage =
    items[0]?.image || whyChooseUs.image || hero.image || luxuryFallbackImage(3);
  const roomImage =
    items[1]?.image || whyChooseUs.image || luxuryFallbackImage(0);

  const headline =
    services.subtitle ||
    "Beyond quick fixes—we focus on sustainable recovery and preventative wellness.";

  const roomCaption =
    "Our therapy rooms offer a quiet escape. Temperature-controlled spaces ensure comfort.";

  return (
    <section id="services" className="bg-[#f2f0e6] py-16 sm:py-20 lg:py-24">
      <div className={sectionContainer}>
        <div className="grid gap-10 lg:grid-cols-12 lg:gap-8 lg:items-stretch">
          <div className="relative min-h-[360px] overflow-hidden bg-[#d8d0c0] lg:col-span-5 lg:min-h-[520px]">
            <LuxuryImage src={heroImage} alt="" fill fallbackIndex={3} />
          </div>

          <div className="flex flex-col lg:col-span-7">
            <p
              className="text-sm font-medium tracking-wide text-[#1f1612]/70"
              style={{ fontFamily: luxury.sans }}
            >
              <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-[#1f1612]/50" aria-hidden />
              Our Services
            </p>
            <h2
              className="mt-4 max-w-2xl text-[clamp(1.75rem,3.5vw,2.75rem)] font-medium leading-[1.12] text-[#1f1612]"
              style={{ fontFamily: luxury.serif }}
            >
              {headline}
            </h2>

            <a
              href={bookingUrl ?? paths.services}
              className="mt-8 inline-flex w-full max-w-xs items-stretch overflow-hidden rounded-sm bg-[#2a2018] text-[#f2f0e6] shadow-md transition hover:bg-[#1f1612] sm:max-w-sm"
              style={{ fontFamily: luxury.sans }}
            >
              <span className="flex flex-1 items-center px-5 py-3.5 text-sm font-semibold">
                Explore More
              </span>
              <span className="flex w-12 shrink-0 items-center justify-center border-l border-[#f2f0e6]/15 bg-[#342820]">
                <ArrowUpRight className="h-4 w-4" strokeWidth={2} />
              </span>
            </a>

            <ul className="mt-10 divide-y divide-[#1f1612]/15 border-t border-[#1f1612]/15">
              {items.map((item, index) => (
                <li key={item.title}>
                  <a
                    href={bookingUrl ?? paths.services}
                    className="group flex items-center justify-between gap-4 py-5 transition hover:opacity-80"
                  >
                    <span className="flex min-w-0 items-baseline gap-4">
                      <span
                        className="shrink-0 text-sm font-medium tabular-nums text-[#1f1612]/45"
                        style={{ fontFamily: luxury.sans }}
                      >
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span
                        className="text-lg font-medium text-[#1f1612] sm:text-xl"
                        style={{ fontFamily: luxury.serif }}
                      >
                        {item.title}
                      </span>
                    </span>
                    <ArrowUpRight
                      className="h-4 w-4 shrink-0 text-[#1f1612]/60 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                      strokeWidth={1.75}
                    />
                  </a>
                </li>
              ))}
            </ul>

            <div className="mt-auto pt-10 lg:flex lg:justify-end">
              <div className="max-w-xs lg:max-w-[220px]">
                <div className="relative aspect-[4/3] overflow-hidden bg-[#d8d0c0]">
                  <LuxuryImage src={roomImage} alt="" fill fallbackIndex={0} />
                </div>
                <p
                  className="mt-3 text-sm leading-relaxed text-[#1f1612]/70"
                  style={{ fontFamily: luxury.sans }}
                >
                  {roomCaption}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
