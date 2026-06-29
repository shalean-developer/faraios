"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "crypto";
import { after } from "next/server";

import { getHostingProvider } from "@/lib/hosting/providers";
import { getDefaultHostingProviderSlug } from "@/lib/hosting/constants";
import { previewSubdomainForSlug } from "@/lib/constants/tenant-domain";
import { requireCompanyPermission } from "@/lib/services/company-access";
import { provisionCompanyWebsiteDomain } from "@/lib/services/hosting-domain";
import { getDomainHostingReadiness } from "@/lib/services/domain-hosting-readiness";
import {
  normalizeDomain,
  runAutoDomainVerificationWithRetries,
  verifyWebsiteDomain,
} from "@/lib/services/website-domains";
import { recordApiKeyEvent } from "@/lib/services/business-websites";
import { createClient } from "@/lib/supabase/server";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import {
  companyWebsiteApiKeysPath,
  companyWebsiteBuilderSectionPath,
  companyWebsiteDomainsPath,
  companyWebsitesPath,
} from "@/lib/paths/company";
import {
  getBuilderWebsiteForCompany,
  syncDomainSettingsCustomDomain,
} from "@/lib/website-builder/service";

type ActionResult =
  | { ok: true; websiteDomainId?: string }
  | { ok: false; error: string; requiresHosting?: boolean; domain?: string };
type ActionResultWithKey = { ok: true; apiKey: string } | { ok: false; error: string };

export async function addWebsiteDomainAction(input: {
  companyId: string;
  companySlug: string;
  domain: string;
  domainType?: "primary" | "subdomain" | "preview";
  websiteId?: string | null;
  connectedWebsiteId?: string | null;
  hostingProvider?: string;
  isPrimary?: boolean;
}): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const normalized = normalizeDomain(input.domain);
  if (!normalized || !normalized.includes(".")) {
    return { ok: false, error: "Enter a valid domain." };
  }

  const access = await requireCompanyPermission(input.companyId, "view_websites");
  if (!access.ok) return access;

  const readiness = await getDomainHostingReadiness(input.companyId, normalized);
  if (!readiness.ready) {
    return {
      ok: false,
      error: readiness.message,
      requiresHosting: true,
      domain: normalized,
    };
  }

  const provision = await provisionCompanyWebsiteDomain({
    companyId: input.companyId,
    domain: normalized,
    hostingProvider: input.hostingProvider,
    domainType: input.domainType,
    websiteId: input.websiteId,
    connectedWebsiteId: input.connectedWebsiteId,
    isPrimary: input.isPrimary,
    serverId: readiness.serverId,
    pleskSubscriptionId: readiness.pleskSubscriptionId,
  });

  if (!provision.ok) {
    return { ok: false, error: provision.error };
  }

  const builderWebsite =
    input.websiteId != null
      ? { id: input.websiteId }
      : await getBuilderWebsiteForCompany(input.companyId);

  if (builderWebsite) {
    await syncDomainSettingsCustomDomain({
      websiteId: builderWebsite.id,
      companyId: input.companyId,
      customDomain: normalized,
      customDomainStatus: "pending",
    });
  }

  revalidatePath(companyWebsiteDomainsPath(input.companySlug));
  revalidatePath(companyWebsiteBuilderSectionPath(input.companySlug, "domains"));
  revalidatePath(companyWebsitesPath(input.companySlug));
  return { ok: true, websiteDomainId: provision.websiteDomainId };
}

export async function verifyWebsiteDomainAction(input: {
  companyId: string;
  companySlug: string;
  websiteDomainId: string;
}): Promise<{ ok: true; verified: boolean; hint?: string } | { ok: false; error: string }> {
  const access = await requireCompanyPermission(input.companyId, "view_websites");
  if (!access.ok) return access;

  const result = await verifyWebsiteDomain(input.websiteDomainId, input.companyId);
  if (!result.ok) {
    return { ok: false, error: result.error ?? "Verification failed." };
  }

  if (result.verified) {
    const supabase = await createClient();
    await supabase
      .from("connected_websites")
      .update({ status: "verified", updated_at: new Date().toISOString() })
      .eq("company_id", input.companyId);
  }

  const admin = tryCreateAdminClient();
  if (admin.ok) {
    const { data: domainRow } = await admin.client
      .from("website_domains")
      .select("domain, verification_status, website_id, connected_website_id")
      .eq("id", input.websiteDomainId)
      .eq("company_id", input.companyId)
      .maybeSingle();

    const websiteId =
      (domainRow?.website_id as string | null) ??
      (domainRow?.connected_website_id as string | null) ??
      (await getBuilderWebsiteForCompany(input.companyId))?.id ??
      null;

    if (websiteId && domainRow?.domain) {
      await syncDomainSettingsCustomDomain({
        websiteId,
        companyId: input.companyId,
        customDomain: domainRow.domain as string,
        customDomainStatus: result.verified
          ? "verified"
          : ((domainRow.verification_status as string) ?? "pending"),
      });
    }
  }

  revalidatePath(companyWebsiteDomainsPath(input.companySlug));
  revalidatePath(companyWebsiteBuilderSectionPath(input.companySlug, "domains"));

  if (!result.verified) {
    const { companyId, companySlug, websiteDomainId } = input;
    after(async () => {
      try {
        const autoResult = await runAutoDomainVerificationWithRetries(
          websiteDomainId,
          companyId
        );
        if (autoResult.verified) {
          revalidatePath(companyWebsiteDomainsPath(companySlug));
          revalidatePath(companyWebsiteBuilderSectionPath(companySlug, "domains"));
        }
      } catch (error) {
        console.error("[website-engine] auto-verify follow-up failed", websiteDomainId, error);
      }
    });
  }

  return { ok: true, verified: result.verified, hint: result.hint };
}

export async function rotateApiKeyAction(input: {
  companyId: string;
  companySlug: string;
}): Promise<ActionResultWithKey> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const access = await requireCompanyPermission(input.companyId, "view_websites");
  if (!access.ok) return access;

  const newKey = randomBytes(24).toString("hex");
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("connected_websites")
    .select("api_key")
    .eq("company_id", input.companyId)
    .maybeSingle();

  const { error } = await supabase.from("connected_websites").upsert(
    {
      company_id: input.companyId,
      type: "external",
      api_key: newKey,
      api_key_status: "active",
      status: "connected",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "company_id" }
  );

  if (error) {
    return { ok: false, error: error.message };
  }

  await recordApiKeyEvent({
    companyId: input.companyId,
    eventType: existing?.api_key ? "rotated" : "generated",
    keyPrefix: newKey.slice(0, 8),
  });

  revalidatePath(companyWebsiteApiKeysPath(input.companySlug));
  revalidatePath(companyWebsitesPath(input.companySlug));
  return { ok: true, apiKey: newKey };
}

export async function revokeApiKeyAction(input: {
  companyId: string;
  companySlug: string;
}): Promise<ActionResult> {
  const access = await requireCompanyPermission(input.companyId, "view_websites");
  if (!access.ok) return access;

  const supabase = await createClient();
  const { error } = await supabase
    .from("connected_websites")
    .update({
      api_key_status: "revoked",
      updated_at: new Date().toISOString(),
    })
    .eq("company_id", input.companyId);

  if (error) return { ok: false, error: error.message };

  await recordApiKeyEvent({
    companyId: input.companyId,
    eventType: "revoked",
  });

  revalidatePath(companyWebsiteApiKeysPath(input.companySlug));
  return { ok: true };
}

export async function registerExternalWebsiteAction(input: {
  companyId: string;
  companySlug: string;
  name: string;
  productionUrl: string;
}): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }

  const name = input.name.trim();
  const url = input.productionUrl.trim();
  if (!name) return { ok: false, error: "Website name is required." };
  if (!url) return { ok: false, error: "Production URL is required." };

  let normalized = url;
  if (!/^https?:\/\//i.test(normalized)) normalized = `https://${normalized}`;
  try {
    new URL(normalized);
  } catch {
    return { ok: false, error: "Enter a valid website URL." };
  }

  const access = await requireCompanyPermission(input.companyId, "view_websites");
  if (!access.ok) return access;

  const domain = normalizeDomain(normalized);
  const previewSubdomain = previewSubdomainForSlug(input.companySlug);

  const supabase = await createClient();
  const { error } = await supabase.from("connected_websites").upsert(
    {
      company_id: input.companyId,
      type: "external",
      name,
      production_url: normalized,
      primary_domain: domain,
      preview_subdomain: previewSubdomain,
      status: "connected",
      booking_enabled: true,
      tracking_enabled: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "company_id" }
  );

  if (error) return { ok: false, error: error.message };

  revalidatePath(companyWebsitesPath(input.companySlug));
  return { ok: true };
}

export async function updateWebsiteConnectionSettingsAction(input: {
  companyId: string;
  companySlug: string;
  bookingEnabled?: boolean;
  trackingEnabled?: boolean;
  seoEnabled?: boolean;
}): Promise<ActionResult> {
  const access = await requireCompanyPermission(input.companyId, "view_websites");
  if (!access.ok) return access;

  const supabase = await createClient();
  const patch: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (input.bookingEnabled !== undefined) patch.booking_enabled = input.bookingEnabled;
  if (input.trackingEnabled !== undefined) patch.tracking_enabled = input.trackingEnabled;
  if (input.seoEnabled !== undefined) patch.seo_enabled = input.seoEnabled;

  const { error } = await supabase
    .from("connected_websites")
    .update(patch)
    .eq("company_id", input.companyId);

  if (error) return { ok: false, error: error.message };

  revalidatePath(companyWebsitesPath(input.companySlug));
  return { ok: true };
}

export async function triggerWebsiteDeploymentAction(input: {
  companyId: string;
  companySlug: string;
  websiteId: string;
  environment?: "preview" | "production";
  hostingProvider?: string;
}): Promise<ActionResult> {
  const access = await requireCompanyPermission(input.companyId, "view_websites");
  if (!access.ok) return access;

  const provider = getHostingProvider(input.hostingProvider ?? getDefaultHostingProviderSlug());
  const projectResult = await provider.createProject({
    name: `faraios-${input.companySlug}`,
    companyId: input.companyId,
  });

  if (!projectResult.ok) {
    return { ok: false, error: projectResult.error };
  }

  const deployResult = await provider.deploySite({
    providerProjectId: projectResult.providerProjectId,
    environment: input.environment ?? "production",
  });

  if (!deployResult.ok) {
    return { ok: false, error: deployResult.error };
  }

  const admin = tryCreateAdminClient();
  if (!admin.ok) {
    return { ok: false, error: admin.error };
  }

  await admin.client.from("website_deployments").insert({
    company_id: input.companyId,
    website_id: input.websiteId,
    environment: input.environment ?? "production",
    status: deployResult.status,
    hosting_provider: provider.slug,
    provider_deployment_id: deployResult.providerDeploymentId,
    url: deployResult.url || null,
  });

  const supabase = await createClient();
  await supabase
    .from("websites")
    .update({
      hosting_provider: provider.slug,
      connection_status: deployResult.status === "live" ? "live" : "connected",
      updated_at: new Date().toISOString(),
    })
    .eq("id", input.websiteId)
    .eq("client_id", input.companyId);

  revalidatePath(companyWebsitesPath(input.companySlug));
  return { ok: true };
}
