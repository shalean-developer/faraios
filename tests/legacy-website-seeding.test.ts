import { describe, expect, it } from "vitest";

import { industryImagePreset } from "../lib/data/industry-stock-images";
import {
  buildDefaultWebsiteContent,
  resolveLegacyWebsiteContentVariant,
} from "../lib/services/websites";
import {
  isLuxuryBeautyWebsite,
  isServiceBusinessTemplate,
} from "../components/websites/website-content-form-data";

describe("legacy website seeding", () => {
  it("maps beauty-spa aliases to beauty stock imagery", () => {
    const preset = industryImagePreset("beauty-spa");
    expect(preset.heroImageAlt).toContain("spa");
    expect(preset.heroImage).toContain("unsplash.com");
  });

  it("prefers industry over generic service-business template for content", () => {
    expect(
      resolveLegacyWebsiteContentVariant({
        template: "service-business",
        industry: "beauty-spa",
      })
    ).toBe("beauty");

    expect(
      resolveLegacyWebsiteContentVariant({
        industry: "beauty-spa",
      })
    ).toBe("beauty");
  });

  it("seeds full service-business sections with industry copy", () => {
    const sections = buildDefaultWebsiteContent({
      businessName: "Rejuvenation Mobile Massage",
      industry: "beauty-spa",
      services: "",
      contactInfo: "Phone: 0821234567",
    });

    const sectionNames = sections.map((section) => section.section);
    expect(sectionNames).toContain("hero");
    expect(sectionNames).toContain("trustBand");
    expect(sectionNames).toContain("faq");
    expect(sectionNames).toContain("serviceAreas");

    const hero = sections.find((section) => section.section === "hero");
    expect(hero?.content.subtitle).toContain("spa");
  });

  it("enables full legacy CMS editor for beauty-spa websites", () => {
    expect(isServiceBusinessTemplate("beauty-spa", "beauty-spa")).toBe(true);
    expect(isLuxuryBeautyWebsite("beauty-spa", "beauty-spa")).toBe(true);
    expect(isServiceBusinessTemplate("service-business", "cleaning")).toBe(true);
  });
});
