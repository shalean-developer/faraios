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
