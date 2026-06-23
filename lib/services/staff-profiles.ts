import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import type { StaffProfile } from "@/types/v6-engine";

export async function listStaffProfiles(companyId: string): Promise<StaffProfile[]> {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("staff_profiles")
    .select("*")
    .eq("company_id", companyId);
  return (data ?? []).map((row) => ({
    id: row.id,
    companyId: row.company_id,
    userId: row.user_id,
    displayName: row.display_name,
    phone: row.phone,
    skills: row.skills ?? [],
    availability: (row.availability as Record<string, unknown>) ?? {},
    bio: row.bio,
  }));
}

export async function upsertStaffProfile(input: {
  companyId: string;
  userId: string;
  displayName?: string;
  phone?: string;
  skills?: string[];
  availability?: Record<string, unknown>;
  bio?: string;
}): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Not configured." };
  const supabase = await createClient();
  const { error } = await supabase.from("staff_profiles").upsert(
    {
      company_id: input.companyId,
      user_id: input.userId,
      display_name: input.displayName ?? null,
      phone: input.phone ?? null,
      skills: input.skills ?? [],
      availability: input.availability ?? {},
      bio: input.bio ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "company_id,user_id" }
  );
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function getStaffAssignedJobs(companyId: string, userId: string) {
  if (!isSupabaseConfigured()) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("bookings")
    .select("id, service, status, scheduled_at, customer_name")
    .eq("company_id", companyId)
    .eq("assigned_staff_id", userId)
    .in("status", ["pending", "confirmed"])
    .order("scheduled_at", { ascending: true });
  return data ?? [];
}
