import type { WebsiteSectionType } from "@/types/website-builder-sections";

/** Block types users can save and reuse across pages. */
export const SAVED_COMPONENT_TYPES = [
  "hero",
  "footer",
  "faq",
  "cta-banner",
  "booking-cta",
] as const;

export type SavedComponentType = (typeof SAVED_COMPONENT_TYPES)[number];

export type WebsiteComponentRecord = {
  id: string;
  website_id: string;
  company_id: string;
  name: string;
  component_type: SavedComponentType;
  props: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export function isSavedComponentType(type: string): type is SavedComponentType {
  return (SAVED_COMPONENT_TYPES as readonly string[]).includes(type);
}

export function sectionTypeFromComponentType(type: SavedComponentType): WebsiteSectionType {
  return type;
}
