import { getMarketplaceBookingUrlForClient } from "@/lib/services/marketplace";
import { renderWebsiteTemplate } from "@/lib/services/render-website-template";
import {
  getWebsiteByIdForPreview,
  getWebsiteContentByWebsiteIdForPreview,
} from "@/lib/services/websites";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import type { CompanyBranding } from "@/lib/website-templates/apply-variant";

async function getCompanyBranding(companyId: string): Promise<CompanyBranding | null> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return null;

  const { data } = await admin.client
    .from("companies")
    .select("brand_logo_url, brand_primary_color, brand_accent_color")
    .eq("id", companyId)
    .maybeSingle();

  if (!data) return null;

  return {
    logoUrl: data.brand_logo_url,
    primaryColor: data.brand_primary_color,
    accentColor: data.brand_accent_color,
  };
}

export type PreviewPageSection = "home" | "services" | "about" | "reviews" | "contact";

export async function renderPreviewWebsitePage(
  websiteId: string,
  pageSection: PreviewPageSection = "home"
) {
  const website = await getWebsiteByIdForPreview(websiteId);
  if (!website) {
    return null;
  }

  const [content, marketplaceBookingUrl, companyBranding] = await Promise.all([
    getWebsiteContentByWebsiteIdForPreview(website.id),
    getMarketplaceBookingUrlForClient(website.client_id),
    getCompanyBranding(website.client_id),
  ]);

  return renderWebsiteTemplate(website, content, pageSection, {
    bookingUrl: `/book/${encodeURIComponent(website.client_id)}`,
    marketplaceBookingUrl,
    previewWebsiteId: website.id,
    companyBranding,
  });
}
