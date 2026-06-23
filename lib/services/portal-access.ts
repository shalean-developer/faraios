import { tryCreateAdminClient } from "@/lib/supabase/admin";

export type PortalTokenContext = {
  token: string;
  companyId: string;
  customerId: string;
  customerName: string;
  customerEmail: string | null;
  companyName: string;
  companySlug: string;
};

export async function getOrCreatePortalToken(
  companyId: string,
  customerId: string
): Promise<string | null> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return null;

  const { data: existing } = await admin.client
    .from("customer_portal_tokens")
    .select("token")
    .eq("company_id", companyId)
    .eq("customer_id", customerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing?.token) return existing.token;

  const { data: created, error } = await admin.client
    .from("customer_portal_tokens")
    .insert({ company_id: companyId, customer_id: customerId })
    .select("token")
    .single();

  if (error || !created) return null;
  return created.token;
}

export async function resolvePortalToken(
  token: string
): Promise<PortalTokenContext | null> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return null;

  const { data } = await admin.client
    .from("customer_portal_tokens")
    .select(
      "token, company_id, customer_id, expires_at, customers(name, email), companies(name, slug)"
    )
    .eq("token", token)
    .maybeSingle();

  if (!data) return null;
  if (data.expires_at && new Date(data.expires_at) < new Date()) return null;

  const customer = data.customers as unknown as { name: string; email: string | null } | null;
  const company = data.companies as unknown as { name: string; slug: string } | null;
  if (!customer || !company) return null;

  return {
    token: data.token,
    companyId: data.company_id,
    customerId: data.customer_id,
    customerName: customer.name,
    customerEmail: customer.email,
    companyName: company.name,
    companySlug: company.slug,
  };
}

export function portalUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? process.env.NEXT_PUBLIC_SITE_URL ?? "";
  return `${base.replace(/\/$/, "")}/portal/${token}`;
}
