import { PAGE_OPTIONS, syncBlogPageWithFeatures } from "@/lib/constants/onboarding-pages";

/** Smart defaults keyed by industry slug (matches Supabase `industries.slug`). */
export function getSmartDefaultsForIndustrySlug(slug: string): {
  pages: string[];
  featureSlugs: string[];
} {
  const map: Record<string, { pages: string[]; featureSlugs: string[] }> = {
    cleaning: {
      pages: ["Home", "Services", "About", "Contact", "FAQ"],
      featureSlugs: ["booking"],
    },
    construction: {
      pages: ["Home", "Services", "About", "Portfolio", "Contact"],
      featureSlugs: ["booking", "payments"],
    },
    beauty: {
      pages: ["Home", "Services", "About", "Pricing", "Contact", "FAQ"],
      featureSlugs: ["booking", "payments"],
    },
    tourism: {
      pages: ["Home", "Services", "About", "Pricing", "Contact", "FAQ"],
      featureSlugs: ["booking", "payments", "blog"],
    },
    electrical: {
      pages: ["Home", "Services", "About", "Contact", "FAQ"],
      featureSlugs: ["booking", "payments"],
    },
  };

  const d = map[slug] ?? {
    pages: ["Home", "About", "Services", "Contact"],
    featureSlugs: [] as string[],
  };
  return {
    pages: syncBlogPageWithFeatures(d.pages, d.featureSlugs),
    featureSlugs: [...d.featureSlugs],
  };
}
