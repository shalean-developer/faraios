import { tryCreateAdminClient } from "@/lib/supabase/admin";
import type { Lead, LeadType } from "@/types/growth-engine";

export type CreateLeadInput = {
  companyId: string;
  name?: string;
  email?: string;
  phone?: string;
  message?: string;
  leadType?: LeadType;
  source?: string;
  sourceWebsite?: string;
  referrer?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  landingPage?: string;
  conversionPage?: string;
};

function mapRow(row: Record<string, unknown>): Lead {
  return {
    id: row.id as string,
    company_id: row.company_id as string,
    name: (row.name as string) ?? null,
    email: (row.email as string) ?? null,
    phone: (row.phone as string) ?? null,
    message: (row.message as string) ?? null,
    lead_type: row.lead_type as Lead["lead_type"],
    source: (row.source as string) ?? null,
    source_website: (row.source_website as string) ?? null,
    referrer: (row.referrer as string) ?? null,
    utm_source: (row.utm_source as string) ?? null,
    utm_medium: (row.utm_medium as string) ?? null,
    utm_campaign: (row.utm_campaign as string) ?? null,
    landing_page: (row.landing_page as string) ?? null,
    conversion_page: (row.conversion_page as string) ?? null,
    status: row.status as Lead["status"],
    customer_id: (row.customer_id as string) ?? null,
    created_at: row.created_at as string,
  };
}

export async function createLead(
  input: CreateLeadInput
): Promise<{ ok: true; leadId: string } | { ok: false; error: string }> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: "API not configured." };

  const { data, error } = await admin.client
    .from("leads")
    .insert({
      company_id: input.companyId,
      name: input.name ?? null,
      email: input.email ?? null,
      phone: input.phone ?? null,
      message: input.message ?? null,
      lead_type: input.leadType ?? "contact",
      source: input.source ?? "website",
      source_website: input.sourceWebsite ?? null,
      referrer: input.referrer ?? null,
      utm_source: input.utmSource ?? null,
      utm_medium: input.utmMedium ?? null,
      utm_campaign: input.utmCampaign ?? null,
      landing_page: input.landingPage ?? null,
      conversion_page: input.conversionPage ?? null,
      status: "new",
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false, error: error?.message ?? "Failed to create lead." };
  return { ok: true, leadId: data.id as string };
}

export async function listLeads(companyId: string, limit = 50): Promise<Lead[]> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return [];

  const { data } = await admin.client
    .from("leads")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map(mapRow);
}

export async function updateLeadStatus(
  companyId: string,
  leadId: string,
  status: Lead["status"]
): Promise<{ ok: true } | { ok: false; error: string }> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return { ok: false, error: "Not configured." };

  const { error } = await admin.client
    .from("leads")
    .update({ status })
    .eq("id", leadId)
    .eq("company_id", companyId);

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
