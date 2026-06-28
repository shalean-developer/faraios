import {
  getMainAppDomain as getMainAppDomainFromConfig,
  isMainHost as isMainHostFromConfig,
} from "@/lib/hosting/main-host";
import { slugifyBusinessName } from "@/lib/slug";
import { industryImagePreset } from "@/lib/data/industry-stock-images";
import { buildServiceBusinessContentSeed } from "@/lib/data/service-business-content-seed";
import { loadIndustryModule } from "@/lib/industry-modules/loader";
import { resolveWebsiteTemplateVariant } from "@/lib/website-templates/variants";
import { getAdminQueryClient, isCurrentUserPlatformAdmin } from "@/lib/services/admin";
import { createClient } from "@/lib/supabase/server";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Website, WebsiteContent } from "@/types/database";

export type CreateWebsiteInput = {
  businessName: string;
  industry: string;
  services: string;
  contactInfo: string;
  /** When omitted or `service-business`, industry drives the content seed. */
  template?: string;
  customDomain?: string;
  location?: string;
};

function isGenericLegacyTemplate(template?: string | null): boolean {
  const key = template?.trim().toLowerCase() ?? "";
  return !key || key === "service-business";
}

/** Content seed variant: industry wins over generic service-business template. */
export function resolveLegacyWebsiteContentVariant(
  input: Pick<CreateWebsiteInput, "template" | "industry">
): ReturnType<typeof resolveWebsiteTemplateVariant> {
  if (!isGenericLegacyTemplate(input.template)) {
    return resolveWebsiteTemplateVariant(input.template);
  }
  return resolveWebsiteTemplateVariant(input.industry);
}

function storedWebsiteTemplateSlug(input: CreateWebsiteInput, industrySlug: string): string {
  if (!isGenericLegacyTemplate(input.template)) {
    return input.template!.trim().toLowerCase();
  }
  return industrySlug;
}

export type WebsiteSeoInput = {
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
};

export type WebsiteSectionSeed = {
  section: string;
  content: Record<string, unknown>;
};

type IndustryContentPreset = {
  heroSubtitle: string;
  aboutBody: string;
  testimonialItems: string[];
  defaultServices: string[];
};

function resolveWebsiteIndustry(industry: string | null | undefined): string {
  const slug = industry?.trim().toLowerCase();
  if (!slug) return "default";
  return slug;
}

function industryWebsiteCopy(industry: string) {
  const industryModule = loadIndustryModule(industry);
  return {
    serviceLabel: industryModule.growth.serviceLabel,
    heroSubtitle: industryModule.growth.heroSubtitle,
    defaultServices: industryModule.services.templates.slice(0, 3).map((s) => s.name),
  };
}

function cleanDomain(value: string): string | null {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  return trimmed
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
}

function buildSubdomainSeed(name: string): string {
  return slugifyBusinessName(name).slice(0, 48);
}

export function mergeStockImagesIntoContent(
  industry: string,
  content: Record<string, Record<string, unknown>>
): Record<string, Record<string, unknown>> {
  const images = industryImagePreset(industry);
  const hero = { ...(content.hero ?? {}) };
  const about = { ...(content.about ?? {}) };
  const services = { ...(content.services ?? {}) };
  const rawItems = services.items;
  const items = Array.isArray(rawItems) ? rawItems : [];

  hero.image = images.heroImage;
  hero.imageAlt = images.heroImageAlt;
  about.image = images.aboutImage;
  about.imageAlt = images.aboutImageAlt;
  services.items = items.map((item, index) => {
    const image = images.serviceImages[index % images.serviceImages.length];
    if (typeof item === "string") {
      return { title: item, description: "", image, imageAlt: item };
    }
    if (typeof item === "object" && item) {
      const record = item as Record<string, unknown>;
      const title = typeof record.title === "string" ? record.title : "Service";
      return {
        ...record,
        image,
        imageAlt: typeof record.imageAlt === "string" ? record.imageAlt : title,
      };
    }
    return { title: "Service", description: "", image, imageAlt: "Service" };
  });

  const whyChooseUs = { ...(content.whyChooseUs as Record<string, unknown> | undefined) };
  if (!asString(whyChooseUs.image)) {
    whyChooseUs.image = images.aboutImage;
    whyChooseUs.imageAlt = images.aboutImageAlt;
  }

  return {
    ...content,
    hero,
    about,
    services,
    whyChooseUs,
  };
}

function asString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

export function buildDefaultWebsiteContent(
  input: CreateWebsiteInput
): WebsiteSectionSeed[] {
  const template = resolveLegacyWebsiteContentVariant(input);
  if (
    template === "service-business" ||
    template === "cleaning" ||
    template === "beauty" ||
    template === "technology" ||
    template === "tourism"
  ) {
    return buildServiceBusinessContentSeed({
      ...input,
      industry: template,
      template,
    });
  }

  const normalizedIndustry = resolveWebsiteIndustry(input.industry);
  const moduleCopy = industryWebsiteCopy(normalizedIndustry);
  const preset: IndustryContentPreset = {
    heroSubtitle: moduleCopy.heroSubtitle,
    aboutBody:
      "Our team focuses on dependable service, flexible scheduling, and results that match your expectations.",
    testimonialItems: [
      "Excellent service and very professional team.",
      "Great communication from first contact to completion.",
    ],
    defaultServices: moduleCopy.defaultServices,
  };

  const services = input.services
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const finalServices = services.length > 0 ? services : preset.defaultServices;

  return [
    {
      section: "hero",
      content: {
        title: input.businessName.trim(),
        subtitle: preset.heroSubtitle,
        ctaLabel: "Book a service",
        image: "",
        imageAlt: input.businessName.trim(),
      },
    },
    {
      section: "services",
      content: {
        heading: "Services",
        items: finalServices.map((title) => ({
          title,
          description: "",
          image: "",
          imageAlt: title,
        })),
      },
    },
    {
      section: "about",
      content: {
        heading: "About",
        body: preset.aboutBody,
        image: "",
        imageAlt: input.businessName.trim(),
      },
    },
    {
      section: "testimonials",
      content: {
        heading: "Testimonials",
        items: preset.testimonialItems,
      },
    },
    {
      section: "contact",
      content: {
        heading: "Contact",
        details: input.contactInfo.trim(),
      },
    },
  ];
}

export async function createWebsiteDraftForCurrentUser(
  input: CreateWebsiteInput
): Promise<{ ok: true; websiteId: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "Please sign in again." };
  }

  const { data: membership, error: membershipError } = await supabase
    .from("memberships")
    .select("company_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (membershipError || !membership?.company_id) {
    return { ok: false, error: "No company membership found for this user." };
  }

  return createWebsiteDraftForCompanyId(membership.company_id, input);
}

async function enrichCreateWebsiteInputFromCompany(
  supabase: SupabaseClient,
  companyId: string,
  input: CreateWebsiteInput
): Promise<CreateWebsiteInput> {
  if (input.services.trim()) {
    return input;
  }

  const { data: companyServices } = await supabase
    .from("company_services")
    .select("name")
    .eq("company_id", companyId)
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .limit(6);

  const serviceNames = (companyServices ?? [])
    .map((row) => (typeof row.name === "string" ? row.name.trim() : ""))
    .filter(Boolean);

  if (serviceNames.length === 0) {
    return input;
  }

  return { ...input, services: serviceNames.join(", ") };
}

async function insertWebsiteDraft(
  supabase: SupabaseClient,
  companyId: string,
  input: CreateWebsiteInput
): Promise<{ ok: true; websiteId: string } | { ok: false; error: string }> {
  const enrichedInput = await enrichCreateWebsiteInputFromCompany(supabase, companyId, input);
  const domain = cleanDomain(enrichedInput.customDomain ?? "");
  const subdomain = buildSubdomainSeed(enrichedInput.businessName);
  const businessName = enrichedInput.businessName.trim();
  const industry = enrichedInput.industry.trim().toLowerCase() || "general";
  const industryModule = loadIndustryModule(industry);
  const industryLabel = industryModule.name;
  const templateSlug = storedWebsiteTemplateSlug(enrichedInput, industry);
  const seoTitle = `${businessName} | ${industryLabel}`;
  const seoDescription =
    industryModule.growth.heroSubtitle ||
    `${businessName} provides trusted ${industryLabel.toLowerCase()} services with fast response and professional support.`;
  const seoKeywords = `${businessName}, ${industry}, ${industryLabel.toLowerCase()}, local services`;

  const { data: website, error: websiteError } = await supabase
    .from("websites")
    .insert({
      client_id: companyId,
      name: businessName,
      industry,
      template: templateSlug,
      domain,
      subdomain,
      status: "draft",
      seo_title: seoTitle,
      seo_description: seoDescription,
      seo_keywords: seoKeywords,
    })
    .select("*")
    .single();

  if (websiteError || !website?.id) {
    return { ok: false, error: websiteError?.message ?? "Failed to create website." };
  }

  const seedSections = buildDefaultWebsiteContent(enrichedInput);
  const seedMap = Object.fromEntries(
    seedSections.map((item) => [item.section, item.content])
  ) as Record<string, Record<string, unknown>>;
  const mergedContent = mergeStockImagesIntoContent(industry, seedMap);

  const sections = Object.entries(mergedContent).map(([section, content]) => ({
    website_id: website.id,
    section,
    content,
  }));

  const { error: contentError } = await supabase
    .from("website_content")
    .insert(sections);

  if (contentError) {
    return { ok: false, error: contentError.message };
  }

  return { ok: true, websiteId: website.id };
}

export async function createWebsiteDraftForCompanyId(
  companyId: string,
  input: CreateWebsiteInput
): Promise<{ ok: true; websiteId: string } | { ok: false; error: string }> {
  const supabase = await createClient();
  return insertWebsiteDraft(supabase, companyId, input);
}

export async function createWebsiteDraftForCompanyIdAsAdmin(
  companyId: string,
  input: CreateWebsiteInput
): Promise<{ ok: true; websiteId: string } | { ok: false; error: string }> {
  if (!(await isCurrentUserPlatformAdmin())) {
    return { ok: false, error: "Forbidden." };
  }

  const supabase = await getAdminQueryClient();
  return insertWebsiteDraft(supabase, companyId, input);
}

/** Create a website using the service-role client (scripts / local admin tooling). */
export async function createWebsiteForCompanyWithServiceRole(
  companyId: string,
  input: CreateWebsiteInput
): Promise<{ ok: true; websiteId: string } | { ok: false; error: string }> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) {
    return { ok: false, error: admin.error };
  }
  return insertWebsiteDraft(admin.client, companyId, input);
}

export async function getWebsiteForCompany(
  companyId: string
): Promise<Website | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("websites")
    .select("*")
    .eq("client_id", companyId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[websites] getWebsiteForCompany", error.message);
    return null;
  }

  return (data as Website | null) ?? null;
}

export async function getWebsiteByDomain(
  domain: string
): Promise<Website | null> {
  const cleaned = cleanDomain(domain);
  if (!cleaned) return null;

  const subdomainCandidate = cleaned.split(".")[0] ?? "";

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("websites")
    .select("*")
    .or(`domain.eq.${cleaned},subdomain.eq.${subdomainCandidate}`)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[websites] getWebsiteByDomain", error.message);
    return null;
  }

  return (data as Website | null) ?? null;
}

export async function getWebsiteById(websiteId: string): Promise<Website | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("websites")
    .select("*")
    .eq("id", websiteId)
    .maybeSingle();

  if (error) {
    console.error("[websites] getWebsiteById", error.message);
    return null;
  }

  return (data as Website | null) ?? null;
}

/** Server-side preview reads bypass draft RLS when service role is configured. */
async function getPreviewQueryClient(): Promise<SupabaseClient> {
  const admin = tryCreateAdminClient();
  if (admin.ok) {
    return admin.client;
  }
  return await createClient();
}

export async function getWebsiteByIdForPreview(
  websiteId: string
): Promise<Website | null> {
  const supabase = await getPreviewQueryClient();
  const { data, error } = await supabase
    .from("websites")
    .select("*")
    .eq("id", websiteId)
    .maybeSingle();

  if (error) {
    console.error("[websites] getWebsiteByIdForPreview", error.message);
    return null;
  }

  return (data as Website | null) ?? null;
}

export async function getWebsiteContentByWebsiteIdForPreview(
  websiteId: string
): Promise<WebsiteContent[]> {
  const supabase = await getPreviewQueryClient();
  const { data, error } = await supabase
    .from("website_content")
    .select("*")
    .eq("website_id", websiteId);

  if (error) {
    console.error("[websites] getWebsiteContentByWebsiteIdForPreview", error.message);
    return [];
  }

  return (data as WebsiteContent[]) ?? [];
}

function parseContactInfo(raw: string): { phone: string; email: string } {
  const details = raw.trim();
  const emailMatch = details.match(/[^\s@]+@[^\s@]+\.[^\s@]+/);
  const phoneMatch = details.match(/(\+?\d[\d\s()-]{8,}\d)/);
  return {
    email: emailMatch?.[0] ?? "",
    phone: phoneMatch?.[0]?.trim() ?? "",
  };
}

function contentMap(rows: WebsiteContent[]): Record<string, Record<string, unknown>> {
  const map: Record<string, Record<string, unknown>> = {};
  for (const row of rows) {
    map[row.section] = row.content ?? {};
  }
  return map;
}

function mergeServiceImagesOnly(
  seeded: Record<string, unknown>[],
  existing: unknown
): Record<string, unknown>[] {
  const existingItems = Array.isArray(existing) ? existing : [];
  return seeded.map((item, index) => {
    const existingItem = existingItems[index];
    if (typeof existingItem !== "object" || !existingItem) {
      return item;
    }
    const record = existingItem as Record<string, unknown>;
    const merged = { ...item };
    for (const key of ["image", "imageAlt"]) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) {
        merged[key] = value;
      }
    }
    return merged;
  });
}

function isLegacyGenericServices(titles: string[]): boolean {
  if (titles.length === 0 || titles.length > 5) return titles.length === 0;
  return titles.every((title) =>
    /^(residential|commercial|one-time|on-site|consultation|maintenance|emergency) service$/i.test(
      title.trim()
    )
  );
}

export type BackfillWebsiteOptions = {
  locationOverride?: string;
};

/**
 * Upserts missing service-business CMS sections for legacy websites while
 * preserving existing images, copy, and contact details where present.
 */
export async function backfillServiceBusinessWebsiteContent(
  websiteId: string,
  options: BackfillWebsiteOptions = {}
): Promise<{ ok: true; sections: number } | { ok: false; error: string }> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) {
    return { ok: false, error: admin.error };
  }

  const supabase = admin.client;
  const { data: website, error: websiteError } = await supabase
    .from("websites")
    .select("*")
    .eq("id", websiteId)
    .maybeSingle();

  if (websiteError || !website) {
    return { ok: false, error: websiteError?.message ?? "Website not found." };
  }

  const template = resolveWebsiteTemplateVariant(website.template || website.industry);
  if (
    template !== "service-business" &&
    template !== "cleaning" &&
    template !== "beauty" &&
    template !== "technology" &&
    template !== "tourism"
  ) {
    return { ok: false, error: "Website template is not a supported service-business variant." };
  }

  const { data: existingRows, error: contentError } = await supabase
    .from("website_content")
    .select("*")
    .eq("website_id", websiteId);

  if (contentError) {
    return { ok: false, error: contentError.message };
  }

  const existing = contentMap((existingRows as WebsiteContent[]) ?? []);
  const contactSection = existing.contact ?? {};
  const contactDetails = asString(contactSection.details);
  const parsedContact = parseContactInfo(contactDetails);
  const servicesSection = existing.services ?? {};
  const existingServiceTitles = Array.isArray(servicesSection.items)
    ? (servicesSection.items as unknown[])
        .map((item) => {
          if (typeof item === "string") return item;
          if (typeof item === "object" && item && "title" in item) {
            return asString((item as Record<string, unknown>).title);
          }
          return "";
        })
        .filter(Boolean)
    : [];
  const useDefaultServices = isLegacyGenericServices(existingServiceTitles);
  const serviceTitles = useDefaultServices ? "" : existingServiceTitles.join(", ");

  const industrySlug = resolveWebsiteIndustry(website.industry);
  const moduleCopy = industryWebsiteCopy(industrySlug);

  const seedInput: CreateWebsiteInput = {
    businessName: website.name,
    industry: industrySlug,
    template: website.template,
    services: serviceTitles,
    contactInfo: contactDetails || `${parsedContact.phone} ${parsedContact.email}`.trim(),
  };

  const seedSections = buildServiceBusinessContentSeed(seedInput);
  const seedMap = Object.fromEntries(
    seedSections.map((section) => [section.section, section.content])
  ) as Record<string, Record<string, unknown>>;

  const mergedContent = mergeStockImagesIntoContent(industrySlug, seedMap);

  const hero = { ...(mergedContent.hero ?? {}) };
  const existingHero = existing.hero ?? {};
  if (asString(existingHero.image)) hero.image = existingHero.image;
  if (asString(existingHero.imageAlt)) hero.imageAlt = existingHero.imageAlt;
  if (asString(existingHero.subtitle)) hero.subtitle = existingHero.subtitle;
  hero.businessName = website.name;
  if (options.locationOverride) {
    hero.location = options.locationOverride;
    hero.headline = `Professional ${moduleCopy.serviceLabel} in ${options.locationOverride}`;
    const primary = options.locationOverride.split("&")[0].trim();
    hero.badge = `${primary.toUpperCase()}'S TRUSTED ${moduleCopy.serviceLabel.toUpperCase()}`;
  }

  const topbar = { ...(mergedContent.topbar ?? {}) };
  if (options.locationOverride) {
    topbar.serviceArea = options.locationOverride;
  }

  const services = { ...(mergedContent.services ?? {}) };
  services.items = mergeServiceImagesOnly(
    Array.isArray(services.items) ? (services.items as Record<string, unknown>[]) : [],
    servicesSection.items
  );

  const about = { ...(mergedContent.about ?? {}) };
  const existingAbout = existing.about ?? {};
  if (asString(existingAbout.body)) about.body = existingAbout.body;
  if (asString(existingAbout.image)) about.image = existingAbout.image;
  if (asString(existingAbout.imageAlt)) about.imageAlt = existingAbout.imageAlt;

  const contact = { ...(mergedContent.contact ?? {}) };
  contact.phone = asString(contactSection.phone, parsedContact.phone);
  contact.email = asString(contactSection.email, parsedContact.email);
  if (contactDetails) contact.details = contactDetails;
  if (options.locationOverride) {
    contact.address = options.locationOverride;
  }

  const socialProof = { ...(mergedContent.socialProof ?? {}) };
  const testimonialItems = Array.isArray(existing.testimonials?.items)
    ? (existing.testimonials.items as unknown[]).filter(
        (item): item is string => typeof item === "string" && item.trim().length > 0
      )
    : [];
  if (testimonialItems[0]) {
    socialProof.reviewQuote = testimonialItems[0];
  }

  const serviceAreas = { ...(mergedContent.serviceAreas ?? {}) };
  const footer = { ...(mergedContent.footer ?? {}) };
  if (options.locationOverride) {
    serviceAreas.heading = `Services Across ${options.locationOverride}`;
    serviceAreas.intro = `We proudly serve ${options.locationOverride} and surrounding areas with reliable, professional ${moduleCopy.serviceLabel.toLowerCase()} you can book online.`;
    footer.description = `Professional ${moduleCopy.serviceLabel.toLowerCase()} in ${options.locationOverride}. Book online for fast, reliable results.`;
    if (options.locationOverride.toLowerCase().includes("cape town")) {
      serviceAreas.popular = ["Cape Town CBD", "Northern Suburbs", "Southern Suburbs"];
      serviceAreas.areas = [
        "Sea Point",
        "Camps Bay",
        "Claremont",
        "Bellville",
        "Durbanville",
        "Constantia",
        "Fish Hoek",
        "Somerset West",
      ];
    }
  }

  const finalSections: Record<string, Record<string, unknown>> = {
    ...mergedContent,
    hero,
    topbar,
    services,
    about,
    contact,
    socialProof,
    serviceAreas,
    footer,
  };

  const rows = Object.entries(finalSections).map(([section, content]) => ({
    website_id: websiteId,
    section,
    content,
  }));

  const { error: upsertError } = await supabase
    .from("website_content")
    .upsert(rows, { onConflict: "website_id,section" });

  if (upsertError) {
    return { ok: false, error: upsertError.message };
  }

  return { ok: true, sections: rows.length };
}

/** Permanently deletes a website and all CMS content (cascade). */
export async function deleteWebsiteById(
  websiteId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) {
    return { ok: false, error: admin.error };
  }

  const { error } = await admin.client.from("websites").delete().eq("id", websiteId);

  if (error) {
    return { ok: false, error: error.message };
  }

  return { ok: true };
}

/**
 * Deletes all CMS content for a website and re-seeds from the service-business
 * template defaults (with stock images). Keeps the same website id and URL.
 */
export async function resetWebsiteContentFromSeed(
  websiteId: string,
  overrides: Partial<CreateWebsiteInput> = {}
): Promise<{ ok: true; sections: number } | { ok: false; error: string }> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) {
    return { ok: false, error: admin.error };
  }

  const supabase = admin.client;
  const { data: website, error: websiteError } = await supabase
    .from("websites")
    .select("*")
    .eq("id", websiteId)
    .maybeSingle();

  if (websiteError || !website) {
    return { ok: false, error: websiteError?.message ?? "Website not found." };
  }

  const input: CreateWebsiteInput = {
    businessName: overrides.businessName ?? website.name,
    industry: overrides.industry ?? website.industry ?? "default",
    template: overrides.template ?? website.template ?? "service-business",
    services: overrides.services ?? "",
    contactInfo: overrides.contactInfo ?? "",
    customDomain: overrides.customDomain,
    location: overrides.location,
  };

  const seedSections = buildDefaultWebsiteContent(input);
  const seedMap = Object.fromEntries(
    seedSections.map((item) => [item.section, item.content])
  ) as Record<string, Record<string, unknown>>;
  const industry = resolveWebsiteIndustry(input.industry);
  const mergedContent = mergeStockImagesIntoContent(industry, seedMap);

  const { error: deleteError } = await supabase
    .from("website_content")
    .delete()
    .eq("website_id", websiteId);

  if (deleteError) {
    return { ok: false, error: deleteError.message };
  }

  const rows = Object.entries(mergedContent).map(([section, content]) => ({
    website_id: websiteId,
    section,
    content,
  }));

  const { error: insertError } = await supabase.from("website_content").insert(rows);

  if (insertError) {
    return { ok: false, error: insertError.message };
  }

  return { ok: true, sections: rows.length };
}

export async function updateWebsiteSeo(
  websiteId: string,
  input: WebsiteSeoInput
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { error } = await supabase
    .from("websites")
    .update({
      seo_title: input.seoTitle.trim() || null,
      seo_description: input.seoDescription.trim() || null,
      seo_keywords: input.seoKeywords.trim() || null,
    })
    .eq("id", websiteId);

  if (error) {
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

export function getMainAppDomain(): string {
  return getMainAppDomainFromConfig();
}

export function isMainHost(host: string): boolean {
  return isMainHostFromConfig(host);
}

export function replaceStringInJson(value: unknown, from: string, to: string): unknown {
  if (typeof value === "string") {
    return value.includes(from) ? value.split(from).join(to) : value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => replaceStringInJson(item, from, to));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
        key,
        replaceStringInJson(nested, from, to),
      ])
    );
  }
  return value;
}

/** Renames display text across websites.name, SEO fields, and all CMS JSON sections. */
export async function renameWebsiteBusinessName(
  websiteId: string,
  fromName: string,
  toName: string
): Promise<
  | { ok: true; updatedSections: number; websiteName: string }
  | { ok: false; error: string }
> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) {
    return { ok: false, error: admin.error };
  }

  const supabase = admin.client;
  const oldName = fromName.trim();
  const newName = toName.trim();
  if (!oldName || !newName) {
    return { ok: false, error: "Both old and new business names are required." };
  }

  const { data: website, error: websiteError } = await supabase
    .from("websites")
    .select("*")
    .eq("id", websiteId)
    .maybeSingle();

  if (websiteError || !website) {
    return { ok: false, error: websiteError?.message ?? "Website not found." };
  }

  const replace = (value: string | null | undefined) =>
    value?.includes(oldName) ? value.split(oldName).join(newName) : value ?? null;

  const nextWebsiteName =
    website.name === oldName || website.name.includes(oldName)
      ? website.name.split(oldName).join(newName)
      : newName;

  const { error: updateWebsiteError } = await supabase
    .from("websites")
    .update({
      name: nextWebsiteName,
      seo_title: replace(website.seo_title),
      seo_description: replace(website.seo_description),
      seo_keywords: replace(website.seo_keywords),
    })
    .eq("id", websiteId);

  if (updateWebsiteError) {
    return { ok: false, error: updateWebsiteError.message };
  }

  const { data: rows, error: contentError } = await supabase
    .from("website_content")
    .select("*")
    .eq("website_id", websiteId);

  if (contentError) {
    return { ok: false, error: contentError.message };
  }

  let updatedSections = 0;
  for (const row of (rows as WebsiteContent[]) ?? []) {
    const nextContent = replaceStringInJson(row.content, oldName, newName);
    const { error: rowError } = await supabase
      .from("website_content")
      .update({ content: nextContent })
      .eq("id", row.id);

    if (rowError) {
      return { ok: false, error: rowError.message };
    }
    updatedSections += 1;
  }

  return { ok: true, updatedSections, websiteName: nextWebsiteName };
}

export async function getWebsiteContentByWebsiteId(
  websiteId: string
): Promise<WebsiteContent[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("website_content")
    .select("*")
    .eq("website_id", websiteId);

  if (error) {
    console.error("[websites] getWebsiteContentByWebsiteId", error.message);
    return [];
  }

  return (data as WebsiteContent[]) ?? [];
}
