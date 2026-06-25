import type { BookingFormTemplate } from "@/types/booking-form";

/** Default cleaning service templates — used as starter config, not hardcoded per business. */
export const CLEANING_FORM_TEMPLATES: BookingFormTemplate[] = [
  {
    key: "regular",
    name: "Regular cleaning",
    description: "Standard home clean for kitchens, bathrooms, and living areas.",
    enabled: true,
  },
  {
    key: "deep",
    name: "Deep cleaning",
    description: "Detailed clean including skirting, fixtures, and hard-to-reach areas.",
    enabled: true,
  },
  {
    key: "airbnb",
    name: "Airbnb cleaning",
    description: "Turnover clean for short-term rental properties.",
    enabled: true,
  },
  {
    key: "office",
    name: "Office cleaning",
    description: "Desks, floors, kitchenette, and restrooms.",
    enabled: true,
  },
  {
    key: "move",
    name: "Move-in/move-out cleaning",
    description: "Empty property clean before handover or occupation.",
    enabled: true,
  },
  {
    key: "carpet",
    name: "Carpet cleaning",
    description: "Professional carpet shampoo and stain treatment.",
    enabled: true,
  },
  {
    key: "custom",
    name: "Custom cleaning service",
    description: "Tailored cleaning scope — quote on request.",
    enabled: false,
  },
];

export function defaultCleaningTemplates(): BookingFormTemplate[] {
  return CLEANING_FORM_TEMPLATES.map((t) => ({ ...t }));
}
