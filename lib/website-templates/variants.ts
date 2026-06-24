export type WebsiteTemplateVariant =
  | "service-business"
  | "cleaning"
  | "beauty"
  | "technology"
  | "tourism";

export type WebsiteVariantTheme = {
  primary: string;
  accent: string;
  heroGradientFrom: string;
  heroGradientTo: string;
  tagline: string;
  badgeLabel: string;
  trustBand: { title: string; description: string }[];
};

const VARIANTS: Record<WebsiteTemplateVariant, WebsiteVariantTheme> = {
  cleaning: {
    primary: "#0c4a6e",
    accent: "#0284c7",
    heroGradientFrom: "#f0f9ff",
    heroGradientTo: "#e0f2fe",
    tagline: "CLEAN SPACES. BETTER LIVES.",
    badgeLabel: "Professional cleaning",
    trustBand: [
      { title: "Vetted cleaners", description: "Background-checked professionals at your door." },
      { title: "Eco-friendly products", description: "Safe for families, pets, and workspaces." },
      { title: "Satisfaction guarantee", description: "We make it right if you're not happy." },
      { title: "Flexible scheduling", description: "Book times that fit your routine." },
    ],
  },
  beauty: {
    primary: "#701a75",
    accent: "#c026d3",
    heroGradientFrom: "#fdf4ff",
    heroGradientTo: "#fae8ff",
    tagline: "RELAX. REJUVENATE. RENEW.",
    badgeLabel: "Luxury wellness",
    trustBand: [
      { title: "Licensed therapists", description: "Qualified beauty and spa professionals." },
      { title: "Premium products", description: "Professional-grade treatments and care." },
      { title: "Private experience", description: "Calm, hygienic, and welcoming spaces." },
      { title: "Easy online booking", description: "Reserve treatments in under two minutes." },
    ],
  },
  technology: {
    primary: "#0f172a",
    accent: "#2563eb",
    heroGradientFrom: "#f8fafc",
    heroGradientTo: "#eff6ff",
    tagline: "FIX IT FAST. GET BACK TO WORK.",
    badgeLabel: "IT & tech support",
    trustBand: [
      { title: "Certified technicians", description: "Experienced support for devices and networks." },
      { title: "Remote & on-site", description: "Flexible support wherever you need it." },
      { title: "Clear diagnostics", description: "Upfront scope before work begins." },
      { title: "Business-ready SLAs", description: "Reliable response for teams and offices." },
    ],
  },
  tourism: {
    primary: "#14532d",
    accent: "#16a34a",
    heroGradientFrom: "#f0fdf4",
    heroGradientTo: "#dcfce7",
    tagline: "DISCOVER. EXPLORE. REMEMBER.",
    badgeLabel: "Curated travel experiences",
    trustBand: [
      { title: "Local guides", description: "Authentic experiences from people who know the area." },
      { title: "Small groups", description: "Personal attention on every tour and trip." },
      { title: "Flexible packages", description: "Day tours, safaris, and custom itineraries." },
      { title: "Secure booking", description: "Confirm your adventure online in minutes." },
    ],
  },
  "service-business": {
    primary: "#1e293b",
    accent: "#6366f1",
    heroGradientFrom: "#f8fafc",
    heroGradientTo: "#eef2ff",
    tagline: "TRUSTED LOCAL SERVICE.",
    badgeLabel: "Professional service",
    trustBand: [
      { title: "Verified professionals", description: "Vetted team you can trust." },
      { title: "Transparent pricing", description: "Clear quotes before we start." },
      { title: "Quality guaranteed", description: "Professional results every time." },
      { title: "Easy online booking", description: "Book in under two minutes." },
    ],
  },
};

const TEMPLATE_ALIASES: Record<string, WebsiteTemplateVariant> = {
  cleaning: "cleaning",
  "service-business": "service-business",
  beauty: "beauty",
  "beauty-spa": "beauty",
  spa: "beauty",
  wellness: "beauty",
  technology: "technology",
  "technology-services": "technology",
  tech: "technology",
  tourism: "tourism",
  "tourism-travel": "tourism",
  travel: "tourism",
};

export function resolveWebsiteTemplateVariant(
  templateOrIndustry?: string | null
): WebsiteTemplateVariant {
  const key = templateOrIndustry?.trim().toLowerCase() ?? "";
  return TEMPLATE_ALIASES[key] ?? "service-business";
}

export function getWebsiteVariantTheme(variant: WebsiteTemplateVariant): WebsiteVariantTheme {
  return VARIANTS[variant];
}

export function industrySlugToWebsiteTemplate(industrySlug?: string | null): string {
  return resolveWebsiteTemplateVariant(industrySlug);
}

export const INDUSTRY_WEBSITE_TEMPLATES = [
  "cleaning",
  "beauty",
  "technology",
  "tourism",
  "service-business",
] as const;
