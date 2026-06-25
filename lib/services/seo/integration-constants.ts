import type { SeoIntegrationProvider } from "@/types/seo-v10";

export function isSearchConsoleOAuthReady(): boolean {
  return Boolean(
    process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_ID?.trim() &&
      process.env.GOOGLE_SEARCH_CONSOLE_CLIENT_SECRET?.trim()
  );
}

export const INTEGRATION_PROVIDER_META: {
  provider: SeoIntegrationProvider;
  label: string;
  description: string;
}[] = [
  {
    provider: "google_search_console",
    label: "Google Search Console",
    description: "Import clicks, impressions, and search queries.",
  },
  {
    provider: "google_analytics",
    label: "Google Analytics",
    description: "Track traffic and conversion metrics.",
  },
  {
    provider: "google_business_profile",
    label: "Google Business Profile",
    description: "Sync local business data and reviews.",
  },
  {
    provider: "google_indexing_api",
    label: "Google Indexing API",
    description: "Request URL indexing programmatically.",
  },
];

export function getIntegrationConnectUrl(
  provider: SeoIntegrationProvider,
  companyId: string,
  gscOAuthReady: boolean
): string | null {
  switch (provider) {
    case "google_search_console":
      return gscOAuthReady
        ? `/api/integrations/google-search-console/connect?companyId=${encodeURIComponent(companyId)}`
        : null;
    default:
      return null;
  }
}
