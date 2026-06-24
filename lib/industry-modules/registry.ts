import type { IndustryModule } from "./types";
import { beautySpaModule } from "./modules/beauty-spa";
import { cleaningModule } from "./modules/cleaning";
import { constructionModule } from "./modules/construction";
import { consultingModule } from "./modules/consulting";
import { defaultModule } from "./modules/default";
import { electricalModule } from "./modules/electrical";
import { fitnessModule } from "./modules/fitness";
import { gardeningModule } from "./modules/gardening";
import { plumbingModule } from "./modules/plumbing";
import { realEstateModule } from "./modules/real-estate";
import { securityModule } from "./modules/security";
import { technologyServicesModule } from "./modules/technology-services";
import { tourismTravelModule } from "./modules/tourism-travel";

/** Canonical industry modules keyed by primary slug. */
export const INDUSTRY_MODULES: Record<string, IndustryModule> = {
  cleaning: cleaningModule,
  beauty: beautySpaModule,
  technology: technologyServicesModule,
  tourism: tourismTravelModule,
  plumbing: plumbingModule,
  electrical: electricalModule,
  security: securityModule,
  gardening: gardeningModule,
  "real-estate": realEstateModule,
  fitness: fitnessModule,
  consulting: consultingModule,
  construction: constructionModule,
  default: defaultModule,
};

/** Legacy and alias slugs mapped to canonical module keys. */
export const INDUSTRY_SLUG_ALIASES: Record<string, string> = {
  gym: "fitness",
  "beauty-spa": "beauty",
  "technology-services": "technology",
  "tourism-travel": "tourism",
  spa: "beauty",
  wellness: "beauty",
};

export function normalizeIndustrySlug(slug: string | null | undefined): string {
  const raw = slug?.trim().toLowerCase() || "default";
  return INDUSTRY_SLUG_ALIASES[raw] ?? raw;
}

export function listRegisteredIndustrySlugs(): string[] {
  return Object.keys(INDUSTRY_MODULES).filter((slug) => slug !== "default");
}
