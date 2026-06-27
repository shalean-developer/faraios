export type LocalSeoSettings = {
  company_id: string;
  business_name: string | null;
  industry: string | null;
  main_service: string | null;
  primary_location: string | null;
  service_areas: string[];
  phone: string | null;
  email: string | null;
  address: string | null;
  opening_hours: Record<string, unknown>;
  google_business_profile_url: string | null;
  google_review_link: string | null;
  business_categories: string[];
  social_links: Record<string, string>;
  auto_review_request_enabled: boolean;
  latitude?: number | null;
  longitude?: number | null;
  google_maps_url?: string | null;
  logo_url?: string | null;
  whatsapp?: string | null;
  knowledge_graph_data?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type ServiceAreaPage = {
  id: string;
  company_id: string;
  website_id: string | null;
  slug: string;
  service_name: string;
  area_name: string;
  seo_title: string | null;
  meta_description: string | null;
  h1: string | null;
  intro_content: string | null;
  services_offered: string[];
  nearby_areas: string[];
  faq: { question: string; answer: string }[];
  cta_text: string | null;
  status: "draft" | "published";
  created_at: string;
  updated_at: string;
};

export type ContentPostCategory = "blog" | "guide" | "service_article" | "faq";
export type ContentPostStatus = "draft" | "published";

export type ContentPost = {
  id: string;
  company_id: string;
  title: string;
  slug: string;
  meta_title: string | null;
  meta_description: string | null;
  featured_image: string | null;
  category: ContentPostCategory;
  author: string | null;
  status: ContentPostStatus;
  published_at: string | null;
  content_body: string | null;
  cta_text: string | null;
  cta_link: string | null;
  blog_category_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ReviewRequestStatus = "sent" | "clicked" | "failed";

export type ReviewRequest = {
  id: string;
  company_id: string;
  customer_id: string | null;
  booking_id: string | null;
  customer_email: string | null;
  customer_name: string | null;
  status: ReviewRequestStatus;
  sent_at: string;
  clicked_at: string | null;
  created_at: string;
};

export type CampaignType =
  | "promotion"
  | "follow_up"
  | "reactivation"
  | "seasonal"
  | "reminder";

export type EmailCampaign = {
  id: string;
  company_id: string;
  name: string;
  campaign_type: CampaignType;
  subject: string;
  body_html: string;
  status: "draft" | "scheduled" | "sent";
  sent_count: number;
  open_count: number;
  click_count: number;
  bookings_generated: number;
  revenue_generated_cents: number;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
};

export type LeadType = "contact" | "quote_request" | "general";
export type LeadStatus = "new" | "contacted" | "converted" | "archived";

export type Lead = {
  id: string;
  company_id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  message: string | null;
  lead_type: LeadType;
  source: string | null;
  source_website: string | null;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  landing_page: string | null;
  conversion_page: string | null;
  status: LeadStatus;
  customer_id: string | null;
  created_at: string;
};

export type SeoAuditResult = {
  score: number;
  missingMetaTitles: number;
  missingMetaDescriptions: number;
  missingH1: number;
  missingServiceAreaPages: number;
  sitemapStatus: "ok" | "partial" | "missing";
  schemaStatus: "ok" | "partial" | "missing";
  indexedPagesPlaceholder: number;
  topKeywords: string[];
  recommendedActions: string[];
};

export type MarketingAnalytics = {
  websiteVisits: number;
  leads: number;
  bookings: number;
  quoteRequests: number;
  conversionRate: number;
  topSources: { source: string; count: number }[];
  topServicePages: { page: string; count: number }[];
  reviewRequestsSent: number;
  campaignPerformance: {
    name: string;
    sentCount: number;
    bookingsGenerated: number;
    revenueCents: number;
  }[];
  campaignRevenueCents: number;
};
