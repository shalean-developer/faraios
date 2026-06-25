import { describe, expect, it } from "vitest";

import {
  getIndustryNavLabels,
  getIndustryTemplate,
  listIndustryTemplates,
} from "@/lib/industry-templates/industryTemplates";
import { V8_INDUSTRY_TEMPLATE_KEYS } from "@/lib/industry-modules/registry";

describe("V8 industry templates", () => {
  it("registers all nine V8 industries", () => {
    expect(V8_INDUSTRY_TEMPLATE_KEYS).toEqual([
      "cleaning",
      "beauty",
      "repairs",
      "plumbing",
      "electrical",
      "freelancers",
      "consulting",
      "agencies",
      "construction",
    ]);
    expect(listIndustryTemplates()).toHaveLength(9);
  });

  it("provides cleaning default services", () => {
    const template = getIndustryTemplate("cleaning");
    expect(template.defaultServices.some((s) => s.name === "Regular Cleaning")).toBe(true);
    expect(template.defaultServices.some((s) => s.name === "Deep Cleaning")).toBe(true);
    expect(template.pricingExamples.length).toBeGreaterThan(0);
  });

  it("provides beauty dashboard labels", () => {
    const labels = getIndustryNavLabels("beauty");
    expect(labels.bookings).toBe("Appointments");
    expect(labels.customers).toBe("Clients");
    expect(labels.services).toBe("Treatments");
  });

  it("provides construction services", () => {
    const template = getIndustryTemplate("construction");
    expect(template.defaultServices.some((s) => s.name === "Site Inspection")).toBe(true);
    expect(template.defaultServices.some((s) => s.name === "Tiling")).toBe(true);
  });

  it("maps consultants alias to consulting module", () => {
    const template = getIndustryTemplate("consultants");
    expect(template.industryKey).toBe("consulting");
    expect(template.defaultServices.some((s) => s.name === "Strategy Session")).toBe(true);
  });

  it("includes industry booking fields", () => {
    const plumbing = getIndustryTemplate("plumbing");
    expect(plumbing.bookingFields.some((f) => f.key === "plumbing_issue")).toBe(true);
    const electrical = getIndustryTemplate("electrical");
    expect(electrical.bookingFields.some((f) => f.key === "safety_urgency")).toBe(true);
  });
});
