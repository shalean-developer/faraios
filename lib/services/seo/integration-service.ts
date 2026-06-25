import { tryCreateAdminClient } from "@/lib/supabase/admin";
import type { SeoIntegration } from "@/types/seo-v10";
import { INTEGRATION_PROVIDER_META } from "./integration-constants";

export async function ensureIntegrationSlots(
  companyId: string,
  projectId: string
): Promise<SeoIntegration[]> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return [];

  for (const p of INTEGRATION_PROVIDER_META) {
    await admin.client.from("seo_integrations").upsert(
      {
        company_id: companyId,
        project_id: projectId,
        provider: p.provider,
        status: "disconnected",
      },
      { onConflict: "company_id,provider" }
    );
  }

  const { data } = await admin.client
    .from("seo_integrations")
    .select("*")
    .eq("company_id", companyId);

  return (data ?? []).map(mapIntegration);
}

function mapIntegration(row: Record<string, unknown>): SeoIntegration {
  return {
    id: row.id as string,
    company_id: row.company_id as string,
    project_id: (row.project_id as string) ?? null,
    provider: row.provider as SeoIntegration["provider"],
    status: row.status as SeoIntegration["status"],
    config: (row.config as Record<string, unknown>) ?? {},
    connected_at: (row.connected_at as string) ?? null,
    last_synced_at: (row.last_synced_at as string) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}
