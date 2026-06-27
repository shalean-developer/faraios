export type WebsitePublishStatus = "draft" | "published" | "unpublished";

export type BuilderWebsite = {
  id: string;
  company_id: string;
  slug: string;
  title: string;
  description: string | null;
  status: WebsitePublishStatus;
  builder_mode: boolean;
  theme_settings: Record<string, unknown>;
  seo_title: string | null;
  seo_description: string | null;
  seo_keywords: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image_url: string | null;
  booking_button_label: string;
  booking_enabled: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
};

export type WebsitePageRecord = {
  id: string;
  website_id: string;
  company_id: string;
  page_type: string;
  title: string;
  slug: string;
  content: Record<string, unknown>;
  status: WebsitePublishStatus;
  seo_title: string | null;
  seo_description: string | null;
  og_title: string | null;
  og_description: string | null;
  og_image_url: string | null;
  created_at: string;
  updated_at: string;
};

export type WebsiteServicePageRecord = {
  id: string;
  website_id: string;
  company_id: string;
  service_id: string | null;
  slug: string;
  title: string;
  description: string | null;
  starting_price: string | null;
  duration: string | null;
  benefits: string[];
  faqs: { question: string; answer: string }[];
  image_url: string | null;
  status: WebsitePublishStatus;
  seo_title: string | null;
  seo_description: string | null;
  created_at: string;
  updated_at: string;
};

export type WebsiteEnquiryRecord = {
  id: string;
  website_id: string;
  company_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  service_interest: string | null;
  message: string | null;
  status: string;
  created_at: string;
};

export type WwwRedirectMode = "none" | "www_to_apex" | "apex_to_www";

export type DomainSettingsRecord = {
  id: string;
  website_id: string;
  company_id: string;
  default_url: string | null;
  requested_subdomain: string | null;
  custom_domain: string | null;
  custom_domain_status: string;
  www_redirect: WwwRedirectMode;
  created_at: string;
  updated_at: string;
};

export type LandingPageContent = {
  hero: {
    headline: string;
    subheadline: string;
    ctaLabel: string;
    imageUrl?: string | null;
  };
  about: {
    heading: string;
    body: string;
  };
  services: {
    heading: string;
    items: { title: string; description: string; priceFrom?: string }[];
  };
  whyChooseUs: {
    heading: string;
    items: string[];
  };
  contact: {
    heading: string;
    phone?: string | null;
    email?: string | null;
    location?: string | null;
    hours?: string | null;
  };
  footer: {
    businessName: string;
    tagline?: string | null;
  };
};
