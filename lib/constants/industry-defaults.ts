import { PAGE_OPTIONS } from "@/lib/constants/onboarding-pages";

/** Smart defaults keyed by industry slug (DB rows only have name/slug/description). */
export function getSmartDefaultsForIndustrySlug(slug: string): {
  pages: string[];
  featureSlugs: string[];
} {
  const map: Record<string, { pages: string[]; featureSlugs: string[] }> = {
    "creative-portfolio": {
      pages: [
        "Home",
        "About",
        "Portfolio",
        "Services",
        "Contact",
        "Testimonials",
      ],
      featureSlugs: ["blog"],
    },
    "health-wellness": {
      pages: ["Home", "Services", "About", "Pricing", "Contact", "FAQ"],
      featureSlugs: ["booking", "payments"],
    },
    "technology-saas": {
      pages: ["Home", "Services", "Pricing", "Blog", "Contact", "FAQ"],
      featureSlugs: ["payments", "blog"],
    },
    "retail-ecommerce": {
      pages: ["Home", "Services", "Pricing", "Contact", "FAQ", "Testimonials"],
      featureSlugs: ["payments", "blog"],
    },
    "restaurant-food": {
      pages: ["Home", "About", "Services", "Pricing", "Contact", "FAQ"],
      featureSlugs: ["booking", "payments"],
    },
    "real-estate": {
      pages: ["Home", "About", "Services", "Contact", "Testimonials"],
      featureSlugs: ["booking", "payments"],
    },
    education: {
      pages: ["Home", "About", "Services", "Pricing", "Blog", "Contact"],
      featureSlugs: ["booking", "payments", "blog"],
    },
    "non-profit": {
      pages: ["Home", "About", "Services", "Blog", "Contact", "Team"],
      featureSlugs: ["payments", "blog"],
    },
    other: {
      pages: ["Home", "About", "Services", "Contact"],
      featureSlugs: [],
    },
  };

  const d = map[slug] ?? {
    pages: [...PAGE_OPTIONS].slice(0, 4),
    featureSlugs: [] as string[],
  };
  return { pages: [...d.pages], featureSlugs: [...d.featureSlugs] };
}
