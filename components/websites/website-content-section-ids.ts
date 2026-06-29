import type { ContentSectionId } from "@/components/websites/website-content-editor-sections";

const MODERN_SECTION_ALIASES: Record<string, ContentSectionId> = {
  transform: "transform",
  transformshowcase: "transform",
  "dreams-into-reality": "transform",
  testimonials: "testimonials",
  reviews: "testimonials",
  "clients-love-us": "testimonials",
  craftsmanship: "craftsmanship",
  craft: "craftsmanship",
  "homes-made-perfect": "craftsmanship",
  blog: "blog",
  homeblog: "blog",
  "expert-insights": "blog",
  workprocess: "workProcess",
  process: "workProcess",
  featurebanner: "featureBanner",
  banner: "featureBanner",
  "why-us": "whyChooseUs",
  whychooseus: "whyChooseUs",
  "quality-you-trust": "whyChooseUs",
};

const VALID_SECTIONS = new Set<string>([
  "brand",
  "hero",
  "about",
  "services",
  "trust",
  "workProcess",
  "whyChooseUs",
  "featureBanner",
  "transform",
  "testimonials",
  "craftsmanship",
  "process",
  "faq",
  "blog",
  "areas",
  "cta",
  "contact",
  "footer",
]);

export function resolveContentSectionId(
  value: string | null | undefined,
  modernOverlay: boolean
): ContentSectionId {
  const raw = (value ?? "").trim();
  if (!raw) return modernOverlay ? "brand" : "hero";

  const key = raw.toLowerCase();
  const alias = MODERN_SECTION_ALIASES[key];
  if (alias) return alias;
  if (VALID_SECTIONS.has(raw)) return raw as ContentSectionId;

  return modernOverlay ? "brand" : "hero";
}
