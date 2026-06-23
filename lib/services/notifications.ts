import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import type { CompanyNotification } from "@/types/v6-engine";

function mapNotification(row: Record<string, unknown>): CompanyNotification {
  return {
    id: row.id as string,
    companyId: row.company_id as string,
    userId: row.user_id as string | null,
    type: row.type as string,
    title: row.title as string,
    body: row.body as string | null,
    entityType: row.entity_type as string | null,
    entityId: row.entity_id as string | null,
    readAt: row.read_at as string | null,
    createdAt: row.created_at as string,
  };
}

export async function listNotifications(
  companyId: string,
  userId: string,
  limit = 100
): Promise<CompanyNotification[]> {
  if (!isSupabaseConfigured() || !companyId) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("company_notifications")
    .select("*")
    .eq("company_id", companyId)
    .or(`user_id.is.null,user_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[notifications] listNotifications", error.message);
    return [];
  }
  return (data ?? []).map(mapNotification);
}

export type NotificationListSummary = {
  total: number;
  unread: number;
};

export function summarizeNotifications(
  notifications: CompanyNotification[]
): NotificationListSummary {
  let unread = 0;
  for (const notification of notifications) {
    if (!notification.readAt) unread += 1;
  }
  return { total: notifications.length, unread };
}

export async function getUnreadCount(companyId: string, userId: string): Promise<number> {
  if (!isSupabaseConfigured()) return 0;
  const supabase = await createClient();
  const { count } = await supabase
    .from("company_notifications")
    .select("id", { count: "exact", head: true })
    .eq("company_id", companyId)
    .or(`user_id.is.null,user_id.eq.${userId}`)
    .is("read_at", null);
  return count ?? 0;
}

export async function createNotification(input: {
  companyId: string;
  userId?: string | null;
  type: string;
  title: string;
  body?: string;
  entityType?: string;
  entityId?: string;
}): Promise<void> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return;
  await admin.client.from("company_notifications").insert({
    company_id: input.companyId,
    user_id: input.userId ?? null,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    entity_type: input.entityType ?? null,
    entity_id: input.entityId ?? null,
  });
}

export async function markNotificationRead(
  notificationId: string,
  companyId: string
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Not configured." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("company_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("company_id", companyId);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function markAllNotificationsRead(
  companyId: string,
  userId: string
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Not configured." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("company_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("company_id", companyId)
    .or(`user_id.is.null,user_id.eq.${userId}`)
    .is("read_at", null);
  return error ? { ok: false, error: error.message } : { ok: true };
}
