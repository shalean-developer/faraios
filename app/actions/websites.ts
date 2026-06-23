"use server";

import { revalidatePath } from "next/cache";

import {
  createWebsiteDraftForCompanyIdAsAdmin,
  createWebsiteDraftForCurrentUser,
  type CreateWebsiteInput,
  type WebsiteSeoInput,
  mergeStockImagesIntoContent,
  updateWebsiteSeo,
} from "@/lib/services/websites";
import { getAdminQueryClient, isCurrentUserPlatformAdmin } from "@/lib/services/admin";
import {
  companyDashboardPath,
  companyWebsiteEditPath,
  companyWebsitesPath,
} from "@/lib/paths/company";
import { getPrimaryCompanySlugForUser } from "@/lib/services/routing";
import { createClient } from "@/lib/supabase/server";

export type WebsiteMutationResult =
  | { ok: true; websiteId?: string }
  | { ok: false; error: string };

export type WebsiteContentFormPayload = Record<string, Record<string, unknown>>;

function normalizeWebsiteDomain(domain: string): string | null {
  const normalized = domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");
  return normalized || null;
}

async function revalidateCompanyWebsitePaths(
  companySlug: string,
  websiteId?: string
) {
  revalidatePath(companyDashboardPath(companySlug));
  revalidatePath(companyWebsitesPath(companySlug));
  revalidatePath(`${companyWebsitesPath(companySlug)}/create`);
  if (websiteId) {
    revalidatePath(companyWebsiteEditPath(companySlug, websiteId));
  }
}

export async function createWebsiteDraftAction(
  input: CreateWebsiteInput
): Promise<WebsiteMutationResult> {
  const result = await createWebsiteDraftForCurrentUser(input);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const slug = await getPrimaryCompanySlugForUser(user.id);
    if (slug) {
      await revalidateCompanyWebsitePaths(slug);
    }
  }
  revalidatePath("/app");
  return { ok: true, websiteId: result.websiteId };
}

export async function createWebsiteDraftAsAdminAction(
  companyId: string,
  input: CreateWebsiteInput
): Promise<WebsiteMutationResult> {
  if (!(await isCurrentUserPlatformAdmin())) {
    return { ok: false, error: "Forbidden." };
  }
  if (!companyId) {
    return { ok: false, error: "Client is required." };
  }

  const result = await createWebsiteDraftForCompanyIdAsAdmin(companyId, input);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidatePath("/admin/websites");
  revalidatePath("/admin");
  revalidatePath("/admin/pipeline");
  return { ok: true, websiteId: result.websiteId };
}

async function revalidateAdminWebsitePaths(
  websiteId: string,
  companySlug: string,
  companyId: string
) {
  revalidatePath("/admin/websites");
  revalidatePath(`/admin/websites/${websiteId}/edit`);
  revalidatePath("/admin/pipeline");
  revalidatePath(`/admin/pipeline/${companyId}`);
  if (companySlug !== "admin") {
    await revalidateCompanyWebsitePaths(companySlug, websiteId);
  }
  revalidatePath("/");
  revalidatePath("/services");
  revalidatePath("/about");
  revalidatePath("/contact");
}

export async function publishWebsiteAsAdminAction(
  websiteId: string,
  companySlug: string,
  companyId: string
): Promise<WebsiteMutationResult> {
  if (!(await isCurrentUserPlatformAdmin())) {
    return { ok: false, error: "Forbidden." };
  }
  if (!companyId) {
    return { ok: false, error: "Client company is required." };
  }

  const supabase = await getAdminQueryClient();
  const { data: website, error: websiteError } = await supabase
    .from("websites")
    .select("id,client_id")
    .eq("id", websiteId)
    .maybeSingle();

  if (websiteError || !website) {
    return { ok: false, error: websiteError?.message ?? "Website not found." };
  }

  if (website.client_id !== companyId) {
    return { ok: false, error: "Website does not belong to this client." };
  }

  const { error } = await supabase
    .from("websites")
    .update({ status: "published" })
    .eq("id", websiteId);

  if (error) {
    return { ok: false, error: error.message };
  }

  await revalidateAdminWebsitePaths(websiteId, companySlug, companyId);
  return { ok: true };
}

export async function unpublishWebsiteAsAdminAction(
  websiteId: string,
  companySlug: string,
  companyId: string
): Promise<WebsiteMutationResult> {
  if (!(await isCurrentUserPlatformAdmin())) {
    return { ok: false, error: "Forbidden." };
  }
  if (!companyId) {
    return { ok: false, error: "Client company is required." };
  }

  const supabase = await getAdminQueryClient();
  const { data: website, error: websiteError } = await supabase
    .from("websites")
    .select("id,client_id")
    .eq("id", websiteId)
    .maybeSingle();

  if (websiteError || !website) {
    return { ok: false, error: websiteError?.message ?? "Website not found." };
  }

  if (website.client_id !== companyId) {
    return { ok: false, error: "Website does not belong to this client." };
  }

  const { error } = await supabase
    .from("websites")
    .update({ status: "draft" })
    .eq("id", websiteId);

  if (error) {
    return { ok: false, error: error.message };
  }

  await revalidateAdminWebsitePaths(websiteId, companySlug, companyId);
  return { ok: true };
}

export async function connectDomainAsAdminAction(
  websiteId: string,
  domain: string,
  companySlug: string,
  companyId: string
): Promise<WebsiteMutationResult> {
  if (!(await isCurrentUserPlatformAdmin())) {
    return { ok: false, error: "Forbidden." };
  }
  if (!companyId) {
    return { ok: false, error: "Client company is required." };
  }

  const normalizedDomain = normalizeWebsiteDomain(domain);
  if (!normalizedDomain) {
    return { ok: false, error: "Please provide a valid domain." };
  }

  const supabase = await getAdminQueryClient();
  const { data: website, error: websiteError } = await supabase
    .from("websites")
    .select("id,client_id")
    .eq("id", websiteId)
    .maybeSingle();

  if (websiteError || !website) {
    return { ok: false, error: websiteError?.message ?? "Website not found." };
  }

  if (website.client_id !== companyId) {
    return { ok: false, error: "Website does not belong to this client." };
  }

  const { error } = await supabase
    .from("websites")
    .update({ domain: normalizedDomain })
    .eq("id", websiteId);

  if (error) {
    return { ok: false, error: error.message };
  }

  await revalidateAdminWebsitePaths(websiteId, companySlug, companyId);
  return { ok: true };
}

export async function updateWebsiteSeoAsAdminAction(
  websiteId: string,
  companySlug: string,
  companyId: string,
  input: WebsiteSeoInput
): Promise<WebsiteMutationResult> {
  if (!(await isCurrentUserPlatformAdmin())) {
    return { ok: false, error: "Forbidden." };
  }
  if (!companyId) {
    return { ok: false, error: "Client company is required." };
  }

  const supabase = await getAdminQueryClient();
  const { data: website, error: websiteError } = await supabase
    .from("websites")
    .select("id,client_id")
    .eq("id", websiteId)
    .maybeSingle();

  if (websiteError || !website) {
    return { ok: false, error: websiteError?.message ?? "Website not found." };
  }

  if (website.client_id !== companyId) {
    return { ok: false, error: "Website does not belong to this client." };
  }

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

  await revalidateAdminWebsitePaths(websiteId, companySlug, companyId);
  return { ok: true };
}

export async function publishWebsiteAction(
  websiteId: string,
  companySlug: string
): Promise<WebsiteMutationResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  const { data: website, error: websiteError } = await supabase
    .from("websites")
    .select("id,client_id")
    .eq("id", websiteId)
    .maybeSingle();

  if (websiteError || !website) {
    return { ok: false, error: websiteError?.message ?? "Website not found." };
  }

  const { data: membership, error: membershipError } = await supabase
    .from("memberships")
    .select("id")
    .eq("company_id", website.client_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError || !membership) {
    return { ok: false, error: "You do not have access to this website." };
  }

  const { error } = await supabase
    .from("websites")
    .update({
      status: "published",
      connection_status: "live",
      hosting_provider: "vercel",
    })
    .eq("id", websiteId);

  if (error) {
    return { ok: false, error: error.message };
  }

  await supabase.from("website_deployments").insert({
    company_id: website.client_id,
    website_id: websiteId,
    environment: "production",
    status: "live",
    hosting_provider: "vercel",
    url: null,
  });

  await supabase.from("connected_websites").upsert(
    {
      company_id: website.client_id,
      type: "hosted",
      website_id: websiteId,
      status: "live",
      booking_enabled: true,
      tracking_enabled: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "company_id" }
  );

  await revalidateCompanyWebsitePaths(companySlug, websiteId);
  revalidatePath("/");
  return { ok: true };
}

export async function connectDomainAction(
  websiteId: string,
  domain: string,
  companySlug: string
): Promise<WebsiteMutationResult> {
  const normalizedDomain = normalizeWebsiteDomain(domain);

  if (!normalizedDomain) {
    return { ok: false, error: "Please provide a valid domain." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  const { data: website, error: websiteError } = await supabase
    .from("websites")
    .select("id,client_id")
    .eq("id", websiteId)
    .maybeSingle();

  if (websiteError || !website) {
    return { ok: false, error: websiteError?.message ?? "Website not found." };
  }

  const { data: membership, error: membershipError } = await supabase
    .from("memberships")
    .select("id")
    .eq("company_id", website.client_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError || !membership) {
    return { ok: false, error: "You do not have access to this website." };
  }

  const { error } = await supabase
    .from("websites")
    .update({ domain: normalizedDomain })
    .eq("id", websiteId);

  if (error) {
    return { ok: false, error: error.message };
  }

  await revalidateCompanyWebsitePaths(companySlug, websiteId);
  revalidatePath("/");
  return { ok: true };
}

export async function updateWebsiteSeoAction(
  websiteId: string,
  companySlug: string,
  input: WebsiteSeoInput
): Promise<WebsiteMutationResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, error: "Please sign in again." };

  const { data: website, error: websiteError } = await supabase
    .from("websites")
    .select("id,client_id")
    .eq("id", websiteId)
    .maybeSingle();

  if (websiteError || !website) {
    return { ok: false, error: websiteError?.message ?? "Website not found." };
  }

  const { data: membership, error: membershipError } = await supabase
    .from("memberships")
    .select("id")
    .eq("company_id", website.client_id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (membershipError || !membership) {
    return { ok: false, error: "You do not have access to this website." };
  }

  const result = await updateWebsiteSeo(websiteId, input);
  if (!result.ok) return { ok: false, error: result.error };

  await revalidateCompanyWebsitePaths(companySlug, websiteId);
  revalidatePath("/");
  revalidatePath("/services");
  revalidatePath("/about");
  revalidatePath("/contact");
  return { ok: true };
}

export async function updateWebsiteContentAction(
  websiteId: string,
  companySlug: string,
  payload: WebsiteContentFormPayload
): Promise<WebsiteMutationResult> {
  const isAdmin = await isCurrentUserPlatformAdmin();
  const authClient = await createClient();

  if (!isAdmin) {
    const {
      data: { user },
    } = await authClient.auth.getUser();
    if (!user) return { ok: false, error: "Please sign in again." };

    const { data: website, error: websiteError } = await authClient
      .from("websites")
      .select("id,client_id")
      .eq("id", websiteId)
      .maybeSingle();

    if (websiteError || !website) {
      return { ok: false, error: websiteError?.message ?? "Website not found." };
    }

    const { data: membership, error: membershipError } = await authClient
      .from("memberships")
      .select("id")
      .eq("company_id", website.client_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (membershipError || !membership) {
      return { ok: false, error: "You do not have access to this website." };
    }
  }

  const supabase = isAdmin ? await getAdminQueryClient() : authClient;
  const rows = Object.entries(payload).map(([section, content]) => ({
    website_id: websiteId,
    section,
    content,
  }));

  const { error } = await supabase
    .from("website_content")
    .upsert(rows, { onConflict: "website_id,section" });

  if (error) {
    return { ok: false, error: error.message };
  }

  if (companySlug !== "admin") {
    await revalidateCompanyWebsitePaths(companySlug, websiteId);
  }
  revalidatePath("/admin/websites");
  revalidatePath(`/admin/websites/${websiteId}/edit`);
  revalidatePath("/");
  revalidatePath("/services");
  revalidatePath("/about");
  revalidatePath("/contact");
  return { ok: true };
}

export async function applyIndustryStockImagesAction(
  websiteId: string,
  companySlug: string
): Promise<WebsiteMutationResult> {
  const isAdmin = await isCurrentUserPlatformAdmin();
  const authClient = await createClient();

  if (!isAdmin) {
    const {
      data: { user },
    } = await authClient.auth.getUser();
    if (!user) return { ok: false, error: "Please sign in again." };

    const { data: website, error: websiteError } = await authClient
      .from("websites")
      .select("id,client_id")
      .eq("id", websiteId)
      .maybeSingle();

    if (websiteError || !website) {
      return { ok: false, error: websiteError?.message ?? "Website not found." };
    }

    const { data: membership, error: membershipError } = await authClient
      .from("memberships")
      .select("id")
      .eq("company_id", website.client_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (membershipError || !membership) {
      return { ok: false, error: "You do not have access to this website." };
    }
  }

  const supabase = isAdmin ? await getAdminQueryClient() : authClient;
  const { data: website, error: websiteError } = await supabase
    .from("websites")
    .select("id,industry")
    .eq("id", websiteId)
    .maybeSingle();

  if (websiteError || !website) {
    return { ok: false, error: websiteError?.message ?? "Website not found." };
  }

  const { data: rows, error: rowsError } = await supabase
    .from("website_content")
    .select("section,content")
    .eq("website_id", websiteId);

  if (rowsError) {
    return { ok: false, error: rowsError.message };
  }

  const content = ((rows ?? []) as { section: string; content: Record<string, unknown> }[]).reduce<
    Record<string, Record<string, unknown>>
  >((acc, row) => {
    acc[row.section] = row.content ?? {};
    return acc;
  }, {});

  const merged = mergeStockImagesIntoContent(
    typeof website.industry === "string" ? website.industry : "general",
    content
  );

  const upsertRows = ["hero", "services", "about", "contact"].map((section) => ({
    website_id: websiteId,
    section,
    content: merged[section] ?? content[section] ?? {},
  }));

  const { error } = await supabase
    .from("website_content")
    .upsert(upsertRows, { onConflict: "website_id,section" });

  if (error) {
    return { ok: false, error: error.message };
  }

  if (companySlug !== "admin") {
    await revalidateCompanyWebsitePaths(companySlug, websiteId);
  }
  revalidatePath("/admin/websites");
  revalidatePath(`/admin/websites/${websiteId}/edit`);
  revalidatePath("/");
  revalidatePath("/services");
  revalidatePath("/about");
  revalidatePath("/contact");
  return { ok: true };
}
