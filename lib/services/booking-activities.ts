import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";

export type BookingActivity = {
  id: string;
  booking_id: string;
  company_id: string;
  actor_user_id: string | null;
  event_type: string;
  message: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

export async function listBookingActivities(
  companyId: string,
  bookingId: string
): Promise<BookingActivity[]> {
  if (!isSupabaseConfigured() || !companyId || !bookingId) return [];

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("booking_activities")
    .select("*")
    .eq("company_id", companyId)
    .eq("booking_id", bookingId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[booking_activities] listBookingActivities", error.message);
    return [];
  }

  return (data ?? []) as BookingActivity[];
}

export async function logBookingActivity(input: {
  companyId: string;
  bookingId: string;
  eventType: "created" | "status_changed" | "staff_assigned" | "note_updated";
  message: string;
  actorUserId?: string | null;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return;

  const { error } = await admin.client.from("booking_activities").insert({
    company_id: input.companyId,
    booking_id: input.bookingId,
    actor_user_id: input.actorUserId ?? null,
    event_type: input.eventType,
    message: input.message,
    metadata: input.metadata ?? {},
  });

  if (error) {
    console.error("[booking_activities] logBookingActivity", error.message);
  }
}
