import type { ParsedSiteContent } from "@/templates/service-business/content";
import { LuxuryImage } from "@/templates/service-business/LuxuryImage";
import { sectionContainer } from "@/templates/service-business/template-styles";

const DEFAULT_IMAGE = "/images/team-edlick/painting-banner.png";

type Props = {
  site: ParsedSiteContent;
};

export function ModernOverlayFeatureBannerSection({ site }: Props) {
  const { featureBanner } = site;
  const src = featureBanner.image || DEFAULT_IMAGE;
  const alt = featureBanner.imageAlt || "Professional painting and home renovation";

  return (
    <section className="bg-white py-10 sm:py-12 lg:py-14">
      <div className={sectionContainer}>
        <div className="relative min-h-[220px] overflow-hidden rounded-2xl bg-slate-200 sm:min-h-[320px] lg:min-h-[420px]">
          <LuxuryImage src={src} alt={alt} fill fallbackIndex={2} priority />
        </div>
      </div>
    </section>
  );
}
