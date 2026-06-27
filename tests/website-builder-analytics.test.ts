import { describe, expect, it } from "vitest";

import {
  aggregateBuilderAnalytics,
  buildBuilderPageCatalog,
  computePageSeoScore,
  extractPathFromUrl,
  percentile75,
  webVitalRating,
} from "@/lib/website-builder/analytics";
import type { BuilderWebsite } from "@/types/website-builder";

const website = {
  id: "w1",
  company_id: "c1",
  slug: "acme",
  title: "Acme Cleaning",
  description: null,
  status: "published",
  builder_mode: true,
  theme_settings: {},
  seo_title: "Acme Cleaning Cape Town",
  seo_description: "Professional cleaning services across Cape Town with trusted teams and flexible scheduling for homes and offices.",
  seo_keywords: null,
  og_title: null,
  og_description: null,
  og_image_url: null,
  booking_button_label: "Book Now",
  published_at: null,
  created_at: "",
  updated_at: "",
} as BuilderWebsite;

describe("builder analytics", () => {
  it("extracts pathname from full URLs", () => {
    expect(extractPathFromUrl("https://example.com/site/acme/services/deep-clean")).toBe(
      "/site/acme/services/deep-clean"
    );
    expect(extractPathFromUrl("/site/acme")).toBe("/site/acme");
  });

  it("scores pages with complete metadata higher", () => {
    const strong = computePageSeoScore({
      title: "Acme Cleaning Cape Town — Trusted Pros",
      description:
        "Professional cleaning services across Cape Town with trusted teams and flexible scheduling for homes and offices every week.",
    });
    const weak = computePageSeoScore({ title: null, description: null });
    expect(strong).toBeGreaterThan(weak);
    expect(strong).toBeLessThanOrEqual(100);
  });

  it("rates core web vitals using standard thresholds", () => {
    expect(webVitalRating("LCP", 2000)).toBe("good");
    expect(webVitalRating("LCP", 5000)).toBe("poor");
    expect(webVitalRating("CLS", 0.05)).toBe("good");
    expect(webVitalRating("INP", 300)).toBe("needs-improvement");
  });

  it("computes p75 for vital samples", () => {
    expect(percentile75([100, 200, 300, 400])).toBe(300);
  });

  it("aggregates views and conversions per page", () => {
    const pages = buildBuilderPageCatalog({
      website,
      servicePages: [
        {
          id: "sp1",
          website_id: "w1",
          company_id: "c1",
          service_id: null,
          slug: "deep-clean",
          title: "Deep clean",
          description: "Full home clean",
          starting_price: null,
          duration: null,
          benefits: [],
          faqs: [],
          image_url: null,
          status: "published",
          seo_title: "Deep clean Cape Town",
          seo_description: "Detailed deep cleaning for homes and offices in Cape Town.",
          created_at: "",
          updated_at: "",
        },
      ],
      companySlug: "acme",
    });

    const analytics = aggregateBuilderAnalytics({
      pages,
      events: [
        {
          event_type: "page_visit",
          source_url: "https://faraios.com/site/acme",
          referrer: null,
          utm_source: null,
          device_type: "mobile",
          metadata: {},
        },
        {
          event_type: "page_visit",
          source_url: "https://faraios.com/site/acme/services/deep-clean",
          referrer: "https://google.com",
          utm_source: null,
          device_type: "desktop",
          metadata: {},
        },
        {
          event_type: "contact_submission",
          source_url: "https://faraios.com/site/acme",
          referrer: null,
          utm_source: null,
          device_type: "mobile",
          metadata: {},
        },
        {
          event_type: "click",
          source_url: "https://faraios.com/site/acme",
          referrer: null,
          utm_source: null,
          device_type: "mobile",
          metadata: { label: "Book Now", href: "/book/c1", element: "link" },
        },
        {
          event_type: "click",
          source_url: "https://faraios.com/site/acme",
          referrer: null,
          utm_source: null,
          device_type: "mobile",
          metadata: { label: "Book Now", href: "/book/c1", element: "link" },
        },
        {
          event_type: "web_vital",
          source_url: "https://faraios.com/site/acme",
          referrer: null,
          utm_source: null,
          device_type: "mobile",
          metadata: { name: "LCP", value: 1800 },
        },
      ],
    });

    expect(analytics.totalViews).toBe(2);
    expect(analytics.totalClicks).toBe(2);
    expect(analytics.totalConversions).toBe(1);
    expect(analytics.conversionRate).toBe(50);
    expect(analytics.pages.find((page) => page.label === "Home")?.views).toBe(1);
    expect(analytics.pages.find((page) => page.label === "Home")?.clicks).toBe(2);
    expect(analytics.pages.find((page) => page.label === "Deep clean")?.views).toBe(1);
    expect(analytics.topClicks[0]?.label).toBe("Book Now");
    expect(analytics.topClicks[0]?.count).toBe(2);
    expect(analytics.webVitals[0]?.name).toBe("LCP");
    expect(analytics.hasData).toBe(true);
  });
});
