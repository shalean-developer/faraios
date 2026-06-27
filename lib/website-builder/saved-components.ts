import { catalogEntry } from "@/lib/website-builder/section-catalog";
import { defaultSectionProps } from "@/lib/website-builder/page-sections";
import {
  isSavedComponentType,
  type SavedComponentType,
  type WebsiteComponentRecord,
} from "@/types/website-builder-components";
import type { WebsiteSection, WebsiteSectionType } from "@/types/website-builder-sections";

export const SAVED_COMPONENT_LABELS: Record<SavedComponentType, string> = {
  hero: "Hero",
  footer: "Footer",
  faq: "FAQ",
  "cta-banner": "CTA Banner",
  "booking-cta": "Booking CTA",
};

function sectionId(): string {
  return `sec_${Math.random().toString(36).slice(2, 11)}`;
}

export function isSavableSectionType(type: WebsiteSectionType): type is SavedComponentType {
  return isSavedComponentType(type);
}

export function sectionFromSavedComponent(component: WebsiteComponentRecord): WebsiteSection {
  return {
    id: sectionId(),
    type: component.component_type,
    label: component.name,
    visible: true,
    mobileVisible: true,
    desktopVisible: true,
    props: structuredClone(component.props),
  };
}

export function propsFromSection(section: WebsiteSection): Record<string, unknown> | null {
  if (!isSavableSectionType(section.type)) return null;
  return structuredClone(section.props as Record<string, unknown>);
}

export function defaultPropsForComponentType(type: SavedComponentType): Record<string, unknown> {
  return defaultSectionProps(type);
}

export function defaultNameForComponentType(type: SavedComponentType): string {
  return `My ${catalogEntry(type).label}`;
}
