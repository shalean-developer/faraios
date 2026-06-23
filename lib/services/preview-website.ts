import { getMarketplaceBookingUrlForClient } from "@/lib/services/marketplace";
import { renderWebsiteTemplate } from "@/lib/services/render-website-template";
import {
  getWebsiteByIdForPreview,
  getWebsiteContentByWebsiteIdForPreview,
} from "@/lib/services/websites";

export type PreviewPageSection = "home" | "services" | "about" | "reviews" | "contact";

export async function renderPreviewWebsitePage(
  websiteId: string,
  pageSection: PreviewPageSection = "home"
) {
  const website = await getWebsiteByIdForPreview(websiteId);
  if (!website) {
    return null;
  }

  const [content, marketplaceBookingUrl] = await Promise.all([
    getWebsiteContentByWebsiteIdForPreview(website.id),
    getMarketplaceBookingUrlForClient(website.client_id),
  ]);

  return renderWebsiteTemplate(website, content, pageSection, {
    bookingUrl: `/book/${encodeURIComponent(website.client_id)}`,
    marketplaceBookingUrl,
    previewWebsiteId: website.id,
  });
}
