"use server";

import { revalidatePath } from "next/cache";

import { slugifyBusinessName } from "@/lib/slug";
import { requireCompanyMembership } from "@/lib/services/company-access";
import { getCompanyBySlug } from "@/lib/services/companies";
import {
  companyWebsiteBuilderPath,
  companyWebsiteBuilderSectionPath,
  publicSitePath,
} from "@/lib/paths/company";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import {
  canAccessWebsiteBuilderFeature,
} from "@/lib/website-builder/access";
import {
  buildLandingContentFromCompany,
  defaultSeoForWebsite,
  ensureBuilderWebsite,
  getBuilderWebsiteForCompany,
} from "@/lib/website-builder/service";
import {
  buildIndustryTemplatePageContent,
  themeSettingsForIndustryTemplate,
} from "@/lib/website-builder/industry-site-templates";
import { buildPageContentPayload, getPageSections } from "@/lib/website-builder/page-sections";
import { isSavedComponentType } from "@/types/website-builder-components";
import { V8_INDUSTRY_TEMPLATE_KEYS } from "@/lib/industry-modules/registry";
import type { LandingPageContent } from "@/types/website-builder";
import { CONTACT_FORM_SETTINGS_KEY } from "@/lib/website-builder/forms";
import type { WebsiteContactFormSettings } from "@/types/website-builder-forms";
import { SEO_SETTINGS_KEY } from "@/lib/website-builder/seo";
import { NAVIGATION_SETTINGS_KEY } from "@/lib/website-builder/navigation";
import { BUILDER_SETTINGS_KEY, getBuilderSettings } from "@/lib/website-builder/settings";
import type { WebsiteBuilderSettings } from "@/types/website-builder-settings";
import type { WebsiteNavigationSettings } from "@/types/website-builder-navigation";
import type { WebsiteSection, WebsiteThemeSettings } from "@/types/website-builder-sections";
import type { SubscriptionCompanyFields } from "@/lib/subscriptions/types";
import {
  createBlogCategory,
  createBlogTag,
  deleteBlogCategory,
  deleteBlogTag,
  setPostBlogTags,
  updateBlogCategory,
} from "@/lib/website-builder/blog";
import {
  createContentPost,
  deleteContentPost,
  updateContentPost,
  type ContentPostInput,
} from "@/lib/services/content-posts";
import { companyContentPath } from "@/lib/paths/company";

export type WebsiteBuilderActionResult =
  | { ok: true }
  | { ok: false; error: string };

function revalidateBuilderPaths(slug: string) {
  revalidatePath(companyWebsiteBuilderPath(slug));
  revalidatePath(companyWebsiteBuilderSectionPath(slug, "pages"));
  revalidatePath(companyWebsiteBuilderSectionPath(slug, "page-builder"));
  revalidatePath(companyWebsiteBuilderSectionPath(slug, "templates"));
  revalidatePath(companyWebsiteBuilderSectionPath(slug, "components"));
  revalidatePath(companyWebsiteBuilderSectionPath(slug, "media"));
  revalidatePath(companyWebsiteBuilderSectionPath(slug, "theme"));
  revalidatePath(companyWebsiteBuilderSectionPath(slug, "navigation"));
  revalidatePath(companyWebsiteBuilderSectionPath(slug, "contact"));
  revalidatePath(companyWebsiteBuilderSectionPath(slug, "seo"));
  revalidatePath(companyWebsiteBuilderSectionPath(slug, "blog"));
  revalidatePath(companyWebsiteBuilderSectionPath(slug, "service-pages"));
  revalidatePath(companyWebsiteBuilderSectionPath(slug, "publish"));
  revalidatePath(companyWebsiteBuilderSectionPath(slug, "domains"));
  revalidatePath(companyWebsiteBuilderSectionPath(slug, "preview"));
  revalidatePath(companyWebsiteBuilderSectionPath(slug, "settings"));
  revalidatePath(companyWebsiteBuilderSectionPath(slug, "analytics"));
  revalidatePath(publicSitePath(slug));
}

async function loadCompanyContext(companyId: string, companySlug: string) {
  const access = await requireCompanyMembership(companyId);
  if (!access.ok) return access;

  const company = await getCompanyBySlug(companySlug);
  if (!company || company.id !== companyId) {
    return { ok: false as const, error: "Company not found." };
  }

  return { ok: true as const, company };
}

async function requireBuilderWriteAccess(companyId: string, companySlug: string) {
  const ctx = await loadCompanyContext(companyId, companySlug);
  if (!ctx.ok) return ctx;
  if (!canAccessWebsiteBuilderFeature(ctx.company, "websiteBuilder")) {
    return { ok: false as const, error: "Upgrade to Business to manage your website." };
  }
  return ctx;
}

export async function initializeWebsiteBuilderAction(input: {
  companyId: string;
  companySlug: string;
}): Promise<WebsiteBuilderActionResult & { websiteId?: string }> {
  const ctx = await loadCompanyContext(input.companyId, input.companySlug);
  if (!ctx.ok) return ctx;

  const company = ctx.company as SubscriptionCompanyFields & typeof ctx.company;
  if (
    !canAccessWebsiteBuilderFeature(company, "websiteBuilder") &&
    !canAccessWebsiteBuilderFeature(company, "websiteBuilderPreview")
  ) {
    return { ok: false, error: "Upgrade your plan to use the website builder." };
  }

  const result = await ensureBuilderWebsite(ctx.company);
  if (!result.ok) return result;

  revalidateBuilderPaths(input.companySlug);
  return { ok: true, websiteId: result.website.id };
}

export async function regenerateLandingPageAction(input: {
  companyId: string;
  companySlug: string;
}): Promise<WebsiteBuilderActionResult> {
  const ctx = await loadCompanyContext(input.companyId, input.companySlug);
  if (!ctx.ok) return ctx;

  if (!canAccessWebsiteBuilderFeature(ctx.company, "websiteBuilder")) {
    return { ok: false, error: "Upgrade to Business to edit your landing page." };
  }

  const website = await getBuilderWebsiteForCompany(input.companyId);
  if (!website) {
    return { ok: false, error: "Create your website first." };
  }

  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: "Could not update landing page." };

  const { data: services } = await admin.client
    .from("company_services")
    .select("name, description, base_price_cents")
    .eq("company_id", input.companyId)
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .limit(12);

  const landing = buildLandingContentFromCompany(
    ctx.company,
    (services ?? []) as { name: string; description: string | null; base_price_cents: number }[]
  );
  const seo = defaultSeoForWebsite(ctx.company);

  const { error } = await admin.client
    .from("website_pages")
    .update({
      content: landing,
      seo_title: seo.seo_title,
      seo_description: seo.seo_description,
      og_title: seo.seo_title,
      og_description: seo.seo_description,
      updated_at: new Date().toISOString(),
    })
    .eq("website_id", website.id)
    .eq("page_type", "landing");

  if (error) return { ok: false, error: error.message };

  await admin.client
    .from("websites")
    .update({
      title: ctx.company.name,
      description: ctx.company.business_description,
      seo_title: seo.seo_title,
      seo_description: seo.seo_description,
      seo_keywords: seo.seo_keywords,
      updated_at: new Date().toISOString(),
    })
    .eq("id", website.id);

  revalidateBuilderPaths(input.companySlug);
  return { ok: true };
}

export async function updateLandingPageAction(input: {
  companyId: string;
  companySlug: string;
  content: LandingPageContent;
}): Promise<WebsiteBuilderActionResult> {
  const ctx = await loadCompanyContext(input.companyId, input.companySlug);
  if (!ctx.ok) return ctx;

  if (!canAccessWebsiteBuilderFeature(ctx.company, "websiteBuilder")) {
    return { ok: false, error: "Upgrade to Business to edit pages." };
  }

  const website = await getBuilderWebsiteForCompany(input.companyId);
  if (!website) return { ok: false, error: "Website not found." };

  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: "Could not save page." };

  const { error } = await admin.client
    .from("website_pages")
    .update({
      content: input.content,
      updated_at: new Date().toISOString(),
    })
    .eq("website_id", website.id)
    .eq("page_type", "landing");

  if (error) return { ok: false, error: error.message };

  revalidateBuilderPaths(input.companySlug);
  return { ok: true };
}

export async function applyWebsiteBuilderTemplateAction(input: {
  companyId: string;
  companySlug: string;
  industryKey: string;
}): Promise<WebsiteBuilderActionResult> {
  const ctx = await loadCompanyContext(input.companyId, input.companySlug);
  if (!ctx.ok) return ctx;

  if (!canAccessWebsiteBuilderFeature(ctx.company, "websiteBuilder")) {
    return { ok: false, error: "Upgrade to Business to apply website templates." };
  }

  const industryKey = input.industryKey.trim().toLowerCase();
  if (!V8_INDUSTRY_TEMPLATE_KEYS.includes(industryKey as (typeof V8_INDUSTRY_TEMPLATE_KEYS)[number])) {
    return { ok: false, error: "Unknown industry template." };
  }

  let website = await getBuilderWebsiteForCompany(input.companyId);
  if (!website) {
    const created = await ensureBuilderWebsite(ctx.company);
    if (!created.ok) return created;
    website = created.website;
  }

  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: "Could not apply template." };

  const { data: services } = await admin.client
    .from("company_services")
    .select("name, description, base_price_cents")
    .eq("company_id", input.companyId)
    .eq("active", true)
    .order("sort_order", { ascending: true })
    .limit(12);

  const pageContent = buildIndustryTemplatePageContent(
    ctx.company,
    industryKey,
    (services ?? []) as { name: string; description: string | null; base_price_cents: number }[]
  );
  const theme = {
    ...website.theme_settings,
    ...themeSettingsForIndustryTemplate(industryKey),
    logoUrl: ctx.company.brand_logo_url ?? website.theme_settings?.logoUrl ?? null,
  };
  const seo = defaultSeoForWebsite(ctx.company);

  const { error: pageError } = await admin.client
    .from("website_pages")
    .update({
      content: pageContent,
      seo_title: seo.seo_title,
      seo_description: seo.seo_description,
      og_title: seo.seo_title,
      og_description: seo.seo_description,
      updated_at: new Date().toISOString(),
    })
    .eq("website_id", website.id)
    .eq("page_type", "landing");

  if (pageError) return { ok: false, error: pageError.message };

  const { error: websiteError } = await admin.client
    .from("websites")
    .update({
      industry: industryKey,
      template: industryKey,
      theme_settings: theme,
      seo_title: seo.seo_title,
      seo_description: seo.seo_description,
      seo_keywords: seo.seo_keywords,
      og_title: seo.seo_title,
      og_description: seo.seo_description,
      updated_at: new Date().toISOString(),
    })
    .eq("id", website.id);

  if (websiteError) return { ok: false, error: websiteError.message };

  revalidateBuilderPaths(input.companySlug);
  return { ok: true };
}

export async function updatePageSectionsAction(input: {
  companyId: string;
  companySlug: string;
  sections: WebsiteSection[];
  landing: LandingPageContent;
}): Promise<WebsiteBuilderActionResult> {
  const ctx = await loadCompanyContext(input.companyId, input.companySlug);
  if (!ctx.ok) return ctx;

  if (!canAccessWebsiteBuilderFeature(ctx.company, "websiteBuilder")) {
    return { ok: false, error: "Upgrade to Business to edit pages." };
  }

  const website = await getBuilderWebsiteForCompany(input.companyId);
  if (!website) return { ok: false, error: "Website not found." };

  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: "Could not save page." };

  const content = buildPageContentPayload(input.sections, input.landing);

  const { error } = await admin.client
    .from("website_pages")
    .update({
      content,
      updated_at: new Date().toISOString(),
    })
    .eq("website_id", website.id)
    .eq("page_type", "landing");

  if (error) return { ok: false, error: error.message };

  revalidateBuilderPaths(input.companySlug);
  return { ok: true };
}

export async function updateWebsiteNavigationAction(input: {
  companyId: string;
  companySlug: string;
  navigation: WebsiteNavigationSettings;
}): Promise<WebsiteBuilderActionResult> {
  const ctx = await loadCompanyContext(input.companyId, input.companySlug);
  if (!ctx.ok) return ctx;

  if (!canAccessWebsiteBuilderFeature(ctx.company, "websiteBuilder")) {
    return { ok: false, error: "Upgrade to Business to edit navigation." };
  }

  const website = await getBuilderWebsiteForCompany(input.companyId);
  if (!website) return { ok: false, error: "Website not found." };

  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: "Could not save navigation." };

  const theme = {
    ...website.theme_settings,
    [NAVIGATION_SETTINGS_KEY]: input.navigation,
  };

  const { error } = await admin.client
    .from("websites")
    .update({
      theme_settings: theme,
      updated_at: new Date().toISOString(),
    })
    .eq("id", website.id);

  if (error) return { ok: false, error: error.message };

  revalidateBuilderPaths(input.companySlug);
  return { ok: true };
}

export async function updateWebsiteBuilderSettingsAction(input: {
  companyId: string;
  companySlug: string;
  settings: WebsiteBuilderSettings;
}): Promise<WebsiteBuilderActionResult> {
  const ctx = await requireBuilderWriteAccess(input.companyId, input.companySlug);
  if (!ctx.ok) return ctx;

  const website = await getBuilderWebsiteForCompany(input.companyId);
  if (!website) return { ok: false, error: "Website not found." };

  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: "Could not save builder settings." };

  const theme = {
    ...website.theme_settings,
    [BUILDER_SETTINGS_KEY]: input.settings,
  };

  const { error } = await admin.client
    .from("websites")
    .update({
      theme_settings: theme,
      booking_enabled: input.settings.integrations.bookingEnabled,
      updated_at: new Date().toISOString(),
    })
    .eq("id", website.id);

  if (error) return { ok: false, error: error.message };

  revalidateBuilderPaths(input.companySlug);
  return { ok: true };
}

export async function generatePreviewTokenAction(input: {
  companyId: string;
  companySlug: string;
  expiresInDays?: number;
}): Promise<WebsiteBuilderActionResult & { token?: string; expiresAt?: string }> {
  const ctx = await requireBuilderWriteAccess(input.companyId, input.companySlug);
  if (!ctx.ok) return ctx;

  const website = await getBuilderWebsiteForCompany(input.companyId);
  if (!website) return { ok: false, error: "Website not found." };

  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: "Could not generate preview link." };

  const current = getBuilderSettings({
    website,
    bookingEnabled: website.booking_enabled,
  });
  const days = input.expiresInDays ?? 7;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  const token = crypto.randomUUID();

  const settings: WebsiteBuilderSettings = {
    ...current,
    preview: {
      shareEnabled: true,
      token,
      expiresAt,
    },
  };

  const theme = {
    ...website.theme_settings,
    [BUILDER_SETTINGS_KEY]: settings,
  };

  const { error } = await admin.client
    .from("websites")
    .update({
      theme_settings: theme,
      updated_at: new Date().toISOString(),
    })
    .eq("id", website.id);

  if (error) return { ok: false, error: error.message };

  revalidateBuilderPaths(input.companySlug);
  return { ok: true, token, expiresAt };
}

export async function revokePreviewTokenAction(input: {
  companyId: string;
  companySlug: string;
}): Promise<WebsiteBuilderActionResult> {
  const ctx = await requireBuilderWriteAccess(input.companyId, input.companySlug);
  if (!ctx.ok) return ctx;

  const website = await getBuilderWebsiteForCompany(input.companyId);
  if (!website) return { ok: false, error: "Website not found." };

  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: "Could not revoke preview link." };

  const current = getBuilderSettings({
    website,
    bookingEnabled: website.booking_enabled,
  });
  const settings: WebsiteBuilderSettings = {
    ...current,
    preview: {
      shareEnabled: false,
      token: null,
      expiresAt: null,
    },
  };

  const theme = {
    ...website.theme_settings,
    [BUILDER_SETTINGS_KEY]: settings,
  };

  const { error } = await admin.client
    .from("websites")
    .update({
      theme_settings: theme,
      updated_at: new Date().toISOString(),
    })
    .eq("id", website.id);

  if (error) return { ok: false, error: error.message };

  revalidateBuilderPaths(input.companySlug);
  return { ok: true };
}

export async function updateWebsiteContactFormAction(input: {
  companyId: string;
  companySlug: string;
  formSettings: WebsiteContactFormSettings;
}): Promise<WebsiteBuilderActionResult> {
  const ctx = await loadCompanyContext(input.companyId, input.companySlug);
  if (!ctx.ok) return ctx;

  if (!canAccessWebsiteBuilderFeature(ctx.company, "websiteBuilder")) {
    return { ok: false, error: "Upgrade to Business to edit form settings." };
  }

  const website = await getBuilderWebsiteForCompany(input.companyId);
  if (!website) return { ok: false, error: "Website not found." };

  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: "Could not save form settings." };

  const theme = {
    ...website.theme_settings,
    [CONTACT_FORM_SETTINGS_KEY]: input.formSettings,
  };

  const { error } = await admin.client
    .from("websites")
    .update({
      theme_settings: theme,
      updated_at: new Date().toISOString(),
    })
    .eq("id", website.id);

  if (error) return { ok: false, error: error.message };

  const { data: landingRow } = await admin.client
    .from("website_pages")
    .select("content")
    .eq("website_id", website.id)
    .eq("page_type", "landing")
    .maybeSingle();

  if (landingRow?.content && typeof landingRow.content === "object") {
    const landing = landingRow.content as LandingPageContent;
    const sections = getPageSections(landing);
    const contactIndex = sections.findIndex((section) => section.type === "contact");
    if (contactIndex >= 0) {
      const contactSection = sections[contactIndex];
      const nextSections = [...sections];
      nextSections[contactIndex] = {
        ...contactSection,
        props: {
          ...(contactSection.props as Record<string, unknown>),
          heading: input.formSettings.sectionHeading,
        },
      };
      const nextLanding = {
        ...landing,
        contact: {
          ...landing.contact,
          heading: input.formSettings.sectionHeading,
        },
      };
      const content = buildPageContentPayload(nextSections, nextLanding);
      await admin.client
        .from("website_pages")
        .update({
          content,
          updated_at: new Date().toISOString(),
        })
        .eq("website_id", website.id)
        .eq("page_type", "landing");
    }
  }

  revalidateBuilderPaths(input.companySlug);
  return { ok: true };
}

export async function updateWebsiteThemeAction(input: {
  companyId: string;
  companySlug: string;
  theme: WebsiteThemeSettings;
}): Promise<WebsiteBuilderActionResult> {
  const ctx = await loadCompanyContext(input.companyId, input.companySlug);
  if (!ctx.ok) return ctx;

  if (!canAccessWebsiteBuilderFeature(ctx.company, "websiteBuilder")) {
    return { ok: false, error: "Upgrade to Business to edit theme settings." };
  }

  const website = await getBuilderWebsiteForCompany(input.companyId);
  if (!website) return { ok: false, error: "Website not found." };

  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: "Could not save theme." };

  const theme = { ...website.theme_settings, ...input.theme };

  const { error } = await admin.client
    .from("websites")
    .update({
      theme_settings: theme,
      updated_at: new Date().toISOString(),
    })
    .eq("id", website.id);

  if (error) return { ok: false, error: error.message };

  revalidateBuilderPaths(input.companySlug);
  return { ok: true };
}

export async function updateBookingButtonAction(input: {
  companyId: string;
  companySlug: string;
  label: string;
}): Promise<WebsiteBuilderActionResult> {
  const ctx = await loadCompanyContext(input.companyId, input.companySlug);
  if (!ctx.ok) return ctx;

  if (!canAccessWebsiteBuilderFeature(ctx.company, "websiteBuilder")) {
    return { ok: false, error: "Upgrade to Business to customize the booking button." };
  }

  const website = await getBuilderWebsiteForCompany(input.companyId);
  if (!website) return { ok: false, error: "Website not found." };

  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: "Could not save button label." };

  const theme = { ...website.theme_settings, bookingButtonLabel: input.label.trim() || "Book Now" };

  const { error } = await admin.client
    .from("websites")
    .update({
      theme_settings: theme,
      updated_at: new Date().toISOString(),
    })
    .eq("id", website.id);

  if (error) return { ok: false, error: error.message };

  revalidateBuilderPaths(input.companySlug);
  return { ok: true };
}

export async function updateWebsiteSeoSettingsAction(input: {
  companyId: string;
  companySlug: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  ogTitle: string;
  ogDescription: string;
  ogImageUrl?: string | null;
  settings: import("@/types/website-builder-seo").WebsiteSeoSettings;
}): Promise<WebsiteBuilderActionResult> {
  const ctx = await loadCompanyContext(input.companyId, input.companySlug);
  if (!ctx.ok) return ctx;

  if (!canAccessWebsiteBuilderFeature(ctx.company, "websiteSeo")) {
    return { ok: false, error: "Upgrade to Pro for SEO settings." };
  }

  const website = await getBuilderWebsiteForCompany(input.companyId);
  if (!website) return { ok: false, error: "Website not found." };

  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: "Could not save SEO settings." };

  const theme = {
    ...website.theme_settings,
    [SEO_SETTINGS_KEY]: input.settings,
  };

  const { error } = await admin.client
    .from("websites")
    .update({
      seo_title: input.seoTitle,
      seo_description: input.seoDescription,
      seo_keywords: input.seoKeywords,
      og_title: input.ogTitle,
      og_description: input.ogDescription,
      og_image_url: input.ogImageUrl ?? null,
      theme_settings: theme,
      updated_at: new Date().toISOString(),
    })
    .eq("id", website.id);

  if (error) return { ok: false, error: error.message };

  revalidateBuilderPaths(input.companySlug);
  return { ok: true };
}

export async function updateWebsiteSeoAction(input: {
  companyId: string;
  companySlug: string;
  seoTitle: string;
  seoDescription: string;
  seoKeywords: string;
  ogTitle: string;
  ogDescription: string;
  ogImageUrl?: string | null;
}): Promise<WebsiteBuilderActionResult> {
  const ctx = await loadCompanyContext(input.companyId, input.companySlug);
  if (!ctx.ok) return ctx;

  if (!canAccessWebsiteBuilderFeature(ctx.company, "websiteSeo")) {
    return { ok: false, error: "Upgrade to Pro for SEO settings." };
  }

  const website = await getBuilderWebsiteForCompany(input.companyId);
  if (!website) return { ok: false, error: "Website not found." };

  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: "Could not save SEO settings." };

  const { error } = await admin.client
    .from("websites")
    .update({
      seo_title: input.seoTitle,
      seo_description: input.seoDescription,
      seo_keywords: input.seoKeywords,
      og_title: input.ogTitle,
      og_description: input.ogDescription,
      og_image_url: input.ogImageUrl ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", website.id);

  if (error) return { ok: false, error: error.message };

  revalidateBuilderPaths(input.companySlug);
  return { ok: true };
}

export async function publishWebsiteAction(input: {
  companyId: string;
  companySlug: string;
  status: "published" | "draft" | "unpublished";
}): Promise<WebsiteBuilderActionResult> {
  const ctx = await loadCompanyContext(input.companyId, input.companySlug);
  if (!ctx.ok) return ctx;

  if (!canAccessWebsiteBuilderFeature(ctx.company, "websitePublish")) {
    return { ok: false, error: "Upgrade to Business to publish your website." };
  }

  const website = await getBuilderWebsiteForCompany(input.companyId);
  if (!website) return { ok: false, error: "Website not found." };

  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: "Could not update publish status." };

  const now = new Date().toISOString();
  const { error } = await admin.client
    .from("websites")
    .update({
      status: input.status,
      published_at: input.status === "published" ? now : website.published_at,
      updated_at: now,
    })
    .eq("id", website.id);

  if (error) return { ok: false, error: error.message };

  const pageStatus = input.status === "published" ? "published" : "draft";
  await admin.client
    .from("website_pages")
    .update({ status: pageStatus, updated_at: now })
    .eq("website_id", website.id)
    .eq("page_type", "landing");

  if (input.status === "published") {
    await admin.client
      .from("website_service_pages")
      .update({ status: "published", updated_at: now })
      .eq("website_id", website.id)
      .eq("status", "draft");
  }

  revalidateBuilderPaths(input.companySlug);
  return { ok: true };
}

export async function updateDomainSettingsAction(input: {
  companyId: string;
  companySlug: string;
  requestedSubdomain: string;
}): Promise<WebsiteBuilderActionResult> {
  const ctx = await loadCompanyContext(input.companyId, input.companySlug);
  if (!ctx.ok) return ctx;

  if (!canAccessWebsiteBuilderFeature(ctx.company, "websiteDomains")) {
    return { ok: false, error: "Upgrade to Enterprise to reserve a custom subdomain." };
  }

  const website = await getBuilderWebsiteForCompany(input.companyId);
  if (!website) return { ok: false, error: "Website not found." };

  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: "Could not save domain settings." };

  const subdomain = slugifyBusinessName(input.requestedSubdomain).slice(0, 48);

  const { error } = await admin.client
    .from("domain_settings")
    .update({
      requested_subdomain: subdomain,
      updated_at: new Date().toISOString(),
    })
    .eq("website_id", website.id);

  if (error) return { ok: false, error: error.message };

  revalidateBuilderPaths(input.companySlug);
  return { ok: true };
}

export async function updateWwwRedirectAction(input: {
  companyId: string;
  companySlug: string;
  wwwRedirect: "none" | "www_to_apex" | "apex_to_www";
}): Promise<WebsiteBuilderActionResult> {
  const ctx = await requireBuilderWriteAccess(input.companyId, input.companySlug);
  if (!ctx.ok) return ctx;

  const website = await getBuilderWebsiteForCompany(input.companyId);
  if (!website) return { ok: false, error: "Website not found." };

  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: "Could not save domain settings." };

  const mode = input.wwwRedirect;
  if (mode !== "none" && mode !== "www_to_apex" && mode !== "apex_to_www") {
    return { ok: false, error: "Invalid redirect option." };
  }

  const { data: existing } = await admin.client
    .from("domain_settings")
    .select("id")
    .eq("website_id", website.id)
    .maybeSingle();

  const patch = {
    www_redirect: mode,
    updated_at: new Date().toISOString(),
  };

  let error: { message: string } | null = null;

  if (existing) {
    ({ error } = await admin.client.from("domain_settings").update(patch).eq("website_id", website.id));
  } else {
    const { data: primaryDomain } = await admin.client
      .from("website_domains")
      .select("domain, verification_status")
      .eq("company_id", input.companyId)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    ({ error } = await admin.client.from("domain_settings").insert({
      website_id: website.id,
      company_id: input.companyId,
      custom_domain: (primaryDomain?.domain as string | undefined) ?? null,
      custom_domain_status:
        primaryDomain?.verification_status === "verified" ? "verified" : "not_connected",
      ...patch,
    }));
  }

  if (error) {
    if (error.message.includes("www_redirect")) {
      return {
        ok: false,
        error:
          "WWW redirect is not available yet — run database migration 20260713000000_domain_settings_www_redirect.sql (npm run db:apply-all-migrations).",
      };
    }
    return { ok: false, error: error.message };
  }

  revalidateBuilderPaths(input.companySlug);
  return { ok: true };
}

export async function saveServicePageAction(input: {
  companyId: string;
  companySlug: string;
  id?: string;
  serviceId?: string | null;
  title: string;
  slug: string;
  description?: string;
  startingPrice?: string;
  duration?: string;
  benefits?: string[];
  faqs?: { question: string; answer: string }[];
  imageUrl?: string | null;
  seoTitle?: string;
  seoDescription?: string;
  status?: "draft" | "published" | "unpublished";
}): Promise<WebsiteBuilderActionResult & { id?: string }> {
  const ctx = await loadCompanyContext(input.companyId, input.companySlug);
  if (!ctx.ok) return ctx;

  if (!canAccessWebsiteBuilderFeature(ctx.company, "websiteServicePages")) {
    return { ok: false, error: "Upgrade to Pro for service pages." };
  }

  const website = await getBuilderWebsiteForCompany(input.companyId);
  if (!website) return { ok: false, error: "Website not found." };

  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: "Could not save service page." };

  const pageSlug = slugifyBusinessName(input.slug || input.title);
  const payload = {
    website_id: website.id,
    company_id: input.companyId,
    service_id: input.serviceId ?? null,
    slug: pageSlug,
    title: input.title,
    description: input.description ?? null,
    starting_price: input.startingPrice ?? null,
    duration: input.duration ?? null,
    benefits: input.benefits ?? [],
    faqs: input.faqs ?? [],
    image_url: input.imageUrl ?? null,
    status: input.status ?? "draft",
    seo_title: input.seoTitle ?? `${input.title} | ${ctx.company.name}`,
    seo_description:
      input.seoDescription ?? input.description?.slice(0, 155) ?? null,
    updated_at: new Date().toISOString(),
  };

  if (input.id) {
    const { error } = await admin.client
      .from("website_service_pages")
      .update(payload)
      .eq("id", input.id)
      .eq("company_id", input.companyId);

    if (error) return { ok: false, error: error.message };
    revalidateBuilderPaths(input.companySlug);
    return { ok: true, id: input.id };
  }

  const { data, error } = await admin.client
    .from("website_service_pages")
    .insert(payload)
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  revalidateBuilderPaths(input.companySlug);
  return { ok: true, id: data.id as string };
}

export async function deleteServicePageAction(input: {
  companyId: string;
  companySlug: string;
  id: string;
}): Promise<WebsiteBuilderActionResult> {
  const ctx = await loadCompanyContext(input.companyId, input.companySlug);
  if (!ctx.ok) return ctx;

  if (!canAccessWebsiteBuilderFeature(ctx.company, "websiteServicePages")) {
    return { ok: false, error: "Upgrade to Pro for service pages." };
  }

  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: "Could not delete service page." };

  const { error } = await admin.client
    .from("website_service_pages")
    .delete()
    .eq("id", input.id)
    .eq("company_id", input.companyId)
    .eq("status", "draft");

  if (error) return { ok: false, error: error.message };

  revalidateBuilderPaths(input.companySlug);
  return { ok: true };
}

export async function toggleServicePageVisibilityAction(input: {
  companyId: string;
  companySlug: string;
  id: string;
  status: "published" | "unpublished" | "draft";
}): Promise<WebsiteBuilderActionResult> {
  const ctx = await loadCompanyContext(input.companyId, input.companySlug);
  if (!ctx.ok) return ctx;

  if (!canAccessWebsiteBuilderFeature(ctx.company, "websiteServicePages")) {
    return { ok: false, error: "Upgrade to Pro for service pages." };
  }

  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: "Could not update service page." };

  const { error } = await admin.client
    .from("website_service_pages")
    .update({
      status: input.status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.id)
    .eq("company_id", input.companyId);

  if (error) return { ok: false, error: error.message };

  revalidateBuilderPaths(input.companySlug);
  return { ok: true };
}

export async function markEnquiryReadAction(input: {
  companyId: string;
  companySlug: string;
  enquiryId: string;
}): Promise<WebsiteBuilderActionResult> {
  const ctx = await loadCompanyContext(input.companyId, input.companySlug);
  if (!ctx.ok) return ctx;

  if (!canAccessWebsiteBuilderFeature(ctx.company, "websiteEnquiries")) {
    return { ok: false, error: "Upgrade to Pro to manage enquiries." };
  }

  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: "Could not update enquiry." };

  const { error } = await admin.client
    .from("website_enquiries")
    .update({ status: "read" })
    .eq("id", input.enquiryId)
    .eq("company_id", input.companyId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(companyWebsiteBuilderSectionPath(input.companySlug, "enquiries"));
  return { ok: true };
}

export async function saveWebsiteComponentAction(input: {
  companyId: string;
  companySlug: string;
  name: string;
  componentType: string;
  props: Record<string, unknown>;
}): Promise<WebsiteBuilderActionResult & { componentId?: string }> {
  const ctx = await loadCompanyContext(input.companyId, input.companySlug);
  if (!ctx.ok) return ctx;

  if (!canAccessWebsiteBuilderFeature(ctx.company, "websiteBuilder")) {
    return { ok: false, error: "Upgrade to Business to save components." };
  }

  const componentType = input.componentType.trim();
  if (!isSavedComponentType(componentType)) {
    return { ok: false, error: "Unsupported component type." };
  }

  const name = input.name.trim();
  if (!name) return { ok: false, error: "Component name is required." };

  const website = await getBuilderWebsiteForCompany(input.companyId);
  if (!website) return { ok: false, error: "Website not found." };

  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: "Could not save component." };

  const now = new Date().toISOString();
  const { data, error } = await admin.client
    .from("website_components")
    .insert({
      website_id: website.id,
      company_id: input.companyId,
      name,
      component_type: componentType,
      props: input.props,
      updated_at: now,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Could not save component." };

  revalidateBuilderPaths(input.companySlug);
  return { ok: true, componentId: data.id as string };
}

export async function updateWebsiteComponentAction(input: {
  companyId: string;
  companySlug: string;
  componentId: string;
  name: string;
  props: Record<string, unknown>;
}): Promise<WebsiteBuilderActionResult> {
  const ctx = await loadCompanyContext(input.companyId, input.companySlug);
  if (!ctx.ok) return ctx;

  if (!canAccessWebsiteBuilderFeature(ctx.company, "websiteBuilder")) {
    return { ok: false, error: "Upgrade to Business to edit components." };
  }

  const name = input.name.trim();
  if (!name) return { ok: false, error: "Component name is required." };

  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: "Could not update component." };

  const { error } = await admin.client
    .from("website_components")
    .update({
      name,
      props: input.props,
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.componentId)
    .eq("company_id", input.companyId);

  if (error) return { ok: false, error: error.message };

  revalidateBuilderPaths(input.companySlug);
  return { ok: true };
}

export async function deleteWebsiteComponentAction(input: {
  companyId: string;
  companySlug: string;
  componentId: string;
}): Promise<WebsiteBuilderActionResult> {
  const ctx = await loadCompanyContext(input.companyId, input.companySlug);
  if (!ctx.ok) return ctx;

  if (!canAccessWebsiteBuilderFeature(ctx.company, "websiteBuilder")) {
    return { ok: false, error: "Upgrade to Business to delete components." };
  }

  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: "Could not delete component." };

  const { error } = await admin.client
    .from("website_components")
    .delete()
    .eq("id", input.componentId)
    .eq("company_id", input.companyId);

  if (error) return { ok: false, error: error.message };

  revalidateBuilderPaths(input.companySlug);
  return { ok: true };
}

export async function updateWebsiteMediaAction(input: {
  companyId: string;
  companySlug: string;
  mediaId: string;
  altText?: string | null;
  tags?: string[];
  folder?: string;
  filename?: string;
}): Promise<WebsiteBuilderActionResult> {
  const ctx = await loadCompanyContext(input.companyId, input.companySlug);
  if (!ctx.ok) return ctx;

  if (!canAccessWebsiteBuilderFeature(ctx.company, "websiteBuilder")) {
    return { ok: false, error: "Upgrade to Business to manage media." };
  }

  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: "Could not update media." };

  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (input.altText !== undefined) {
    updates.alt_text = input.altText?.trim() || null;
  }
  if (input.tags !== undefined) {
    updates.tags = input.tags.map((tag) => tag.trim()).filter(Boolean);
  }
  if (input.folder !== undefined) {
    updates.folder = input.folder.trim() || "General";
  }
  if (input.filename !== undefined) {
    const name = input.filename.trim();
    if (!name) return { ok: false, error: "Filename is required." };
    updates.filename = name;
  }

  const { error } = await admin.client
    .from("website_media")
    .update(updates)
    .eq("id", input.mediaId)
    .eq("company_id", input.companyId);

  if (error) return { ok: false, error: error.message };

  revalidateBuilderPaths(input.companySlug);
  return { ok: true };
}

export async function deleteWebsiteMediaAction(input: {
  companyId: string;
  companySlug: string;
  mediaId: string;
}): Promise<WebsiteBuilderActionResult> {
  const ctx = await loadCompanyContext(input.companyId, input.companySlug);
  if (!ctx.ok) return ctx;

  if (!canAccessWebsiteBuilderFeature(ctx.company, "websiteBuilder")) {
    return { ok: false, error: "Upgrade to Business to delete media." };
  }

  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: "Could not delete media." };

  const { data: media, error: fetchError } = await admin.client
    .from("website_media")
    .select("storage_path")
    .eq("id", input.mediaId)
    .eq("company_id", input.companyId)
    .maybeSingle();

  if (fetchError || !media) {
    return { ok: false, error: fetchError?.message ?? "Media not found." };
  }

  const { error: storageError } = await admin.client.storage
    .from("website-assets")
    .remove([media.storage_path as string]);

  if (storageError) {
    return { ok: false, error: storageError.message };
  }

  const { error } = await admin.client
    .from("website_media")
    .delete()
    .eq("id", input.mediaId)
    .eq("company_id", input.companyId);

  if (error) return { ok: false, error: error.message };

  revalidateBuilderPaths(input.companySlug);
  return { ok: true };
}

function revalidateBlogPaths(slug: string) {
  revalidateBuilderPaths(slug);
  revalidatePath(companyContentPath(slug));
  revalidatePath(`/${slug}/dashboard/growth`);
  revalidatePath(`/site/${slug}/blog`);
}

export async function createBlogCategoryAction(input: {
  companyId: string;
  companySlug: string;
  name: string;
  description?: string;
}): Promise<WebsiteBuilderActionResult & { id?: string }> {
  const ctx = await requireBuilderWriteAccess(input.companyId, input.companySlug);
  if (!ctx.ok) return ctx;

  const result = await createBlogCategory(input.companyId, {
    name: input.name,
    description: input.description,
  });
  if (!result.ok) return result;

  revalidateBlogPaths(input.companySlug);
  return { ok: true, id: result.id };
}

export async function updateBlogCategoryAction(input: {
  companyId: string;
  companySlug: string;
  categoryId: string;
  name?: string;
  description?: string;
  sortOrder?: number;
}): Promise<WebsiteBuilderActionResult> {
  const ctx = await requireBuilderWriteAccess(input.companyId, input.companySlug);
  if (!ctx.ok) return ctx;

  const result = await updateBlogCategory(input.companyId, input.categoryId, {
    name: input.name,
    description: input.description,
    sortOrder: input.sortOrder,
  });
  if (!result.ok) return result;

  revalidateBlogPaths(input.companySlug);
  return { ok: true };
}

export async function deleteBlogCategoryAction(input: {
  companyId: string;
  companySlug: string;
  categoryId: string;
}): Promise<WebsiteBuilderActionResult> {
  const ctx = await requireBuilderWriteAccess(input.companyId, input.companySlug);
  if (!ctx.ok) return ctx;

  const result = await deleteBlogCategory(input.companyId, input.categoryId);
  if (!result.ok) return result;

  revalidateBlogPaths(input.companySlug);
  return { ok: true };
}

export async function createBlogTagAction(input: {
  companyId: string;
  companySlug: string;
  name: string;
}): Promise<WebsiteBuilderActionResult & { id?: string }> {
  const ctx = await requireBuilderWriteAccess(input.companyId, input.companySlug);
  if (!ctx.ok) return ctx;

  const result = await createBlogTag(input.companyId, { name: input.name });
  if (!result.ok) return result;

  revalidateBlogPaths(input.companySlug);
  return { ok: true, id: result.id };
}

export async function deleteBlogTagAction(input: {
  companyId: string;
  companySlug: string;
  tagId: string;
}): Promise<WebsiteBuilderActionResult> {
  const ctx = await requireBuilderWriteAccess(input.companyId, input.companySlug);
  if (!ctx.ok) return ctx;

  const result = await deleteBlogTag(input.companyId, input.tagId);
  if (!result.ok) return result;

  revalidateBlogPaths(input.companySlug);
  return { ok: true };
}

export async function createBlogPostAction(input: {
  companyId: string;
  companySlug: string;
  post: ContentPostInput & { tagIds?: string[] };
}): Promise<WebsiteBuilderActionResult & { id?: string }> {
  const ctx = await requireBuilderWriteAccess(input.companyId, input.companySlug);
  if (!ctx.ok) return ctx;

  const { tagIds, ...post } = input.post;
  const result = await createContentPost(input.companyId, post);
  if (!result.ok) return result;

  if (tagIds?.length) {
    const tagResult = await setPostBlogTags(result.id, tagIds);
    if (!tagResult.ok) return tagResult;
  }

  revalidateBlogPaths(input.companySlug);
  return { ok: true, id: result.id };
}

export async function updateBlogPostAction(input: {
  companyId: string;
  companySlug: string;
  postId: string;
  post: Partial<ContentPostInput> & { tagIds?: string[] };
}): Promise<WebsiteBuilderActionResult> {
  const ctx = await requireBuilderWriteAccess(input.companyId, input.companySlug);
  if (!ctx.ok) return ctx;

  const { tagIds, ...post } = input.post;
  const result = await updateContentPost(input.companyId, input.postId, post);
  if (!result.ok) return result;

  if (tagIds !== undefined) {
    const tagResult = await setPostBlogTags(input.postId, tagIds);
    if (!tagResult.ok) return tagResult;
  }

  revalidateBlogPaths(input.companySlug);
  return { ok: true };
}

export async function deleteBlogPostAction(input: {
  companyId: string;
  companySlug: string;
  postId: string;
}): Promise<WebsiteBuilderActionResult> {
  const ctx = await requireBuilderWriteAccess(input.companyId, input.companySlug);
  if (!ctx.ok) return ctx;

  const result = await deleteContentPost(input.companyId, input.postId);
  if (!result.ok) return result;

  revalidateBlogPaths(input.companySlug);
  return { ok: true };
}
