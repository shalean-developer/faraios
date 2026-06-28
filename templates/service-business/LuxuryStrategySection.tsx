import type { ParsedSiteContent } from "@/templates/service-business/content";
import { LuxuryImage } from "@/templates/service-business/LuxuryImage";
import { luxuryFallbackImage } from "@/templates/service-business/luxury-fallback-images";
import { luxury } from "@/templates/service-business/luxury-styles";
import { sectionContainer } from "@/templates/service-business/template-styles";

type Props = {
  site: ParsedSiteContent;
};

function yearsOfExperience(establishedYear: string): string {
  const year = parseInt(establishedYear, 10);
  if (!Number.isFinite(year) || year > new Date().getFullYear()) return "10+";
  const years = new Date().getFullYear() - year;
  return years >= 1 ? `${years}+` : "1+";
}

export function LuxuryStrategySection({ site }: Props) {
  const { whyChooseUs, socialProof, services, hero } = site;
  const imageLeft = whyChooseUs.image || services.items[0]?.image || luxuryFallbackImage(1);
  const imageRight = services.items[1]?.image || hero.image || luxuryFallbackImage(0);

  const statValue = yearsOfExperience(socialProof.establishedYear);
  const statLabel = "Years of Proven Expertise";

  const strategyBody =
    whyChooseUs.body ||
    "We hold that authentic health starts internally. By merging contemporary methods with total-body care, we foster a supportive space that brings balance, renews your energy, and improves your general health.";

  return (
    <section className="bg-[#f2f0d9] py-16 sm:py-20 lg:py-24">
      <div className={sectionContainer}>
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-10 lg:items-start">
          <div className="lg:col-span-5">
            <h2
              className="text-[clamp(2rem,4vw,3.25rem)] font-medium leading-[1.1] text-[#3d3d29]"
              style={{ fontFamily: luxury.serif }}
            >
              Transforming health with purposeful therapy
            </h2>
            <p
              className="mt-6 max-w-md text-base leading-relaxed text-[#3d3d29]/80 sm:text-lg"
              style={{ fontFamily: luxury.sans }}
            >
              Explore a life-changing method for self-care that fosters your physical, mental, and
              emotional health through intentional therapy.
            </p>

            <div className="mt-10 flex max-w-lg overflow-hidden rounded-sm shadow-sm">
              <div className="flex w-28 shrink-0 flex-col justify-center bg-[#3d3d29] px-4 py-6 text-center sm:w-32">
                <p
                  className="text-3xl font-semibold leading-none text-[#f2f0d9] sm:text-4xl"
                  style={{ fontFamily: luxury.serif }}
                >
                  {statValue}
                </p>
                <p
                  className="mt-2 text-[10px] font-semibold uppercase leading-tight tracking-wide text-[#f2f0d9]/80 sm:text-xs"
                  style={{ fontFamily: luxury.sans }}
                >
                  {statLabel}
                </p>
              </div>
              <div className="flex flex-1 flex-col justify-center bg-[#ebe8c8] px-5 py-5 sm:px-6">
                <p
                  className="text-base font-semibold text-[#3d3d29] sm:text-lg"
                  style={{ fontFamily: luxury.serif }}
                >
                  Our Strategy for Recovery
                </p>
                <p
                  className="mt-2 text-sm leading-relaxed text-[#3d3d29]/75"
                  style={{ fontFamily: luxury.sans }}
                >
                  {strategyBody}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:col-span-7 lg:gap-5">
            <div className="relative min-h-[280px] overflow-hidden bg-[#d8d0c0] sm:min-h-[360px]">
              <LuxuryImage src={imageLeft} alt="" fill fallbackIndex={1} />
            </div>
            <div className="relative min-h-[320px] overflow-hidden bg-[#d8d0c0] sm:min-h-[420px] lg:min-h-[480px]">
              <LuxuryImage src={imageRight} alt="" fill fallbackIndex={0} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
