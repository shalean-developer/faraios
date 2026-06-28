import { previewSubdomainForSlug } from "@/lib/constants/tenant-domain";
import { getFaraiosVercelConfig } from "@/lib/hosting/constants";
import { vercelHostingProvider } from "@/lib/hosting/providers/vercel";
import { slugifyBusinessName } from "@/lib/slug";
import { tryCreateAdminClient } from "@/lib/supabase/admin";

export type EnsureTenantSubdomainResult =
  | { ok: true; domain: string }
  | { ok: true; skipped: true; reason: "no_subdomain" | "vercel_not_configured" }
  | { ok: false; error: string };

function isDuplicateDomainError(message: string): boolean {
  return /already|exist|configured/i.test(message);
}

/**
 * Registers `{subdomain}.faraios.com` on the FaraiOS Vercel project so HTTPS works
 * when DNS stays on Allanux (wildcard CNAME → cname.vercel-dns.com).
 * No-op when VERCEL_TOKEN / FARAIOS_VERCEL_PROJECT_ID are unset.
 */
export async function ensureTenantSubdomainOnVercel(
  subdomain: string | null | undefined
): Promise<EnsureTenantSubdomainResult> {
  const slug = subdomain?.trim();
  if (!slug) {
    return { ok: true, skipped: true, reason: "no_subdomain" };
  }

  const config = getFaraiosVercelConfig();
  if (!config) {
    return { ok: true, skipped: true, reason: "vercel_not_configured" };
  }

  const domain = previewSubdomainForSlug(slug);
  const result = await vercelHostingProvider.connectDomain({
    providerProjectId: config.projectId,
    domain,
  });

  if (!result.ok) {
    if (isDuplicateDomainError(result.error)) {
      return { ok: true, domain };
    }
    return { ok: false, error: result.error };
  }

  return { ok: true, domain };
}

function normalizeTenantSubdomainSlug(raw: string): string {
  return slugifyBusinessName(raw).slice(0, 48);
}

export type RenameTenantSubdomainResult =
  | {
      ok: true;
      subdomain: string;
      previousSubdomain: string | null;
      host: string;
      vercel: EnsureTenantSubdomainResult | { ok: true; skipped: true; reason: "vercel_not_configured" };
    }
  | { ok: false; error: string };

/** Updates websites.subdomain and registers the new host on Vercel when configured. */
export async function renameWebsiteTenantSubdomain(
  websiteId: string,
  newSubdomain: string
): Promise<RenameTenantSubdomainResult> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) {
    return { ok: false, error: admin.error };
  }

  const slug = normalizeTenantSubdomainSlug(newSubdomain);
  if (!slug) {
    return { ok: false, error: "Subdomain is required." };
  }

  const supabase = admin.client;
  const { data: website, error: websiteError } = await supabase
    .from("websites")
    .select("id, client_id, subdomain")
    .eq("id", websiteId)
    .maybeSingle();

  if (websiteError || !website) {
    return { ok: false, error: websiteError?.message ?? "Website not found." };
  }

  const previousSubdomain = (website.subdomain as string | null) ?? null;
  if (previousSubdomain?.toLowerCase() === slug) {
    const host = previewSubdomainForSlug(slug);
    const vercelResult = await ensureTenantSubdomainOnVercel(slug);
    return {
      ok: true,
      subdomain: slug,
      previousSubdomain,
      host,
      vercel: vercelResult,
    };
  }

  const { data: conflict } = await supabase
    .from("websites")
    .select("id")
    .ilike("subdomain", slug)
    .neq("id", websiteId)
    .maybeSingle();

  if (conflict) {
    return { ok: false, error: `Subdomain "${slug}" is already in use.` };
  }

  const { error: updateError } = await supabase
    .from("websites")
    .update({ subdomain: slug })
    .eq("id", websiteId);

  if (updateError) {
    return { ok: false, error: updateError.message };
  }

  const host = previewSubdomainForSlug(slug);
  const companyId = website.client_id as string;

  await supabase
    .from("connected_websites")
    .update({ preview_subdomain: host, updated_at: new Date().toISOString() })
    .eq("website_id", websiteId);

  await supabase
    .from("domain_settings")
    .update({ requested_subdomain: slug, updated_at: new Date().toISOString() })
    .eq("website_id", websiteId);

  if (previousSubdomain) {
    await supabase
      .from("hosting_subscriptions")
      .update({ subdomain: slug, updated_at: new Date().toISOString() })
      .eq("company_id", companyId)
      .ilike("subdomain", previousSubdomain);
  }

  const vercelResult = await ensureTenantSubdomainOnVercel(slug);

  const vercelConfig = getFaraiosVercelConfig();
  if (vercelConfig && previousSubdomain) {
    await vercelHostingProvider.removeDomain({
      providerProjectId: vercelConfig.projectId,
      providerDomainId: previewSubdomainForSlug(previousSubdomain),
    });
  }

  return {
    ok: true,
    subdomain: slug,
    previousSubdomain,
    host,
    vercel: vercelResult,
  };
}
