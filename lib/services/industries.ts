import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import type { Industry } from "@/types/database";

export async function listIndustries(): Promise<Industry[]> {
  if (!isSupabaseConfigured()) {
    console.warn(
      "[industries] Missing NEXT_PUBLIC_SUPABASE_URL or a public key (NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)"
    );
    return [];
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("industries")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    console.error("[industries] listIndustries", error.message);
    return [];
  }

  return (data ?? []) as Industry[];
}

export async function getIndustryById(
  id: string
): Promise<Industry | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("industries")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("[industries] getIndustryById", error.message);
    return null;
  }

  return data as Industry | null;
}
