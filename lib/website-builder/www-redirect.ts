import type { SupabaseClient } from "@supabase/supabase-js";

export type WwwRedirectMode = "none" | "www_to_apex" | "apex_to_www";

export const WWW_REDIRECT_OPTIONS: {
  value: WwwRedirectMode;
  label: string;
  description: string;
}[] = [
  {
    value: "none",
    label: "No redirect",
    description: "Serve both www and non-www separately.",
  },
  {
    value: "www_to_apex",
    label: "Redirect www to non-www",
    description: "Example: www.example.com → example.com",
  },
  {
    value: "apex_to_www",
    label: "Redirect non-www to www",
    description: "Example: example.com → www.example.com",
  },
];

export function normalizeWwwRedirectMode(value: string | null | undefined): WwwRedirectMode {
  if (value === "www_to_apex" || value === "apex_to_www") return value;
  return "none";
}

export function parseDomainHosts(domain: string): { apex: string; www: string } {
  const apex = domain.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/^www\./, "");
  return { apex, www: `www.${apex}` };
}

export function hostsMatchDomain(requestHost: string, baseDomain: string): boolean {
  const host = requestHost.toLowerCase().split(":")[0];
  const { apex, www } = parseDomainHosts(baseDomain);
  return host === apex || host === www;
}

/** Returns the canonical host to redirect to, or null when no redirect applies. */
export function buildWwwRedirectTargetHost(
  requestHost: string,
  mode: WwwRedirectMode,
  baseDomain: string
): string | null {
  if (mode === "none" || !baseDomain.trim()) return null;

  const host = requestHost.toLowerCase().split(":")[0];
  const { apex, www } = parseDomainHosts(baseDomain);

  if (!hostsMatchDomain(host, baseDomain)) return null;

  if (mode === "www_to_apex" && host === www) {
    return apex;
  }

  if (mode === "apex_to_www" && host === apex) {
    return www;
  }

  return null;
}

export function describeWwwRedirect(mode: WwwRedirectMode, baseDomain: string | null): string {
  if (!baseDomain || mode === "none") {
    return "Choose how www and non-www visitors are routed once your custom domain is connected.";
  }

  const { apex, www } = parseDomainHosts(baseDomain);
  if (mode === "www_to_apex") {
    return `Visitors to ${www} are redirected to ${apex}.`;
  }
  if (mode === "apex_to_www") {
    return `Visitors to ${apex} are redirected to ${www}.`;
  }
  return `Both ${apex} and ${www} load without redirecting.`;
}

type DomainSettingsRow = {
  www_redirect: string | null;
  custom_domain: string | null;
};

async function loadDomainSettings(
  supabase: SupabaseClient,
  filter: { websiteId?: string | null; companyId?: string | null }
): Promise<DomainSettingsRow | null> {
  if (filter.websiteId) {
    const { data } = await supabase
      .from("domain_settings")
      .select("www_redirect, custom_domain")
      .eq("website_id", filter.websiteId)
      .maybeSingle();
    if (data) return data as DomainSettingsRow;
  }

  if (filter.companyId) {
    const { data } = await supabase
      .from("domain_settings")
      .select("www_redirect, custom_domain")
      .eq("company_id", filter.companyId)
      .maybeSingle();
    if (data) return data as DomainSettingsRow;
  }

  return null;
}

export async function resolveWwwRedirectForHost(
  hostHeader: string,
  supabase: SupabaseClient
): Promise<{ targetHost: string } | null> {
  const host = hostHeader.toLowerCase().split(":")[0];
  if (!host) return null;

  const { apex, www } = parseDomainHosts(host);

  const { data: domainRow } = await supabase
    .from("website_domains")
    .select("domain, company_id, website_id")
    .or(`domain.eq.${apex},domain.eq.${www}`)
    .order("is_primary", { ascending: false })
    .limit(1)
    .maybeSingle();

  let settings =
    (await loadDomainSettings(supabase, {
      websiteId: domainRow?.website_id as string | null,
      companyId: domainRow?.company_id as string | null,
    })) ?? null;

  if (!settings) {
    const { data } = await supabase
      .from("domain_settings")
      .select("www_redirect, custom_domain")
      .or(`custom_domain.eq.${apex},custom_domain.eq.${www}`)
      .maybeSingle();
    settings = (data as DomainSettingsRow | null) ?? null;
  }

  const mode = normalizeWwwRedirectMode(settings?.www_redirect);
  if (mode === "none") return null;

  const baseDomain =
    settings?.custom_domain ??
    (domainRow?.domain as string | undefined) ??
    apex;

  const targetHost = buildWwwRedirectTargetHost(host, mode, baseDomain);
  if (!targetHost) return null;

  return { targetHost };
}
