import type { WebsiteConnectionStatus } from "@/lib/websites/status";

export type WebsiteDomainType = "primary" | "subdomain" | "preview";

export type WebsiteDomain = {
  id: string;
  company_id: string;
  website_id: string | null;
  connected_website_id: string | null;
  domain: string;
  domain_type: WebsiteDomainType;
  verification_token: string;
  verification_status: "pending" | "verified" | "failed";
  ssl_status: "not_started" | "pending" | "active" | "failed";
  hosting_provider: string | null;
  provider_domain_id: string | null;
  is_primary: boolean;
  last_checked_at: string | null;
  created_at: string;
  updated_at: string;
};

export type WebsiteDnsRecord = {
  id: string;
  website_domain_id: string;
  record_type: "CNAME" | "A" | "TXT";
  host: string;
  value: string;
  status: "pending" | "verified" | "failed";
  last_checked_at: string | null;
  created_at: string;
};

export type WebsiteDeployment = {
  id: string;
  company_id: string;
  website_id: string;
  environment: "preview" | "production";
  status: "queued" | "building" | "live" | "failed" | "cancelled";
  hosting_provider: string;
  provider_deployment_id: string | null;
  build_error: string | null;
  url: string | null;
  created_at: string;
  updated_at: string;
};

export type WebsiteTrackingEventType =
  | "page_visit"
  | "booking_form_view"
  | "booking_submission"
  | "quote_request"
  | "contact_submission";

export type WebsiteTrackingEvent = {
  id: string;
  company_id: string;
  website_id: string | null;
  connected_website_id: string | null;
  event_type: WebsiteTrackingEventType;
  source_url: string | null;
  referrer: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  device_type: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type BusinessApiKeyEvent = {
  id: string;
  company_id: string;
  event_type: "generated" | "rotated" | "revoked" | "used";
  key_prefix: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

/** Extended connected website with V4 fields */
export type ConnectedWebsiteV4 = {
  id: string;
  company_id: string;
  type: "external" | "hosted";
  production_url: string | null;
  api_key: string;
  name: string | null;
  status: WebsiteConnectionStatus;
  primary_domain: string | null;
  preview_subdomain: string | null;
  hosting_provider: string | null;
  booking_enabled: boolean;
  tracking_enabled: boolean;
  seo_enabled: boolean;
  api_key_status: "active" | "revoked";
  api_key_last_used_at: string | null;
  website_id: string | null;
  created_at: string;
  updated_at: string;
};

/** Extended hosted website with V4 fields */
export type WebsiteV4 = {
  connection_status: WebsiteConnectionStatus;
  hosting_provider: string | null;
  booking_enabled: boolean;
  tracking_enabled: boolean;
  seo_connection_enabled: boolean;
  preview_subdomain: string | null;
};

export type LeadSourceFields = {
  sourceWebsite?: string | null;
  referrer?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  websiteId?: string | null;
  deviceType?: string | null;
};
