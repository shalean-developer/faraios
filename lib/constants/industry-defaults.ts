import { syncBlogPageWithFeatures } from "@/lib/constants/onboarding-pages";
import { getOnboardingDefaults } from "@/lib/industry-modules/loader";

/** Smart defaults keyed by industry slug (matches Supabase `industries.slug`). */
export function getSmartDefaultsForIndustrySlug(slug: string): {
  pages: string[];
  featureSlugs: string[];
} {
  const defaults = getOnboardingDefaults(slug);
  return {
    pages: syncBlogPageWithFeatures(defaults.pages, defaults.featureSlugs),
    featureSlugs: [...defaults.featureSlugs],
  };
}
