import { describe, expect, it } from "vitest";

import { V8_INDUSTRY_TEMPLATE_KEYS } from "@/lib/industry-modules/registry";
import {
  buildIndustryTemplatePageContent,
  buildLandingFromIndustryTemplate,
  getWebsiteBuilderIndustryTemplate,
  listWebsiteBuilderIndustryTemplates,
} from "@/lib/website-builder/industry-site-templates";
import type { CompanyWithIndustry } from "@/types/database";

const baseCompany: CompanyWithIndustry = {
  id: "c1",
  name: "Acme Cleaning",
  slug: "acme-cleaning",
  plan: "business",
  subscription_status: "active",
  business_description: "Professional cleaning services in Cape Town.",
  contact_phone: "+27123456789",
  primary_contact_email: "hello@acme.test",
  contact_location: "Cape Town",
  brand_logo_url: null,
  brand_primary_color: "#6366f1",
  brand_accent_color: "#4f46e5",
  industries: { name: "Cleaning", slug: "cleaning" },
} as CompanyWithIndustry;

describe("website builder industry site templates", () => {
  it("lists a template for each V8 industry", () => {
    const templates = listWebsiteBuilderIndustryTemplates();
    expect(templates).toHaveLength(V8_INDUSTRY_TEMPLATE_KEYS.length);
    expect(templates.map((t) => t.industryKey)).toEqual([...V8_INDUSTRY_TEMPLATE_KEYS]);
  });

  it("provides distinct theme colors per industry", () => {
    const cleaning = getWebsiteBuilderIndustryTemplate("cleaning");
    const plumbing = getWebsiteBuilderIndustryTemplate("plumbing");
    expect(cleaning.primaryColor).not.toBe(plumbing.primaryColor);
    expect(cleaning.whyChooseUs.length).toBeGreaterThan(0);
  });

  it("builds cleaning landing content from company profile", () => {
    const landing = buildLandingFromIndustryTemplate(baseCompany, "cleaning", [
      { name: "Deep clean", description: "Full home clean", base_price_cents: 120000 },
    ]);
    expect(landing.hero.headline).toBe("Acme Cleaning");
    expect(landing.services.items[0]?.title).toBe("Deep clean");
    expect(landing.services.items[0]?.priceFrom).toBe("From R1200");
    expect(landing.contact.phone).toBe("+27123456789");
    expect(landing.whyChooseUs.items.length).toBeGreaterThan(0);
  });

  it("falls back to module services when company has none", () => {
    const landing = buildLandingFromIndustryTemplate(baseCompany, "plumbing", []);
    expect(landing.services.items.some((s) => s.title === "Leak Repair")).toBe(true);
  });

  it("builds v2 page content with testimonials, process, and faq sections", () => {
    const content = buildIndustryTemplatePageContent(baseCompany, "construction", []);
    expect(content.schemaVersion).toBe(2);
    expect(content.sections?.some((s) => s.type === "testimonials")).toBe(true);
    expect(content.sections?.some((s) => s.type === "process")).toBe(true);
    expect(content.sections?.some((s) => s.type === "faq")).toBe(true);
    expect(content.hero.headline).toBe("Acme Cleaning");
  });

  it("applies stock images to hero, about, services, and gallery", () => {
    const content = buildIndustryTemplatePageContent(baseCompany, "cleaning", []);
    const hero = content.sections?.find((s) => s.type === "hero");
    const about = content.sections?.find((s) => s.type === "about");
    const services = content.sections?.find((s) => s.type === "services");
    const gallery = content.sections?.find((s) => s.type === "gallery");

    expect((hero?.props as { backgroundImageUrl?: string }).backgroundImageUrl).toContain("unsplash.com");
    expect((about?.props as { imageUrl?: string }).imageUrl).toContain("unsplash.com");
    expect(
      ((services?.props as { items?: { imageUrl?: string }[] }).items ?? [])[0]?.imageUrl
    ).toContain("unsplash.com");
    expect((gallery?.props as { images?: string[] }).images?.length).toBeGreaterThan(0);
  });

  it("exposes preview image on each template", () => {
    for (const key of V8_INDUSTRY_TEMPLATE_KEYS) {
      const template = getWebsiteBuilderIndustryTemplate(key);
      expect(template.previewImage).toContain("unsplash.com");
      expect(template.previewImageAlt.length).toBeGreaterThan(0);
    }
  });
});
