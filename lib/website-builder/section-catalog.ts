import type { WebsiteSectionType } from "@/types/website-builder-sections";

export type SectionCatalogEntry = {
  type: WebsiteSectionType;
  label: string;
  description: string;
  category: "content" | "conversion" | "social" | "advanced";
};

export const WEBSITE_SECTION_CATALOG: SectionCatalogEntry[] = [
  { type: "hero", label: "Hero", description: "Headline, CTAs, background media", category: "content" },
  { type: "about", label: "About", description: "Business story and introduction", category: "content" },
  { type: "services", label: "Services", description: "Service cards grid", category: "content" },
  { type: "pricing", label: "Pricing", description: "Plans and pricing tables", category: "conversion" },
  { type: "gallery", label: "Gallery", description: "Image gallery", category: "content" },
  { type: "team", label: "Team", description: "Team members", category: "social" },
  { type: "testimonials", label: "Testimonials", description: "Customer reviews", category: "social" },
  { type: "faq", label: "FAQ", description: "Questions and answers", category: "content" },
  { type: "contact", label: "Contact", description: "Contact details", category: "conversion" },
  { type: "booking-form", label: "Booking Form", description: "Embedded booking form", category: "conversion" },
  { type: "booking-cta", label: "Booking CTA", description: "Book now call-to-action", category: "conversion" },
  { type: "map", label: "Google Map", description: "Location map embed", category: "content" },
  { type: "statistics", label: "Statistics", description: "Key numbers and metrics", category: "content" },
  { type: "logos", label: "Logos", description: "Partner or client logos", category: "social" },
  { type: "process", label: "Process", description: "How it works steps", category: "content" },
  { type: "cta-banner", label: "CTA Banner", description: "Full-width call to action", category: "conversion" },
  { type: "footer", label: "Footer", description: "Site footer with business name and tagline", category: "content" },
  { type: "blog-posts", label: "Blog Posts", description: "Latest articles", category: "content" },
  { type: "newsletter", label: "Newsletter", description: "Email signup", category: "conversion" },
  { type: "why-choose-us", label: "Why Choose Us", description: "Differentiators list", category: "content" },
  { type: "custom-html", label: "Custom HTML", description: "Raw HTML block", category: "advanced" },
  {
    type: "custom-component",
    label: "Custom Component",
    description: "React component placeholder",
    category: "advanced",
  },
];

export function catalogEntry(type: WebsiteSectionType): SectionCatalogEntry {
  return (
    WEBSITE_SECTION_CATALOG.find((entry) => entry.type === type) ?? {
      type,
      label: type,
      description: "",
      category: "content",
    }
  );
}
