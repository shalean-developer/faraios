import { describe, expect, it } from "vitest";

import {
  canAccessWebsiteBuilderFeature,
  canAccessWebsiteSection,
  minimumPlanForWebsiteBuilderFeature,
  publicSiteUrl,
} from "@/lib/website-builder/access";
import { buildLandingContentFromCompany, defaultSeoForWebsite } from "@/lib/website-builder/service";
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

describe("website builder access", () => {
  it("starter gets preview only", () => {
    const company = { ...baseCompany, plan: "starter" };
    expect(canAccessWebsiteBuilderFeature(company, "websiteBuilderPreview")).toBe(true);
    expect(canAccessWebsiteBuilderFeature(company, "websiteBuilder")).toBe(false);
    expect(canAccessWebsiteBuilderFeature(company, "websitePublish")).toBe(false);
  });

  it("business gets basic builder and publish", () => {
    const company = { ...baseCompany, plan: "business" };
    expect(canAccessWebsiteBuilderFeature(company, "websiteBuilder")).toBe(true);
    expect(canAccessWebsiteBuilderFeature(company, "websitePublish")).toBe(true);
    expect(canAccessWebsiteBuilderFeature(company, "websiteServicePages")).toBe(false);
    expect(canAccessWebsiteBuilderFeature(company, "websiteSeo")).toBe(false);
  });

  it("pro gets service pages, seo, and enquiries", () => {
    const company = { ...baseCompany, plan: "pro" };
    expect(canAccessWebsiteBuilderFeature(company, "websiteServicePages")).toBe(true);
    expect(canAccessWebsiteBuilderFeature(company, "websiteSeo")).toBe(true);
    expect(canAccessWebsiteBuilderFeature(company, "websiteEnquiries")).toBe(true);
    expect(canAccessWebsiteBuilderFeature(company, "websiteDomains")).toBe(false);
  });

  it("enterprise gets custom domain settings", () => {
    const company = { ...baseCompany, plan: "enterprise" };
    expect(canAccessWebsiteBuilderFeature(company, "websiteDomains")).toBe(true);
  });

  it("website section visible for business builder or pro websites hub", () => {
    expect(canAccessWebsiteSection({ ...baseCompany, plan: "business" })).toBe(true);
    expect(canAccessWebsiteSection({ ...baseCompany, plan: "starter" })).toBe(true);
    expect(
      canAccessWebsiteSection({
        ...baseCompany,
        plan: "starter",
        subscription_status: "active",
      })
    ).toBe(true);
  });

  it("reports minimum plan for gated features", () => {
    expect(minimumPlanForWebsiteBuilderFeature("websiteBuilder")).toBe("Business");
    expect(minimumPlanForWebsiteBuilderFeature("websiteSeo")).toBe("Pro");
    expect(minimumPlanForWebsiteBuilderFeature("websiteDomains")).toBe("Enterprise");
  });
});

describe("website builder content", () => {
  it("builds landing content from company profile", () => {
    const landing = buildLandingContentFromCompany(baseCompany, [
      { name: "Deep clean", description: "Full home clean", base_price_cents: 120000 },
    ]);
    expect(landing.hero.headline).toBe("Acme Cleaning");
    expect(landing.services.items[0]?.title).toBe("Deep clean");
    expect(landing.contact.phone).toBe("+27123456789");
  });

  it("generates default SEO metadata", () => {
    const seo = defaultSeoForWebsite(baseCompany);
    expect(seo.seo_title).toContain("Acme Cleaning");
    expect(seo.seo_title).toContain("Cape Town");
    expect(seo.seo_keywords).toContain("Cleaning");
  });

  it("builds public site URL", () => {
    expect(publicSiteUrl("acme-cleaning", "https://app.faraios.com")).toBe(
      "https://app.faraios.com/site/acme-cleaning"
    );
  });
});
