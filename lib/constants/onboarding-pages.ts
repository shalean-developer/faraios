/** Allowed page labels for the onboarding form (UI constants, not DB-backed). */
export const PAGE_OPTIONS = [
  "Home",
  "About",
  "Services",
  "Portfolio",
  "Blog",
  "Pricing",
  "Contact",
  "FAQ",
  "Team",
  "Testimonials",
] as const;

export type PageOption = (typeof PAGE_OPTIONS)[number];

export const BLOG_PAGE: PageOption = "Blog";

/** Shown in onboarding — Blog page is tied to the Blog / CMS feature. */
export const PAGE_OPTIONS_VISIBLE = PAGE_OPTIONS.filter((p) => p !== BLOG_PAGE);

/** Adds or removes the Blog page when the blog feature is toggled. */
export function syncBlogPageWithFeatures(
  pages: string[],
  featureSlugs: string[]
): string[] {
  const withoutBlog = pages.filter((p) => p !== BLOG_PAGE);
  return featureSlugs.includes("blog") ? [...withoutBlog, BLOG_PAGE] : withoutBlog;
}
