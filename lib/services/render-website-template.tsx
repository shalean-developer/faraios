import type { ReactNode } from "react";

import {
  INDUSTRY_WEBSITE_TEMPLATES,
  resolveWebsiteTemplateVariant,
} from "@/lib/website-templates/variants";
import type { CompanyBranding } from "@/lib/website-templates/apply-variant";
import ServiceBusinessTemplate from "@/templates/service-business/ServiceBusinessTemplate";
import type { Website, WebsiteContent } from "@/types/database";

type PageSection = "home" | "services" | "about" | "reviews" | "contact";

type RenderWebsiteOptions = {
  marketplaceBookingUrl?: string | null;
  bookingUrl?: string | null;
  previewWebsiteId?: string | null;
  companyBranding?: CompanyBranding | null;
};

const SUPPORTED_TEMPLATES = new Set<string>([
  ...INDUSTRY_WEBSITE_TEMPLATES,
  "beauty-spa",
  "technology-services",
  "tourism-travel",
]);

export function renderWebsiteTemplate(
  website: Website,
  content: WebsiteContent[],
  pageSection: PageSection = "home",
  options?: RenderWebsiteOptions
): ReactNode {
  const templateKey = (website.template ?? "service-business").trim().toLowerCase();
  const industryKey = (website.industry ?? "").trim().toLowerCase();
  const variant = resolveWebsiteTemplateVariant(templateKey || industryKey);

  if (
    SUPPORTED_TEMPLATES.has(templateKey) ||
    templateKey === "service-business" ||
    templateKey === "cleaning" ||
    INDUSTRY_WEBSITE_TEMPLATES.includes(variant)
  ) {
    return (
      <ServiceBusinessTemplate
        content={content}
        pageSection={pageSection}
        marketplaceBookingUrl={options?.marketplaceBookingUrl ?? null}
        bookingUrl={options?.bookingUrl ?? options?.marketplaceBookingUrl ?? null}
        previewWebsiteId={options?.previewWebsiteId ?? null}
        templateVariant={variant}
        companyBranding={options?.companyBranding ?? null}
      />
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center text-sm text-slate-600">
      No template found for &quot;{website.template}&quot;
    </div>
  );
}
