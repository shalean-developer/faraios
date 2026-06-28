import { ArrowUpRight, Star } from "lucide-react";

import type { ParsedSiteContent } from "@/templates/service-business/content";
import { LuxuryAboutSection } from "@/templates/service-business/LuxuryAboutSection";
import { LuxuryBlogSection } from "@/templates/service-business/LuxuryBlogSection";
import { LuxuryContactSection } from "@/templates/service-business/LuxuryContactSection";
import { LuxuryFaqSection } from "@/templates/service-business/LuxuryFaqSection";
import { LuxuryImage } from "@/templates/service-business/LuxuryImage";
import { LuxuryPageIntro } from "@/templates/service-business/LuxuryPageIntro";
import { LuxuryReviewsSection } from "@/templates/service-business/LuxuryReviewsSection";
import { LuxuryStrategySection } from "@/templates/service-business/LuxuryStrategySection";
import { luxury } from "@/templates/service-business/luxury-styles";
import { sectionContainer } from "@/templates/service-business/template-styles";
import type { TemplatePaths } from "@/templates/service-business/paths";
import { resolveTemplateHref } from "@/templates/service-business/paths";

type PageProps = {
  site: ParsedSiteContent;
  paths: TemplatePaths;
  bookingUrl?: string | null;
};

export function LuxuryAboutPage({ site, paths }: PageProps) {
  const { whyChooseUs, topbar } = site;
  return (
    <>
      <LuxuryPageIntro
        label="About Us"
        title={whyChooseUs.heading}
        description={topbar.tagline || undefined}
      />
      <LuxuryAboutSection site={site} paths={paths} />
      <LuxuryStrategySection site={site} />
    </>
  );
}

export function LuxuryServicesPage({ site, paths, bookingUrl }: PageProps) {
  const { services, hero } = site;
  const bookHref = bookingUrl ?? resolveTemplateHref(hero.ctaHref, paths);

  return (
    <>
      <LuxuryPageIntro
        label="Our Services"
        title={services.heading}
        description={services.subtitle}
      />
      <section className="bg-[#f2f0e6] py-16 sm:py-20 lg:py-24">
        <div className={sectionContainer}>
          <ul className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {services.items.map((item, index) => (
              <li
                key={item.title}
                className="overflow-hidden rounded-sm bg-[#ebe7d8]"
              >
                <div className="relative aspect-[4/3] bg-[#d8d0c0]">
                  <LuxuryImage
                    src={item.image}
                    alt={item.imageAlt ?? item.title}
                    fill
                    fallbackIndex={index}
                  />
                </div>
                <div className="p-6">
                  <div className="flex items-start justify-between gap-3">
                    <h2
                      className="text-xl font-medium text-[#2d2926]"
                      style={{ fontFamily: luxury.serif }}
                    >
                      {item.title}
                    </h2>
                    <span
                      className="shrink-0 text-sm font-semibold text-[#2d2926]/70"
                      style={{ fontFamily: luxury.sans }}
                    >
                      {item.priceFrom || hero.startingPrice}
                    </span>
                  </div>
                  <p
                    className="mt-3 text-sm leading-relaxed text-[#2d2926]/75"
                    style={{ fontFamily: luxury.sans }}
                  >
                    {item.description ||
                      "Professional service delivered by our trusted local team."}
                  </p>
                  <a
                    href={bookHref}
                    className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#2d2926] transition hover:opacity-80"
                    style={{ fontFamily: luxury.sans }}
                  >
                    Book this service
                    <ArrowUpRight className="h-4 w-4" strokeWidth={1.75} />
                  </a>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}

export function LuxuryReviewsPage({ site, paths, bookingUrl }: PageProps) {
  const { hero, socialProof, businessName } = site;
  const bookHref = bookingUrl ?? resolveTemplateHref(hero.ctaHref, paths);

  const stats = [
    { label: "Established", value: socialProof.establishedYear },
    { label: "Jobs completed", value: socialProof.jobsCompleted },
    { label: "Google rating", value: hero.rating, stars: true },
    { label: "Satisfaction rate", value: socialProof.satisfactionRate },
    { label: "Response time", value: socialProof.responseTime },
  ];

  return (
    <>
      <LuxuryPageIntro
        label="Testimonials"
        title="Customer Reviews"
        description={`See what local customers say about ${businessName}.`}
      />
      <LuxuryReviewsSection site={site} paths={paths} />
      <section className="bg-[#f5f3e7] py-14 sm:py-16">
        <div className={`${sectionContainer} grid gap-4 sm:grid-cols-2 lg:grid-cols-5`}>
          {stats.map((stat, index) => (
            <div
              key={stat.label}
              className={`rounded-sm px-5 py-6 text-center ${
                index === 1
                  ? "bg-[#3d3d29] text-[#f2f0d9]"
                  : "border border-[#2d2926]/10 bg-[#ebe7d8] text-[#2d2926]"
              }`}
            >
              <p
                className={`text-[10px] font-semibold uppercase tracking-[0.12em] ${
                  index === 1 ? "text-[#f2f0d9]/60" : "text-[#2d2926]/55"
                }`}
                style={{ fontFamily: luxury.sans }}
              >
                {stat.label}
              </p>
              {stat.stars ? (
                <div className="mt-3 flex justify-center text-amber-500/90">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className="h-3.5 w-3.5 fill-current" />
                  ))}
                </div>
              ) : null}
              <p
                className={`mt-3 text-2xl font-medium sm:text-3xl ${
                  index === 1 ? "text-[#f2f0d9]" : "text-[#2d2926]"
                }`}
                style={{ fontFamily: luxury.serif }}
              >
                {stat.value}
              </p>
            </div>
          ))}
        </div>
      </section>
      <section className="bg-[#f2f0e6] py-12">
        <div className={`${sectionContainer} flex flex-wrap justify-center gap-4`}>
          <a
            href={bookHref}
            className="inline-flex items-stretch overflow-hidden rounded-sm bg-[#2a2018] text-[#f2f0e6] shadow-md transition hover:bg-[#1f1612]"
            style={{ fontFamily: luxury.sans }}
          >
            <span className="flex items-center px-6 py-3.5 text-sm font-semibold">
              Book a session
            </span>
            <span className="flex w-12 items-center justify-center border-l border-[#f2f0e6]/15 bg-[#342820]">
              <ArrowUpRight className="h-4 w-4" strokeWidth={2} />
            </span>
          </a>
        </div>
      </section>
    </>
  );
}

export function LuxuryBlogPage({ site, paths }: Pick<PageProps, "site" | "paths">) {
  return (
    <>
      <LuxuryPageIntro
        label="Wellness Blog"
        title="Holistic perspectives for Being and Spirit"
        description="Insights on wellness, recovery, and mindful self-care."
      />
      <LuxuryBlogSection site={site} paths={paths} showExploreMore={false} />
    </>
  );
}

export function LuxuryContactPage({ site, bookingUrl }: Pick<PageProps, "site" | "bookingUrl">) {
  return (
    <div className="pt-24">
      <LuxuryContactSection site={site} bookingUrl={bookingUrl} />
    </div>
  );
}

export function LuxuryFaqPage({ site, paths, bookingUrl }: PageProps) {
  return (
    <>
      <LuxuryPageIntro
        label="FAQ"
        title={site.faq.heading}
        description={site.faq.body}
      />
      <LuxuryFaqSection site={site} paths={paths} bookingUrl={bookingUrl} />
    </>
  );
}
