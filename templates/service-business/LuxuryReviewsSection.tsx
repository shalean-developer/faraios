import { ArrowUpRight, Star } from "lucide-react";

import type { ParsedSiteContent } from "@/templates/service-business/content";
import { luxury } from "@/templates/service-business/luxury-styles";
import { sectionContainer } from "@/templates/service-business/template-styles";
import type { TemplatePaths } from "@/templates/service-business/paths";

type Props = {
  site: ParsedSiteContent;
  paths: TemplatePaths;
};

export function LuxuryReviewsSection({ site, paths }: Props) {
  const { hero, socialProof } = site;

  return (
    <section className="bg-[#3d3d29] py-16 sm:py-20">
      <div className={sectionContainer}>
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-3">
            <p
              className="text-xs font-medium uppercase tracking-[0.12em] text-[#f2f0d9]/55"
              style={{ fontFamily: luxury.sans }}
            >
              Google Reviews
            </p>
            <div className="mt-3 flex text-amber-400/90">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-current" />
              ))}
            </div>
            <p
              className="mt-3 text-4xl font-medium text-[#f2f0d9]"
              style={{ fontFamily: luxury.serif }}
            >
              {hero.rating}
            </p>
            <p
              className="mt-1 text-sm text-[#f2f0d9]/60"
              style={{ fontFamily: luxury.sans }}
            >
              {socialProof.googleReviews}
            </p>
          </div>
          <blockquote className="lg:col-span-6">
            <p
              className="text-xl font-medium italic leading-relaxed text-[#f2f0d9] sm:text-2xl"
              style={{ fontFamily: luxury.serif }}
            >
              &ldquo;{socialProof.reviewQuote}&rdquo;
            </p>
            <footer
              className="mt-4 text-sm font-medium text-[#f2f0d9]/70"
              style={{ fontFamily: luxury.sans }}
            >
              — {socialProof.reviewAuthor}
            </footer>
          </blockquote>
          <div className="lg:col-span-3 lg:flex lg:justify-end">
            <a
              href={paths.reviews}
              className="inline-flex items-center gap-2 border border-[#f2f0d9]/25 px-5 py-3.5 text-sm font-medium text-[#f2f0d9] transition hover:border-[#f2f0d9]/50"
              style={{ fontFamily: luxury.sans }}
            >
              Read all reviews
              <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.75} />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
