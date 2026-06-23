import type { LocalSeoSettings } from "@/types/growth-engine";
import type { ServiceAreaPage } from "@/types/growth-engine";

type FaqItem = { question: string; answer: string };

export function buildLocalBusinessSchema(input: {
  settings: LocalSeoSettings;
  websiteUrl: string;
  businessName: string;
}): Record<string, unknown> {
  const { settings, websiteUrl, businessName } = input;
  const name = settings.business_name || businessName;

  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name,
    url: websiteUrl,
    telephone: settings.phone ?? undefined,
    email: settings.email ?? undefined,
    description: settings.main_service ?? undefined,
    address: settings.address
      ? {
          "@type": "PostalAddress",
          streetAddress: settings.address,
          addressLocality: settings.primary_location ?? undefined,
        }
      : settings.primary_location
        ? {
            "@type": "PostalAddress",
            addressLocality: settings.primary_location,
          }
        : undefined,
    areaServed: settings.service_areas.map((area) => ({
      "@type": "City",
      name: area,
    })),
    sameAs: Object.values(settings.social_links).filter(Boolean),
  };

  if (settings.opening_hours && Object.keys(settings.opening_hours).length > 0) {
    schema.openingHoursSpecification = Object.entries(settings.opening_hours).map(
      ([day, hours]) => ({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: day,
        opens: (hours as { opens?: string }).opens,
        closes: (hours as { closes?: string }).closes,
      })
    );
  }

  return schema;
}

export function buildOrganizationSchema(input: {
  settings: LocalSeoSettings;
  websiteUrl: string;
  businessName: string;
  logoUrl?: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: input.settings.business_name || input.businessName,
    url: input.websiteUrl,
    logo: input.logoUrl,
    contactPoint: input.settings.phone
      ? {
          "@type": "ContactPoint",
          telephone: input.settings.phone,
          contactType: "customer service",
          email: input.settings.email ?? undefined,
        }
      : undefined,
    sameAs: Object.values(input.settings.social_links).filter(Boolean),
  };
}

export function buildServiceSchema(input: {
  serviceName: string;
  description?: string;
  areaName?: string;
  providerName: string;
  providerUrl: string;
}): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name: input.serviceName,
    description: input.description,
    provider: {
      "@type": "LocalBusiness",
      name: input.providerName,
      url: input.providerUrl,
    },
    areaServed: input.areaName
      ? { "@type": "City", name: input.areaName }
      : undefined,
  };
}

export function buildFaqSchema(faq: FaqItem[]): Record<string, unknown> | null {
  if (!faq.length) return null;
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}

export function buildBreadcrumbSchema(
  items: { name: string; url: string }[]
): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function buildServiceAreaPageSchemas(input: {
  page: ServiceAreaPage;
  settings: LocalSeoSettings | null;
  businessName: string;
  baseUrl: string;
}): Record<string, unknown>[] {
  const schemas: Record<string, unknown>[] = [];
  const pageUrl = `${input.baseUrl}/areas/${input.page.slug}`;

  schemas.push(
    buildBreadcrumbSchema([
      { name: "Home", url: input.baseUrl },
      { name: input.page.h1 || `${input.page.service_name} in ${input.page.area_name}`, url: pageUrl },
    ])
  );

  schemas.push(
    buildServiceSchema({
      serviceName: input.page.service_name,
      description: input.page.intro_content ?? undefined,
      areaName: input.page.area_name,
      providerName: input.settings?.business_name || input.businessName,
      providerUrl: input.baseUrl,
    })
  );

  const faqSchema = buildFaqSchema(input.page.faq);
  if (faqSchema) schemas.push(faqSchema);

  return schemas;
}

export function schemaToJsonLd(schemas: Record<string, unknown>[]): string {
  if (schemas.length === 0) return "";
  if (schemas.length === 1) {
    return JSON.stringify(schemas[0]);
  }
  return JSON.stringify(schemas);
}
