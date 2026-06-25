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
import type { LandingPageContent } from "@/types/website-builder";
import type { SubscriptionCompanyFields } from "@/lib/subscriptions/types";

export type WebsiteBuilderActionResult =
  | { ok: true }
  | { ok: false; error: string };

function revalidateBuilderPaths(slug: string) {
  revalidatePath(companyWebsiteBuilderPath(slug));
  revalidatePath(companyWebsiteBuilderSectionPath(slug, "pages"));
  revalidatePath(companyWebsiteBuilderSectionPath(slug, "service-pages"));
  revalidatePath(companyWebsiteBuilderSectionPath(slug, "publish"));
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
