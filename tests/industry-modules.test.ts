import { describe, expect, it } from "vitest";

import {
  getBookingFormPreset,
  getOnboardingDefaults,
  getServiceTemplates,
  listIndustryModuleSlugs,
  loadIndustryModule,
} from "../lib/industry-modules/loader";

describe("industry module loader", () => {
  it("registers all target industries", () => {
    const slugs = listIndustryModuleSlugs();
    for (const slug of [
      "cleaning",
      "beauty",
      "technology",
      "tourism",
      "plumbing",
      "electrical",
      "security",
      "gardening",
      "real-estate",
      "fitness",
      "consulting",
      "construction",
    ]) {
      expect(slugs).toContain(slug);
    }
  });

  it("returns cleaning-specific booking fields", () => {
    const fields = getBookingFormPreset("cleaning");
    expect(fields.some((f) => f.key === "bedrooms")).toBe(true);
    expect(fields.some((f) => f.key === "cleaning_type")).toBe(true);
  });

  it("returns beauty-specific booking fields", () => {
    const fields = getBookingFormPreset("beauty");
    expect(fields.some((f) => f.key === "allergies")).toBe(true);
  });

  it("returns tourism guest fields", () => {
    const fields = getBookingFormPreset("tourism");
    expect(fields.some((f) => f.key === "guests")).toBe(true);
  });

  it("provides service templates per industry", () => {
    expect(getServiceTemplates("technology").length).toBeGreaterThan(0);
    expect(getServiceTemplates("cleaning").some((s) => s.name.includes("Deep"))).toBe(true);
  });

  it("falls back to default module for unknown slugs", () => {
    const module = loadIndustryModule("unknown-industry");
    expect(module.slug).toBe("default");
  });

  it("maps legacy gym slug to fitness module", () => {
    expect(loadIndustryModule("gym").slug).toBe("fitness");
  });

  it("derives onboarding defaults from modules", () => {
    const defaults = getOnboardingDefaults("tourism");
    expect(defaults.featureSlugs).toContain("blog");
  });
});
