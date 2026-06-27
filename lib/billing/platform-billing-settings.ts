import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";

const DEFAULT_WORKSPACE_SETUP_FEE_ENABLED = true;

export async function getWorkspaceSetupFeeEnabled(): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return DEFAULT_WORKSPACE_SETUP_FEE_ENABLED;
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("platform_settings")
      .select("workspace_setup_fee_enabled")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      if (
        error.message.includes("workspace_setup_fee_enabled") ||
        error.message.includes("schema cache")
      ) {
        return DEFAULT_WORKSPACE_SETUP_FEE_ENABLED;
      }
      console.error("[billing] getWorkspaceSetupFeeEnabled", error.message);
      return DEFAULT_WORKSPACE_SETUP_FEE_ENABLED;
    }

    return data?.workspace_setup_fee_enabled !== false;
  } catch (error) {
    console.error("[billing] getWorkspaceSetupFeeEnabled", error);
    return DEFAULT_WORKSPACE_SETUP_FEE_ENABLED;
  }
}

export async function setWorkspaceSetupFeeEnabled(
  enabled: boolean
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Database is not configured." };
  }

  const admin = createAdminClient();
  const { error } = await admin
    .from("platform_settings")
    .upsert(
      {
        id: 1,
        workspace_setup_fee_enabled: enabled,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );

  if (error) {
    if (
      error.message.includes("workspace_setup_fee_enabled") ||
      error.message.includes("schema cache")
    ) {
      return {
        ok: false,
        error: "Run the latest database migrations to enable setup fee settings.",
      };
    }
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
