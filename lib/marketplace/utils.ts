import type { MarketplaceListing } from "@/types/marketplace";

export function marketplaceIndustriesFromListings(
  listings: MarketplaceListing[]
): string[] {
  return Array.from(new Set(listings.map((l) => l.industry))).sort();
}
