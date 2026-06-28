import { Check } from "lucide-react";

import type { ParsedSiteContent } from "@/templates/service-business/content";
import { luxury } from "@/templates/service-business/luxury-styles";
import { LuxuryFaqAccordion } from "@/templates/service-business/LuxuryFaqAccordion";
import { sectionContainer } from "@/templates/service-business/template-styles";
import type { TemplatePaths } from "@/templates/service-business/paths";

type Props = {
  site: ParsedSiteContent;
  paths: TemplatePaths;
  bookingUrl?: string | null;
};

export function LuxuryFaqSection({ site, paths, bookingUrl }: Props) {
  const { faq, serviceAreas } = site;

  return (
    <section id="faq" className="bg-[#f2f0e6] py-16 sm:py-20 lg:py-24">
      <div className={`${sectionContainer} grid gap-14 lg:grid-cols-2 lg:gap-16`}>
        <div>
          <p
            className="text-sm font-medium tracking-wide text-[#2d2926]/70"
            style={{ fontFamily: luxury.sans }}
          >
            <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-[#2d2926]/50" aria-hidden />
            FAQ
          </p>
          <h2
            className="mt-4 text-[clamp(1.75rem,3vw,2.5rem)] font-medium leading-[1.12] text-[#2d2926]"
            style={{ fontFamily: luxury.serif }}
          >
            {faq.heading}
          </h2>
          <p
            className="mt-4 text-base leading-relaxed text-[#2d2926]/75"
            style={{ fontFamily: luxury.sans }}
          >
            {faq.body}
          </p>
          <div className="mt-8">
            <LuxuryFaqAccordion items={faq.items} />
          </div>
        </div>

        <div>
          <p
            className="text-sm font-medium tracking-wide text-[#2d2926]/70"
            style={{ fontFamily: luxury.sans }}
          >
            <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-[#2d2926]/50" aria-hidden />
            Service Areas
          </p>
          <h2
            className="mt-4 text-[clamp(1.75rem,3vw,2.5rem)] font-medium leading-[1.12] text-[#2d2926]"
            style={{ fontFamily: luxury.serif }}
          >
            {serviceAreas.heading}
          </h2>
          <p
            className="mt-4 text-base leading-relaxed text-[#2d2926]/75"
            style={{ fontFamily: luxury.sans }}
          >
            {serviceAreas.intro}
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            {serviceAreas.popular.map((area) => (
              <span
                key={area}
                className="rounded-sm bg-[#2a2018] px-4 py-2 text-sm font-medium text-[#f2f0e6]"
                style={{ fontFamily: luxury.sans }}
              >
                {area}
              </span>
            ))}
          </div>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {serviceAreas.areas.map((area) => (
              <li
                key={area}
                className="flex items-center gap-2.5 text-sm text-[#2d2926]/80"
                style={{ fontFamily: luxury.sans }}
              >
                <Check className="h-4 w-4 shrink-0 text-[#2d2926]/50" strokeWidth={1.75} />
                {area}
              </li>
            ))}
          </ul>
          <a
            href={bookingUrl ?? paths.contact}
            className="mt-8 inline-flex items-stretch overflow-hidden rounded-sm bg-[#2a2018] text-[#f2f0e6] shadow-md transition hover:bg-[#1f1612]"
            style={{ fontFamily: luxury.sans }}
          >
            <span className="flex items-center px-5 py-3.5 text-sm font-semibold">
              {serviceAreas.ctaLabel}
            </span>
          </a>
        </div>
      </div>
    </section>
  );
}
