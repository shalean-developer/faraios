"use server";

import { revalidatePath } from "next/cache";

import { requireCompanyMembership } from "@/lib/services/company-access";
import { createContentPost, updateContentPost } from "@/lib/services/content-posts";
import type { ContentPostInput } from "@/lib/services/content-posts";
import { createEmailCampaign, sendEmailCampaign } from "@/lib/services/email-campaigns";
import type { EmailCampaignInput } from "@/lib/services/email-campaigns";
import { upsertLocalSeoSettings } from "@/lib/services/local-seo";
import type { LocalSeoInput } from "@/lib/services/local-seo";
import { sendReviewRequest } from "@/lib/services/review-requests";
import {
  bulkGenerateServiceAreaPages,
  createServiceAreaPage,
  updateServiceAreaPage,
} from "@/lib/services/service-area-pages";
import type { ServiceAreaPageInput } from "@/lib/services/service-area-pages";
import { updateWebsiteSeo, type WebsiteSeoInput } from "@/lib/services/websites";

export type GrowthActionResult = { ok: true } | { ok: false; error: string };

function revalidateGrowth(slug: string) {
  revalidatePath(`/${slug}/dashboard/seo`);
  revalidatePath(`/${slug}/dashboard/marketing`);
  revalidatePath(`/${slug}/dashboard/reviews`);
  revalidatePath(`/${slug}/dashboard/campaigns`);
  revalidatePath(`/${slug}/dashboard/content`);
  revalidatePath(`/${slug}/dashboard/analytics`);
}

export async function saveLocalSeoSettingsAction(input: {
  companyId: string;
  companySlug: string;
  settings: LocalSeoInput;
}): Promise<GrowthActionResult> {
  const access = await requireCompanyMembership(input.companyId);
  if (!access.ok) return access;

  const result = await upsertLocalSeoSettings(input.companyId, input.settings);
  if (!result.ok) return result;

  revalidateGrowth(input.companySlug);
  return { ok: true };
}

export async function saveWebsiteSeoAction(input: {
  companyId: string;
  companySlug: string;
  websiteId: string;
  seo: Pick<WebsiteSeoInput, "seoTitle" | "seoDescription"> & { seoKeywords?: string };
}): Promise<GrowthActionResult> {
  const access = await requireCompanyMembership(input.companyId);
  if (!access.ok) return access;

  const result = await updateWebsiteSeo(input.websiteId, {
    seoTitle: input.seo.seoTitle,
    seoDescription: input.seo.seoDescription,
    seoKeywords: input.seo.seoKeywords ?? "",
  });
  if (!result.ok) return { ok: false, error: result.error };

  revalidateGrowth(input.companySlug);
  return { ok: true };
}

export async function createServiceAreaPageAction(input: {
  companyId: string;
  companySlug: string;
  page: ServiceAreaPageInput;
}): Promise<GrowthActionResult & { id?: string }> {
  const access = await requireCompanyMembership(input.companyId);
  if (!access.ok) return access;

  const result = await createServiceAreaPage(input.companyId, input.page);
  if (!result.ok) return result;

  revalidateGrowth(input.companySlug);
  return { ok: true, id: result.id };
}

export async function updateServiceAreaPageAction(input: {
  companyId: string;
  companySlug: string;
  pageId: string;
  page: Partial<ServiceAreaPageInput>;
}): Promise<GrowthActionResult> {
  const access = await requireCompanyMembership(input.companyId);
  if (!access.ok) return access;

  const result = await updateServiceAreaPage(input.companyId, input.pageId, input.page);
  if (!result.ok) return result;

  revalidateGrowth(input.companySlug);
  return { ok: true };
}

export async function bulkGenerateServiceAreasAction(input: {
  companyId: string;
  companySlug: string;
  businessName: string;
  serviceNames: string[];
  areaNames: string[];
}): Promise<GrowthActionResult & { created?: number }> {
  const access = await requireCompanyMembership(input.companyId);
  if (!access.ok) return access;

  const result = await bulkGenerateServiceAreaPages(
    input.companyId,
    input.businessName,
    input.serviceNames,
    input.areaNames
  );
  if (!result.ok) return result;

  revalidateGrowth(input.companySlug);
  return { ok: true, created: result.created };
}

export async function createContentPostAction(input: {
  companyId: string;
  companySlug: string;
  post: ContentPostInput;
}): Promise<GrowthActionResult & { id?: string }> {
  const access = await requireCompanyMembership(input.companyId);
  if (!access.ok) return access;

  const result = await createContentPost(input.companyId, input.post);
  if (!result.ok) return result;

  revalidateGrowth(input.companySlug);
  return { ok: true, id: result.id };
}

export async function updateContentPostAction(input: {
  companyId: string;
  companySlug: string;
  postId: string;
  post: Partial<ContentPostInput>;
}): Promise<GrowthActionResult> {
  const access = await requireCompanyMembership(input.companyId);
  if (!access.ok) return access;

  const result = await updateContentPost(input.companyId, input.postId, input.post);
  if (!result.ok) return result;

  revalidateGrowth(input.companySlug);
  return { ok: true };
}

export async function sendReviewRequestAction(input: {
  companyId: string;
  companySlug: string;
  customerEmail: string;
  customerName: string;
  businessName: string;
  bookingId?: string;
}): Promise<GrowthActionResult> {
  const access = await requireCompanyMembership(input.companyId);
  if (!access.ok) return access;

  const result = await sendReviewRequest({
    companyId: input.companyId,
    bookingId: input.bookingId,
    customerEmail: input.customerEmail,
    customerName: input.customerName,
    businessName: input.businessName,
  });
  if (!result.ok) return result;

  revalidateGrowth(input.companySlug);
  return { ok: true };
}

export async function createCampaignAction(input: {
  companyId: string;
  companySlug: string;
  campaign: EmailCampaignInput;
}): Promise<GrowthActionResult & { id?: string }> {
  const access = await requireCompanyMembership(input.companyId);
  if (!access.ok) return access;

  const result = await createEmailCampaign(input.companyId, input.campaign);
  if (!result.ok) return result;

  revalidateGrowth(input.companySlug);
  return { ok: true, id: result.id };
}

export async function sendCampaignAction(input: {
  companyId: string;
  companySlug: string;
  campaignId: string;
}): Promise<GrowthActionResult & { sentCount?: number }> {
  const access = await requireCompanyMembership(input.companyId);
  if (!access.ok) return access;

  const result = await sendEmailCampaign(input.companyId, input.campaignId);
  if (!result.ok) return result;

  revalidateGrowth(input.companySlug);
  return { ok: true, sentCount: result.sentCount };
}
