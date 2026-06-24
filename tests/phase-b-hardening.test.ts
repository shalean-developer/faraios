import { describe, expect, it } from "vitest";

import { applyCompanyBrandingToSite, applyWebsiteVariantToSite } from "../lib/website-templates/apply-variant";
import {
  getWebsiteVariantTheme,
  industrySlugToWebsiteTemplate,
  resolveWebsiteTemplateVariant,
} from "../lib/website-templates/variants";
import { parseSiteContent } from "../templates/service-business/content";

describe("website template variants", () => {
  it("maps industry slugs to template variants", () => {
    expect(resolveWebsiteTemplateVariant("beauty-spa")).toBe("beauty");
    expect(resolveWebsiteTemplateVariant("technology-services")).toBe("technology");
    expect(resolveWebsiteTemplateVariant("tourism-travel")).toBe("tourism");
    expect(industrySlugToWebsiteTemplate("cleaning")).toBe("cleaning");
  });

  it("applies distinct themes per industry variant", () => {
    const base = parseSiteContent([]);
    const cleaning = applyWebsiteVariantToSite(base, "cleaning");
    const beauty = applyWebsiteVariantToSite(base, "beauty");

    expect(cleaning.theme.primary).not.toBe(beauty.theme.primary);
    expect(getWebsiteVariantTheme("technology").accent).toBe("#2563eb");
    expect(getWebsiteVariantTheme("tourism").tagline).toContain("DISCOVER");
  });

  it("merges company branding over variant theme", () => {
    const base = parseSiteContent([]);
    const variantSite = applyWebsiteVariantToSite(base, "cleaning");
    const branded = applyCompanyBrandingToSite(variantSite, {
      logoUrl: "https://example.com/logo.png",
      primaryColor: "#ff0000",
      accentColor: "#00ff00",
    });

    expect(branded.topbar.logo).toBe("https://example.com/logo.png");
    expect(branded.theme.primary).toBe("#ff0000");
    expect(branded.theme.accent).toBe("#00ff00");
    expect(branded.variant).toBe("cleaning");
  });
});

describe("notification preferences parser", () => {
  it("defaults missing keys to true for operational alerts", async () => {
    const { parseNotificationPreferences } = await import(
      "../lib/services/company-notification-preferences"
    );
    const prefs = parseNotificationPreferences({});
    expect(prefs.emailBookingAlerts).toBe(true);
    expect(prefs.emailMarketingDigest).toBe(false);
  });
});
