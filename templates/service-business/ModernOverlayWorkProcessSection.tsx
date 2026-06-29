import type { LucideIcon } from "lucide-react";
import { HeartHandshake, Lightbulb, ScanSearch } from "lucide-react";

import type { ParsedSiteContent, StepItem } from "@/templates/service-business/content";
import { sectionContainer } from "@/templates/service-business/template-styles";

type Props = {
  site: ParsedSiteContent;
};

const STEP_ICONS: LucideIcon[] = [ScanSearch, HeartHandshake, Lightbulb];

const DEFAULT_STEPS: StepItem[] = [
  {
    title: "Every detail reflects our expertise",
    description:
      "Every detail reflects our expertise. From the initial planning to the final touches we focus on quality craftsmanship.",
  },
  {
    title: "We build homes with care",
    description:
      "We build homes with care. Every project is handled with attention, precision, and dedication to quality.",
  },
  {
    title: "Crafting spaces that inspire joy",
    description:
      "Crafting spaces that inspire joy. We design and build every area with creativity, care, and attention.",
  },
];

export function ModernOverlayWorkProcessSection({ site }: Props) {
  const { workProcess, theme } = site;
  const steps = workProcess.steps.length >= 3 ? workProcess.steps.slice(0, 3) : DEFAULT_STEPS;

  return (
    <section id="work-process" className="bg-white py-16 sm:py-20 lg:py-24">
      <div className={sectionContainer}>
        <p
          className="flex items-center gap-2 text-sm font-medium"
          style={{ color: theme.accent }}
        >
          <span
            className="inline-block h-2 w-2 shrink-0 rounded-full"
            style={{ backgroundColor: theme.accent }}
            aria-hidden
          />
          {workProcess.label}
        </p>
        <h2 className="mt-4 max-w-3xl text-[clamp(2rem,4vw,3.25rem)] font-bold leading-[1.12] tracking-tight text-slate-900">
          {workProcess.heading}
        </h2>

        <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:mt-14 lg:grid-cols-3 lg:gap-0 lg:divide-x lg:divide-slate-200">
          {steps.map((step, index) => {
            const Icon = STEP_ICONS[index % STEP_ICONS.length];
            return (
              <div
                key={`${step.title}-${index}`}
                className="lg:px-10 first:lg:pl-0 last:lg:pr-0"
              >
                <span
                  className="inline-flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-sm"
                  style={{ backgroundColor: theme.accent }}
                >
                  <Icon className="h-6 w-6" strokeWidth={1.75} />
                </span>
                <h3 className="mt-6 text-lg font-bold leading-snug text-slate-900 sm:text-xl">
                  {step.title}
                </h3>
                <p className="mt-3 text-base leading-relaxed text-slate-600">{step.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
