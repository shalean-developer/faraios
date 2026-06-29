import type { FaqItem, ParsedSiteContent } from "@/templates/service-business/content";
import {
  ModernOverlayFaqAccordion,
  RenovationIllustration,
} from "@/templates/service-business/ModernOverlayFaqAccordion";
import { sectionContainer } from "@/templates/service-business/template-styles";

type Props = {
  site: ParsedSiteContent;
};

const DEFAULT_FAQ: FaqItem[] = [
  {
    question: "How long does a home renovation take?",
    answer:
      "A home renovation timeline depends on the size and complexity of the project. Small updates may take 2–4 weeks, while larger or full-home renovations can take 6–12 weeks or more. After reviewing your project details, we provide a clear schedule before work begins.",
  },
  {
    question: "Is the renovation process disruptive?",
    answer:
      "We work to minimize disruption by planning each phase carefully, protecting your space, and keeping you informed throughout the project. Our team maintains a clean worksite and coordinates access so daily life is affected as little as possible.",
  },
  {
    question: "Do you provide a fixed project timeline?",
    answer:
      "Yes. Once we assess your project, we provide a detailed timeline with milestones and completion dates. If anything changes, we communicate updates promptly so you always know what to expect.",
  },
  {
    question: "Are materials included in the renovation cost?",
    answer:
      "Material costs are included in our quotes whenever possible. We specify what is covered upfront and recommend quality materials that fit your budget and design goals.",
  },
  {
    question: "Can I stay in my home during renovation?",
    answer:
      "For many projects, yes — especially kitchen, bathroom, or partial-home renovations. For major full-home projects, we discuss the best approach during planning to keep your family safe and comfortable.",
  },
];

export function ModernOverlayFaqSection({ site }: Props) {
  const { faq, theme } = site;
  const heading =
    faq.heading === "Frequently Asked Questions" || !faq.heading.trim()
      ? "What to Know Before You Start"
      : faq.heading;
  const items = faq.items.length >= 4 ? faq.items.slice(0, 5) : DEFAULT_FAQ;

  return (
    <section id="faq" className="bg-[#f7f5f0] py-16 sm:py-20 lg:py-24">
      <div className={sectionContainer}>
        <div className="grid gap-12 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start lg:gap-16">
          <div className="relative flex min-h-[280px] flex-col lg:min-h-[420px]">
            <p
              className="flex items-center gap-2 text-sm font-medium"
              style={{ color: theme.accent }}
            >
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: theme.accent }}
                aria-hidden
              />
              {faq.label}
            </p>
            <h2 className="mt-4 max-w-md text-[clamp(2rem,4vw,3.25rem)] font-bold leading-[1.12] tracking-tight text-slate-900">
              {heading}
            </h2>
            <div className="pointer-events-none mt-auto hidden pt-10 opacity-90 lg:block">
              <RenovationIllustration />
            </div>
          </div>

          <ModernOverlayFaqAccordion items={items} />
        </div>
      </div>
    </section>
  );
}
