import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type PlatformAuditInput = {
  action: string;
  targetType: string;
  targetId?: string | null;
  targetLabel?: string | null;
  metadata?: Record<string, unknown>;
  actorUserId?: string | null;
  actorEmail?: string | null;
  companyId?: string | null;
  sessionId?: string | null;
  ipAddress?: string | null;
};

export async function logPlatformAuditEvent(input: PlatformAuditInput): Promise<void> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return;

  let actorUserId = input.actorUserId ?? null;
  let actorEmail = input.actorEmail ?? null;

  if (!actorUserId && !actorEmail) {
    try {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      actorUserId = user?.id ?? null;
      actorEmail = user?.email ?? null;
    } catch {
      // Best-effort audit logging only.
    }
  }

  await admin.client.from("platform_audit_logs").insert({
    actor_user_id: actorUserId,
    actor_email: actorEmail,
    action: input.action,
    target_type: input.targetType,
    target_id: input.targetId ?? null,
    target_label: input.targetLabel ?? null,
    metadata: input.metadata ?? {},
    company_id: input.companyId ?? null,
    session_id: input.sessionId ?? null,
    ip_address: input.ipAddress ?? null,
  });
}
