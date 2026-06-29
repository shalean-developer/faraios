import type { ParsedSiteContent } from "@/templates/service-business/content";
import { LuxuryImage } from "@/templates/service-business/LuxuryImage";
import { luxuryFallbackImage } from "@/templates/service-business/luxury-fallback-images";
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
    <div className={`relative overflow-hidden rounded-2xl bg-slate-100 ${className ?? ""}`}>
      <LuxuryImage
        src={src || luxuryFallbackImage(fallbackIndex)}
        alt={alt}
        fill
        fallbackIndex={fallbackIndex}
      />
    </div>
  );
}

export function ModernOverlayAboutSection({ site, paths }: Props) {
  const { about, socialProof, theme, businessName } = site;

  const imageLeft = about.imageSecondary?.trim() || luxuryFallbackImage(0);
  const imageTall = about.image?.trim() || luxuryFallbackImage(1);
  const imageSmall = about.imageTertiary?.trim() || luxuryFallbackImage(2);

  const stat1Value = about.stat1Value || socialProof.jobsCompleted;
  const stat1Label = about.stat1Label || "Projects Completed";
  const stat2Value = about.stat2Value || "10+";
  const stat2Label = about.stat2Label || "Years of Experience";

  return (
    <section id="about" className="bg-white py-16 sm:py-20 lg:py-24">
      <div className={sectionContainer}>
        <p className="flex items-center gap-2 text-sm font-medium text-slate-600">
          <span
            className="inline-block h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: theme.accent }}
            aria-hidden
          />
          About Us
        </p>
        <h2 className="mt-4 max-w-2xl text-[clamp(2rem,4vw,3.25rem)] font-bold leading-[1.12] tracking-tight text-slate-900">
          {about.heading}
        </h2>

        <div className="mt-12 grid gap-6 lg:mt-14 lg:grid-cols-12 lg:gap-5 lg:items-start">
          <div className="order-2 lg:order-none lg:col-span-4 lg:row-start-2">
            <AboutImage
              src={imageLeft}
              alt={about.imageAlt || businessName}
              className="aspect-[4/5] w-full sm:aspect-[3/4]"
              fallbackIndex={0}
            />
          </div>

          <div className="order-1 flex flex-col justify-center lg:order-none lg:col-span-4 lg:col-start-5 lg:row-start-2 lg:py-2">
            <p className="text-base leading-relaxed text-slate-600 sm:text-lg">
              {about.body}
            </p>
            <div className="mt-8 grid grid-cols-2 gap-6 sm:gap-8">
              <div>
                <p className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                  {stat1Value}
                </p>
                <p className="mt-1 text-sm text-slate-500 sm:text-base">{stat1Label}</p>
              </div>
              <div>
                <p className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
                  {stat2Value}
                </p>
                <p className="mt-1 text-sm text-slate-500 sm:text-base">{stat2Label}</p>
              </div>
            </div>
            <a
              href={paths.about}
              className="mt-8 inline-flex w-fit rounded-full border-2 border-slate-900 bg-white px-8 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-50"
            >
              About Us
            </a>
          </div>

          <div className="order-3 flex flex-col gap-5 lg:order-none lg:col-span-4 lg:col-start-9 lg:row-start-1 lg:row-span-2">
            <AboutImage
              src={imageTall}
              alt={about.imageAlt || "Our team at work"}
              className="aspect-[4/5] w-full lg:aspect-auto lg:min-h-[280px] lg:flex-1"
              fallbackIndex={1}
            />
            <AboutImage
              src={imageSmall}
              alt={about.imageAlt || "Craftsmanship"}
              className="aspect-[16/10] w-full lg:aspect-[16/9]"
              fallbackIndex={2}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
