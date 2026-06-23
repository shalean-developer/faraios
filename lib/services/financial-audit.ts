import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function logFinancialAudit(input: {
  companyId: string;
  entityType: "quote" | "invoice" | "payment";
  entityId: string;
  action: string;
  actorId?: string | null;
  metadata?: Record<string, unknown>;
  useAdmin?: boolean;
}): Promise<void> {
  const row = {
    company_id: input.companyId,
    entity_type: input.entityType,
    entity_id: input.entityId,
    action: input.action,
    actor_id: input.actorId ?? null,
    metadata: input.metadata ?? {},
  };

  if (input.useAdmin) {
    const admin = tryCreateAdminClient();
    if (!admin.ok) return;
    await admin.client.from("financial_audit_logs").insert(row);
    return;
  }

  const supabase = await createClient();
  await supabase.from("financial_audit_logs").insert(row);
}
