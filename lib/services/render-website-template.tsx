import type { ReactNode } from "react";

import ServiceBusinessTemplate from "@/templates/service-business/ServiceBusinessTemplate";
import type { Website, WebsiteContent } from "@/types/database";

type PageSection = "home" | "services" | "about" | "reviews" | "contact";

type RenderWebsiteOptions = {
  marketplaceBookingUrl?: string | null;
  bookingUrl?: string | null;
  previewWebsiteId?: string | null;
};

export function renderWebsiteTemplate(
  website: Website,
  content: WebsiteContent[],
  pageSection: PageSection = "home",
  options?: RenderWebsiteOptions
): ReactNode {
  if (website.template === "service-business" || website.template === "cleaning") {
    return (
      <ServiceBusinessTemplate
        content={content}
        pageSection={pageSection}
        marketplaceBookingUrl={options?.marketplaceBookingUrl ?? null}
        bookingUrl={options?.bookingUrl ?? options?.marketplaceBookingUrl ?? null}
        previewWebsiteId={options?.previewWebsiteId ?? null}
      />
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-slate-600">
      No template found
    </div>
  );
}
