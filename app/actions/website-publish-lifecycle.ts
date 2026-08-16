"use server";

import { revalidatePath } from "next/cache";

import { companyWebsiteBuilderSectionPath, publicSitePath } from "@/lib/paths/company";
import { requireCompanyMembership } from "@/lib/services/company-access";
import { getCompanyBySlug } from "@/lib/services/companies";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { canAccessWebsiteBuilderFeature, resolvePublicSiteUrl } from "@/lib/website-builder/access";
import { getBuilderWebsiteForCompany } from "@/lib/website-builder/service";

type PublishStatus = "published" | "draft" | "unpublished";
type PublishState =
  | "publish_requested"
  | "validating_origin"
  | "validating_domain"
  | "validating_ssl"
  | "smoke_testing"
  | "live"
  | "failed";

type Result = { ok: true } | { ok: false; error: string };

const REQUEST_TIMEOUT_MS = 10_000;

async function smokeFetch(url: string, requireSuccess: boolean): Promise<string | null> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
      headers: { "user-agent": "FaraiOS-Publish-Smoke/1.0" },
    });
    if (requireSuccess ? !response.ok : response.status >= 500) {
      return `HTTP ${response.status} from ${url}`;
    }
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : `Could not reach ${url}`;
  } finally {
    clearTimeout(timeout);
  }
}

export async function publishWebsiteWithLifecycleAction(input: {
  companyId: string;
  companySlug: string;
  status: PublishStatus;
}): Promise<Result> {
  const access = await requireCompanyMembership(input.companyId);
  if (!access.ok) return access;

  const company = await getCompanyBySlug(input.companySlug);
  if (!company || company.id !== input.companyId) return { ok: false, error: "Company not found." };
  if (!canAccessWebsiteBuilderFeature(company, "websitePublish")) {
    return { ok: false, error: "Upgrade to Business to publish your website." };
  }

  const website = await getBuilderWebsiteForCompany(input.companyId);
  if (!website) return { ok: false, error: "Website not found." };

  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: "Could not update publish status." };

  const now = new Date().toISOString();
  const refresh = () => {
    revalidatePath(companyWebsiteBuilderSectionPath(input.companySlug, "publish"));
    revalidatePath(publicSitePath(input.companySlug));
  };

  if (input.status !== "published") {
    const { error } = await admin.client
      .from("websites")
      .update({ status: input.status, updated_at: now })
      .eq("id", website.id);
    if (error) return { ok: false, error: error.message };
    await admin.client
      .from("website_pages")
      .update({ status: "draft", updated_at: now })
      .eq("website_id", website.id)
      .eq("page_type", "landing");
    refresh();
    return { ok: true };
  }

  const [{ data: landing }, { data: servicePages }, { data: primaryDomain }] = await Promise.all([
    admin.client
      .from("website_pages")
      .select("id,status,content,seo_title,seo_description")
      .eq("website_id", website.id)
      .eq("page_type", "landing")
      .maybeSingle(),
    admin.client
      .from("website_service_pages")
      .select("id,status,slug,title")
      .eq("website_id", website.id),
    admin.client
      .from("website_domains")
      .select("id,domain,verification_status,ssl_status,is_primary")
      .eq("company_id", input.companyId)
      .eq("website_id", website.id)
      .eq("is_primary", true)
      .maybeSingle(),
  ]);

  if (!landing) return { ok: false, error: "Publish blocked: landing page is missing." };

  const snapshot = {
    website: {
      id: website.id,
      status: website.status,
      published_at: website.published_at,
      title: website.title,
      theme_settings: website.theme_settings,
    },
    landing,
    servicePages: servicePages ?? [],
  };

  const targetUrl = resolvePublicSiteUrl(input.companySlug, undefined);
  const { data: attempt, error: attemptError } = await admin.client
    .from("website_publish_attempts")
    .insert({
      website_id: website.id,
      company_id: input.companyId,
      requested_by: access.userId,
      state: "publish_requested",
      snapshot,
      target_url: targetUrl,
    })
    .select("id")
    .single();

  if (attemptError || !attempt) {
    return {
      ok: false,
      error: `Publish lifecycle is not ready: ${attemptError?.message ?? "could not create publish attempt"}`,
    };
  }

  const transition = async (state: PublishState, errorMessage?: string) => {
    await admin.client
      .from("website_publish_attempts")
      .update({
        state,
        error_message: errorMessage ?? null,
        updated_at: new Date().toISOString(),
        completed_at: state === "live" || state === "failed" ? new Date().toISOString() : null,
      })
      .eq("id", attempt.id);
  };

  const fail = async (message: string): Promise<Result> => {
    await transition("failed", message);
    refresh();
    return { ok: false, error: `Publish blocked: ${message}` };
  };

  await transition("validating_origin");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  if (!appUrl) return fail("NEXT_PUBLIC_APP_URL is not configured.");
  if (process.env.NODE_ENV === "production" && !appUrl.startsWith("https://")) {
    return fail("Production origin must use HTTPS.");
  }
  const previewUrl = `${appUrl}/preview/${encodeURIComponent(website.id)}`;
  const previewError = await smokeFetch(previewUrl, true);
  if (previewError) return fail(`origin/preview check failed: ${previewError}`);

  await transition("validating_domain");
  if (primaryDomain && primaryDomain.verification_status !== "verified") {
    return fail(`custom domain ${primaryDomain.domain} is not verified.`);
  }

  await transition("validating_ssl");
  if (primaryDomain) {
    if (primaryDomain.ssl_status !== "active") {
      return fail(`SSL for ${primaryDomain.domain} is ${primaryDomain.ssl_status}.`);
    }
    const sslError = await smokeFetch(`https://${primaryDomain.domain}`, false);
    if (sslError) return fail(`SSL/domain reachability check failed: ${sslError}`);
  }

  await transition("smoke_testing");

  const { error: websiteError } = await admin.client
    .from("websites")
    .update({ status: "published", published_at: now, updated_at: now })
    .eq("id", website.id);
  if (websiteError) return fail(websiteError.message);

  const { error: pageError } = await admin.client
    .from("website_pages")
    .update({ status: "published", updated_at: now })
    .eq("website_id", website.id)
    .eq("page_type", "landing");
  if (pageError) return fail(pageError.message);

  await admin.client
    .from("website_service_pages")
    .update({ status: "published", updated_at: now })
    .eq("website_id", website.id)
    .eq("status", "draft");

  refresh();
  const liveError = await smokeFetch(targetUrl, true);
  if (liveError) {
    await admin.client
      .from("websites")
      .update({ status: website.status, published_at: website.published_at, updated_at: new Date().toISOString() })
      .eq("id", website.id);
    await admin.client
      .from("website_pages")
      .update({ status: landing.status, updated_at: new Date().toISOString() })
      .eq("id", landing.id);
    await Promise.all(
      (servicePages ?? []).map((page) =>
        admin.client
          .from("website_service_pages")
          .update({ status: page.status, updated_at: new Date().toISOString() })
          .eq("id", page.id)
      )
    );
    refresh();
    return fail(`live smoke test failed and publish was rolled back: ${liveError}`);
  }

  await transition("live");
  refresh();
  return { ok: true };
}
