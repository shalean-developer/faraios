"use server";

import { revalidatePath } from "next/cache";

import {
  createWebsiteDraftForCompanyId,
  createWebsiteDraftForCurrentUser,
  type CreateWebsiteInput,
  type WebsiteSeoInput,
  updateWebsiteSeo,
} from "@/lib/services/websites";
import { isCurrentUserPlatformAdmin } from "@/lib/services/admin";
import { createClient } from "@/lib/supabase/server";

export type WebsiteMutationResult =
  | { ok: true; websiteId?: string }
  | { ok: false; error: string };

export type WebsiteContentFormPayload = {
  hero: Record<string, unknown>;
  services: Record<string, unknown>;
  about: Record<string, unknown>;
  contact: Record<string, unknown>;
};

export async function createWebsiteDraftAction(
  input: CreateWebsiteInput
): Promise<WebsiteMutationResult> {
  const result = await createWebsiteDraftForCurrentUser(input);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidatePath("/dashboard/create-website");
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

  const result = await createWebsiteDraftForCompanyId(companyId, input);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }

  revalidatePath("/admin/websites");
  revalidatePath("/admin/dashboard");
  return { ok: true, websiteId: result.websiteId };
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
    .update({ status: "published" })
    .eq("id", websiteId);

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(`/${companySlug}/dashboard`);
  revalidatePath("/");
  return { ok: true };
}

export async function connectDomainAction(
  websiteId: string,
  domain: string,
  companySlug: string
): Promise<WebsiteMutationResult> {
  const normalizedDomain = domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/.*$/, "");

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

  revalidatePath(`/${companySlug}/dashboard`);
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

  revalidatePath(`/${companySlug}/dashboard`);
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

  const rows = [
    { website_id: websiteId, section: "hero", content: payload.hero },
    { website_id: websiteId, section: "services", content: payload.services },
    { website_id: websiteId, section: "about", content: payload.about },
    { website_id: websiteId, section: "contact", content: payload.contact },
  ];

  const { error } = await supabase
    .from("website_content")
    .upsert(rows, { onConflict: "website_id,section" });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath(`/dashboard/websites/${websiteId}/edit`);
  revalidatePath(`/${companySlug}/dashboard`);
  revalidatePath("/");
  revalidatePath("/services");
  revalidatePath("/about");
  revalidatePath("/contact");
  return { ok: true };
}
