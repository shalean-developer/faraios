import type { IndustryModule } from "./types";
import { agenciesModule } from "./modules/agencies";
import { beautySpaModule } from "./modules/beauty-spa";
import { cleaningModule } from "./modules/cleaning";
import { constructionModule } from "./modules/construction";
import { consultingModule } from "./modules/consulting";
import { defaultModule } from "./modules/default";
import { electricalModule } from "./modules/electrical";
import { fitnessModule } from "./modules/fitness";
import { freelancersModule } from "./modules/freelancers";
import { gardeningModule } from "./modules/gardening";
import { plumbingModule } from "./modules/plumbing";
import { realEstateModule } from "./modules/real-estate";
import { repairsModule } from "./modules/repairs";
import { securityModule } from "./modules/security";
import { technologyServicesModule } from "./modules/technology-services";
import { tourismTravelModule } from "./modules/tourism-travel";

/** Canonical industry modules keyed by primary slug. */
export const INDUSTRY_MODULES: Record<string, IndustryModule> = {
  cleaning: cleaningModule,
  beauty: beautySpaModule,
  repairs: repairsModule,
  plumbing: plumbingModule,
  electrical: electricalModule,
  freelancers: freelancersModule,
  consulting: consultingModule,
  consultants: consultingModule,
  agencies: agenciesModule,
  construction: constructionModule,
  technology: technologyServicesModule,
  tourism: tourismTravelModule,
  security: securityModule,
  gardening: gardeningModule,
  "real-estate": realEstateModule,
  fitness: fitnessModule,
  default: defaultModule,
};

/** V8 primary industry template keys shown in onboarding. */
export const V8_INDUSTRY_TEMPLATE_KEYS = [
  "cleaning",
  "beauty",
  "repairs",
  "plumbing",
  "electrical",
  "freelancers",
  "consulting",
  "agencies",
  "construction",
] as const;

export type V8IndustryTemplateKey = (typeof V8_INDUSTRY_TEMPLATE_KEYS)[number];

/** Legacy and alias slugs mapped to canonical module keys. */
export const INDUSTRY_SLUG_ALIASES: Record<string, string> = {
  gym: "fitness",
  "beauty-spa": "beauty",
  "technology-services": "technology",
  "tourism-travel": "tourism",
  spa: "beauty",
  wellness: "beauty",
  consultant: "consulting",
};

export function normalizeIndustrySlug(slug: string | null | undefined): string {
  const raw = slug?.trim().toLowerCase() || "default";
  return INDUSTRY_SLUG_ALIASES[raw] ?? raw;
}

export function listRegisteredIndustrySlugs(): string[] {
  return Object.keys(INDUSTRY_MODULES).filter((slug) => slug !== "default");
}
