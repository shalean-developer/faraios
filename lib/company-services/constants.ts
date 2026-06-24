import type { ServiceTemplate } from "@/lib/industry-modules/types";

export type { ServiceTemplate };

/** @deprecated Use getServiceTemplates from `@/lib/industry-modules/loader`. */
export { getServiceTemplates as getIndustryServiceTemplates } from "@/lib/industry-modules/loader";

/** Generic category presets for manual service creation. */
export const SERVICE_CATEGORY_PRESETS = [
  "General",
  "Residential",
  "Commercial",
  "Consultation",
  "Maintenance",
  "Other",
] as const;
