import { describe, expect, it, vi } from "vitest";

import {
  MARKETPLACE_LISTING_REQUIRES_PUBLISH,
  MARKETPLACE_LISTING_REQUIRES_WEBSITE,
  getCompanyMarketplaceListingEligibility,
} from "@/lib/marketplace/listing-eligibility";

function mockSupabase(result: { data: unknown; error?: null }) {
  return {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn(() => ({
              maybeSingle: vi.fn(async () => result),
            })),
          })),
        })),
      })),
    })),
  };
}

describe("getCompanyMarketplaceListingEligibility", () => {
  it("blocks listing when the company has no website", async () => {
    const supabase = mockSupabase({ data: null });
    const eligibility = await getCompanyMarketplaceListingEligibility(
      supabase as never,
      "company-1"
    );

    expect(eligibility.canList).toBe(false);
    expect(eligibility.hasWebsite).toBe(false);
    expect(eligibility.blockReason).toBe(MARKETPLACE_LISTING_REQUIRES_WEBSITE);
  });

  it("blocks listing when the website is still a draft", async () => {
    const supabase = mockSupabase({
      data: { id: "website-1", status: "draft" },
    });
    const eligibility = await getCompanyMarketplaceListingEligibility(
      supabase as never,
      "company-1"
    );

    expect(eligibility.canList).toBe(false);
    expect(eligibility.websiteId).toBe("website-1");
    expect(eligibility.blockReason).toBe(MARKETPLACE_LISTING_REQUIRES_PUBLISH);
  });

  it("allows listing when the website is published", async () => {
    const supabase = mockSupabase({
      data: { id: "website-1", status: "published" },
    });
    const eligibility = await getCompanyMarketplaceListingEligibility(
      supabase as never,
      "company-1"
    );

    expect(eligibility.canList).toBe(true);
    expect(eligibility.websitePublished).toBe(true);
    expect(eligibility.blockReason).toBeNull();
  });
});
