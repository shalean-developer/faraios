export type MarketplaceListing = {
  companyId: string;
  slug: string;
  name: string;
  industry: string;
  industrySlug: string | null;
  summary: string | null;
  location: string | null;
  featured: boolean;
  websiteId: string;
  websitePreviewPath: string;
  websitePublicUrl: string | null;
  seoDescription: string | null;
  listedInMarketplace: boolean;
};

export type PublicBookingInput = {
  companyId: string;
  companySlug: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  service?: string;
  serviceId?: string;
  bookingDate: string;
  preferredTime?: string;
  address?: string;
  notes?: string;
  customResponses?: Record<string, unknown>;
  consentGiven?: boolean;
};
