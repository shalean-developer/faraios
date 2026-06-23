import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";

export async function logCompanyActivity(input: {
  companyId: string;
  userId?: string | null;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return;
  await admin.client.from("company_activity_logs").insert({
    company_id: input.companyId,
    user_id: input.userId ?? null,
    action: input.action,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
    metadata: input.metadata ?? {},
  });
}

export type ActivityLogEntry = {
  id: string;
  action: string;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  userId: string | null;
};

export async function listCompanyActivity(
  companyId: string,
  limit = 50
): Promise<ActivityLogEntry[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("company_activity_logs")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((row) => ({
    id: row.id,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: row.created_at,
    userId: row.user_id,
  }));
}
