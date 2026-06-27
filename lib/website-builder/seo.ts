import { publicSiteUrl } from "@/lib/website-builder/access";
import type { CompanyWithIndustry } from "@/types/database";
import type { BuilderWebsite, LandingPageContent, WebsiteServicePageRecord } from "@/types/website-builder";
import type { WebsiteMediaRecord } from "@/types/website-builder-media";
import type {
  RobotsDirective,
  SeoAuditIssue,
  SeoScoreBreakdown,
  WebsiteSeoSchemaFlags,
  WebsiteSeoSettings,
} from "@/types/website-builder-seo";

export const SEO_SETTINGS_KEY = "seoSettings";

const EMPTY_ANALYTICS = { enabled: false, id: "", verified: false };

export function slugifySeo(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function defaultSeoSettings(input: {
  company: CompanyWithIndustry;
  website: BuilderWebsite;
  landing?: LandingPageContent | null;
  publicUrl: string;
}): WebsiteSeoSettings {
  const { company, website, landing, publicUrl } = input;
  const keywords = (website.seo_keywords ?? "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  return {
    basic: {
      focusKeywords: keywords.length > 0 ? keywords : [company.name],
      urlSlug: slugifySeo(website.slug || company.slug),
      canonicalUrl: publicUrl,
      robots: "index,follow",
      language: "en-ZA",
      country: "South Africa",
      author: company.name,
    },
    social: {
      ogImageUrl: website.og_image_url ?? null,
      ogImageAlt: `${company.name} social preview`,
      twitterCard: "summary_large_image",
      twitterTitle: website.og_title ?? website.seo_title ?? company.name,
      twitterDescription:
        website.og_description ?? website.seo_description ?? company.business_description ?? "",
      twitterImageUrl: website.og_image_url ?? null,
    },
    local: {
      businessName: company.name,
      businessDescription: company.business_description ?? landing?.about.body ?? "",
      phone: company.contact_phone ?? landing?.contact.phone ?? "",
      email: company.primary_contact_email ?? landing?.contact.email ?? "",
      website: publicUrl,
      streetAddress: "",
      city: company.contact_location ?? "",
      province: "",
      postalCode: "",
      country: "South Africa",
      coordinates: "",
      openingHours: landing?.contact.hours ?? "",
      emergencyContact: company.contact_phone ?? "",
      logoUrl: (website.theme_settings?.logoUrl as string) ?? null,
      priceRange: "$$",
      serviceAreas: company.service_areas
        ? company.service_areas.split(",").map((a) => a.trim()).filter(Boolean)
        : company.contact_location
          ? [company.contact_location]
          : [],
    },
    schema: {
      organization: true,
      localBusiness: true,
      cleaningService: true,
      website: true,
      breadcrumb: true,
      faq: false,
      review: false,
      service: true,
      article: false,
      person: false,
      video: false,
      event: false,
    },
    technical: {
      hreflang: "en-ZA",
      faviconUrl: (website.theme_settings?.faviconUrl as string) ?? null,
      appleTouchIconUrl: null,
      themeColor: (website.theme_settings?.primaryColor as string) ?? "#5a8dee",
      manifestUrl: "",
      robotsTxt: "User-agent: *\nAllow: /\nSitemap: /sitemap.xml",
      headScripts: "",
      bodyScripts: "",
      googleVerification: "",
      bingVerification: "",
      pinterestVerification: "",
      facebookVerification: "",
    },
    sitemap: {
      enabled: true,
      frequency: "weekly",
      lastGenerated: null,
    },
    redirects: [],
    analytics: {
      ga4: { ...EMPTY_ANALYTICS },
      gtm: { ...EMPTY_ANALYTICS },
      clarity: { ...EMPTY_ANALYTICS },
      metaPixel: { ...EMPTY_ANALYTICS },
      linkedIn: { ...EMPTY_ANALYTICS },
      tiktok: { ...EMPTY_ANALYTICS },
    },
    preferences: {
      autoSave: true,
      autoCanonical: true,
      autoSlug: true,
      enableAi: true,
      enableSitemap: true,
      enableSchema: true,
      enableImageOptimization: true,
      enableLazyLoading: true,
      enableRedirectLogging: true,
    },
  };
}

export function parseSeoSettings(raw: unknown): WebsiteSeoSettings | null {
  if (!raw || typeof raw !== "object") return null;
  try {
    return raw as WebsiteSeoSettings;
  } catch {
    return null;
  }
}

export function getSeoSettings(input: {
  company: CompanyWithIndustry;
  website: BuilderWebsite;
  landing?: LandingPageContent | null;
  publicUrl: string;
}): WebsiteSeoSettings {
  const stored = parseSeoSettings(input.website.theme_settings[SEO_SETTINGS_KEY]);
  if (stored) return stored;
  return defaultSeoSettings(input);
}

export function titleLengthStatus(length: number): "good" | "warn" | "bad" {
  if (length >= 30 && length <= 60) return "good";
  if (length === 0 || length > 70) return "bad";
  return "warn";
}

export function descriptionLengthStatus(length: number): "good" | "warn" | "bad" {
  if (length >= 120 && length <= 160) return "good";
  if (length === 0 || length > 170) return "bad";
  return "warn";
}

export function computeReadability(text: string): number {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 0;
  const sentences = Math.max(1, text.split(/[.!?]+/).filter(Boolean).length);
  const avgWords = words.length / sentences;
  const score = 100 - Math.abs(avgWords - 17) * 3;
  return Math.max(0, Math.min(100, Math.round(score)));
}

export function runSeoAudit(input: {
  website: BuilderWebsite;
  settings: WebsiteSeoSettings;
  landing?: LandingPageContent | null;
  servicePages: WebsiteServicePageRecord[];
  mediaItems: WebsiteMediaRecord[];
}): SeoAuditIssue[] {
  const { website, settings, servicePages, mediaItems } = input;
  const issues: SeoAuditIssue[] = [];

  if (!website.seo_title?.trim()) {
    issues.push({ id: "missing-title", severity: "error", category: "Basic SEO", message: "Missing SEO title", section: "basic" });
  }
  if (!website.seo_description?.trim()) {
    issues.push({ id: "missing-desc", severity: "error", category: "Basic SEO", message: "Missing meta description", section: "basic" });
  }
  if ((website.seo_title?.length ?? 0) > 60) {
    issues.push({ id: "long-title", severity: "warning", category: "Basic SEO", message: "SEO title exceeds 60 characters", section: "basic" });
  }
  if (!settings.social.ogImageUrl) {
    issues.push({ id: "missing-og", severity: "warning", category: "Social", message: "Missing Open Graph image", section: "social" });
  }
  if (!settings.basic.canonicalUrl) {
    issues.push({ id: "missing-canonical", severity: "warning", category: "Technical", message: "Missing canonical URL", section: "technical" });
  }

  const pagesMissingMeta = servicePages.filter((p) => !p.seo_title).length;
  if (pagesMissingMeta > 0) {
    issues.push({
      id: "service-meta",
      severity: "warning",
      category: "Pages",
      message: `${pagesMissingMeta} service page(s) missing SEO title`,
      section: "health",
    });
  }

  const missingAlt = mediaItems.filter((m) => !m.alt_text?.trim()).length;
  if (missingAlt > 0) {
    issues.push({
      id: "missing-alt",
      severity: "warning",
      category: "Images",
      message: `${missingAlt} image(s) missing alt text`,
      section: "health",
    });
  }

  if (settings.preferences.enableSchema && !settings.schema.localBusiness) {
    issues.push({
      id: "schema-local",
      severity: "info",
      category: "Schema",
      message: "Enable Local Business schema for better local visibility",
      section: "schema",
    });
  }

  return issues;
}

export function computeSeoScore(input: {
  website: BuilderWebsite;
  settings: WebsiteSeoSettings;
  landing?: LandingPageContent | null;
  servicePages: WebsiteServicePageRecord[];
  mediaItems: WebsiteMediaRecord[];
}): SeoScoreBreakdown {
  const issues = runSeoAudit(input);
  const readability = computeReadability(input.website.seo_description ?? "");
  const indexedPages = 1 + input.servicePages.filter((p) => p.status === "published").length;
  const missingMetadata =
    (input.website.seo_title ? 0 : 1) +
    (input.website.seo_description ? 0 : 1) +
    input.servicePages.filter((p) => !p.seo_title).length;
  const missingAltText = input.mediaItems.filter((m) => !m.alt_text?.trim()).length;

  let score = 100;
  for (const issue of issues) {
    if (issue.severity === "error") score -= 12;
    else if (issue.severity === "warning") score -= 6;
    else score -= 2;
  }
  score = Math.max(0, Math.min(100, score));

  const checklist = [
    Boolean(input.website.seo_title),
    Boolean(input.website.seo_description),
    Boolean(input.settings.social.ogImageUrl),
    Boolean(input.settings.social.ogImageAlt),
    Boolean(input.settings.basic.canonicalUrl),
    input.settings.basic.robots === "index,follow",
    input.settings.preferences.enableSchema,
    input.settings.preferences.enableSitemap,
    Object.values(input.settings.analytics).some((a) => a.enabled && a.id),
    missingAltText === 0,
    true,
    score >= 70,
  ];
  const publishReadiness = Math.round(
    (checklist.filter(Boolean).length / checklist.length) * 100
  );

  return {
    overall: score,
    readability,
    indexedPages,
    missingMetadata,
    brokenLinks: 0,
    missingAltText,
    schemaErrors: issues.filter((i) => i.category === "Schema" && i.severity === "error").length,
    publishReadiness,
    issues,
  };
}

export function generateJsonLd(input: {
  website: BuilderWebsite;
  settings: WebsiteSeoSettings;
  company: CompanyWithIndustry;
  publicUrl: string;
}): Record<string, unknown>[] {
  const { settings, company, publicUrl } = input;
  const blocks: Record<string, unknown>[] = [];
  const schema = settings.schema;

  if (schema.organization || schema.localBusiness) {
    blocks.push({
      "@context": "https://schema.org",
      "@type": schema.localBusiness ? "LocalBusiness" : "Organization",
      name: settings.local.businessName || company.name,
      description: settings.local.businessDescription || company.business_description,
      url: publicUrl,
      telephone: settings.local.phone || undefined,
      email: settings.local.email || undefined,
      logo: settings.local.logoUrl || undefined,
      address: settings.local.streetAddress
        ? {
            "@type": "PostalAddress",
            streetAddress: settings.local.streetAddress,
            addressLocality: settings.local.city,
            addressRegion: settings.local.province,
            postalCode: settings.local.postalCode,
            addressCountry: settings.local.country,
          }
        : undefined,
      areaServed: settings.local.serviceAreas.map((area) => ({ "@type": "City", name: area })),
      priceRange: settings.local.priceRange,
    });
  }

  if (schema.cleaningService) {
    blocks.push({
      "@context": "https://schema.org",
      "@type": "Service",
      serviceType: "Cleaning Service",
      provider: { "@type": "LocalBusiness", name: settings.local.businessName || company.name },
      areaServed: settings.local.serviceAreas,
    });
  }

  if (schema.website) {
    blocks.push({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: company.name,
      url: publicUrl,
    });
  }

  if (schema.breadcrumb) {
    blocks.push({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: publicUrl },
      ],
    });
  }

  return blocks;
}

export function generateAiSeoDraft(input: {
  company: CompanyWithIndustry;
  services: string[];
  publicUrl: string;
}): {
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  ogTitle: string;
  ogDescription: string;
  twitterTitle: string;
  twitterDescription: string;
  ogImageAlt: string;
} {
  const location = input.company.contact_location ?? "your area";
  const primaryService = input.services[0] ?? "Professional services";
  const seoTitle = `${input.company.name} | ${primaryService} ${location}`.slice(0, 60);
  const seoDescription = `Book trusted ${primaryService.toLowerCase()} in ${location}. ${input.company.name} — fast online booking, transparent pricing, and satisfaction guaranteed.`.slice(0, 160);
  const keywords = [input.company.name, primaryService, location, ...input.services.slice(0, 3)]
    .filter(Boolean)
    .join(", ");

  return {
    seoTitle,
    seoDescription,
    seoKeywords: keywords,
    ogTitle: seoTitle,
    ogDescription: seoDescription,
    twitterTitle: seoTitle,
    twitterDescription: seoDescription,
    ogImageAlt: `${input.company.name} — ${primaryService} in ${location}`,
  };
}

export function buildSitemapPreview(input: {
  publicUrl: string;
  slug: string;
  servicePages: WebsiteServicePageRecord[];
}): string {
  const urls = [
    input.publicUrl,
    ...input.servicePages
      .filter((p) => p.status === "published")
      .map((p) => `${input.publicUrl}/services/${p.slug}`),
  ];
  const body = urls
    .map(
      (loc) => `  <url>\n    <loc>${loc}</loc>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`
    )
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>`;
}

export function keywordsToString(keywords: string[]): string {
  return keywords.map((k) => k.trim()).filter(Boolean).join(", ");
}

export function keywordsFromString(raw: string): string[] {
  return raw.split(",").map((k) => k.trim()).filter(Boolean);
}
