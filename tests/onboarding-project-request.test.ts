import { describe, expect, it } from "vitest";
import { planPageLimit } from "../lib/data/pricing";
import {
  canAddPageToPlan,
  trimPagesToPlanLimit,
} from "../lib/onboarding/plan-pages";
import { getSmartDefaultsForIndustrySlug } from "../lib/constants/industry-defaults";

describe("plan page limits", () => {
  it("trims starter plan pages to four", () => {
    const pages = [
      "Home",
      "About",
      "Services",
      "Contact",
      "Pricing",
      "FAQ",
    ];
    expect(trimPagesToPlanLimit(pages, "starter")).toEqual([
      "Home",
      "About",
      "Services",
      "Contact",
    ]);
  });

  it("blocks adding pages beyond starter limit", () => {
    const pages = ["Home", "About", "Services", "Contact"];
    expect(canAddPageToPlan(pages, "starter")).toBe(false);
    expect(canAddPageToPlan(pages, "premium")).toBe(true);
  });

  it("allows unlimited pages on premium", () => {
    expect(planPageLimit("premium")).toBeNull();
  });
});

describe("industry defaults", () => {
  it("uses seeded cleaning industry defaults", () => {
    const defaults = getSmartDefaultsForIndustrySlug("cleaning");
    expect(defaults.pages).toContain("Services");
    expect(defaults.featureSlugs).toContain("booking");
  });
});
