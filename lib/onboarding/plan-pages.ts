import { BLOG_PAGE } from "@/lib/constants/onboarding-pages";
import { planPageLimit, type PricingPlanSlug } from "@/lib/data/pricing";

const PAGE_PRIORITY = [
  "Home",
  "About",
  "Services",
  "Contact",
  "Pricing",
  "FAQ",
  "Portfolio",
  "Team",
  "Testimonials",
  BLOG_PAGE,
];

function pageSortIndex(page: string): number {
  const index = PAGE_PRIORITY.indexOf(page);
  return index === -1 ? PAGE_PRIORITY.length : index;
}

export function trimPagesToPlanLimit(
  pages: string[],
  planSlug: PricingPlanSlug
): string[] {
  const limit = planPageLimit(planSlug);
  if (limit === null || pages.length <= limit) {
    return pages;
  }
  return [...pages]
    .sort((a, b) => pageSortIndex(a) - pageSortIndex(b))
    .slice(0, limit);
}

export function canAddPageToPlan(
  pages: string[],
  planSlug: PricingPlanSlug
): boolean {
  const limit = planPageLimit(planSlug);
  return limit === null || pages.length < limit;
}
