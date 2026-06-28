import { luxury } from "@/templates/service-business/luxury-styles";
import { sectionContainer } from "@/templates/service-business/template-styles";

type Props = {
  label?: string;
  title: string;
  description?: string;
};

export function LuxuryPageIntro({ label, title, description }: Props) {
  return (
    <section className="border-b border-[#2d2926]/10 bg-[#eae5d1] pt-28 pb-12 sm:pt-32 sm:pb-14">
      <div className={sectionContainer}>
        {label ? (
          <p
            className="text-sm font-medium tracking-wide text-[#2d2926]/70"
            style={{ fontFamily: luxury.sans }}
          >
            <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-[#2d2926]/50" aria-hidden />
            {label}
          </p>
        ) : null}
        <h1
          className={`${label ? "mt-4" : ""} max-w-3xl text-[clamp(2rem,4.5vw,3.5rem)] font-medium leading-[1.08] text-[#2d2926]`}
          style={{ fontFamily: luxury.serif }}
        >
          {title}
        </h1>
        {description ? (
          <p
            className="mt-4 max-w-2xl text-base leading-relaxed text-[#2d2926]/75 sm:text-lg"
            style={{ fontFamily: luxury.sans }}
          >
            {description}
          </p>
        ) : null}
      </div>
    </section>
  );
}
