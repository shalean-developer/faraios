"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import {
  clearPlatformWorkspaceSessionCookie,
  endPlatformWorkspaceSession,
  setPlatformWorkspaceSessionCookie,
  startPlatformWorkspaceSession,
} from "@/lib/platform/workspace-session";
import { platformWorkspaceRoot } from "@/lib/paths/workspace";
import { isCurrentUserPlatformAdmin } from "@/lib/services/admin";
import { getCompanyBySlug } from "@/lib/services/companies";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import type { WorkspaceGrantKey } from "@/types/platform-workspace";

export type WorkspaceSessionActionResult =
  | { ok: true }
  | { ok: false; error: string };

async function requirePlatformAdmin(): Promise<
  { ok: false; error: string } | null
> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }
  if (!(await isCurrentUserPlatformAdmin())) {
    return { ok: false, error: "Forbidden." };
  }
  return null;
}

export async function enterPlatformWorkspace(input: {
  companyId: string;
  companySlug: string;
  companyName: string;
  reason: string;
  grants?: WorkspaceGrantKey[];
  fullAccess?: boolean;
  supportTicketId?: string | null;
}): Promise<
  | { ok: true; redirectTo: string }
  | { ok: false; error: string }
> {
  const denied = await requirePlatformAdmin();
  if (denied) return denied;

  const result = await startPlatformWorkspaceSession(input);
  if (!result.ok) return result;

  await setPlatformWorkspaceSessionCookie(result.session.id);
  revalidatePath("/admin");
  revalidatePath("/admin/businesses");
  revalidatePath(platformWorkspaceRoot(input.companySlug));

  return { ok: true, redirectTo: platformWorkspaceRoot(input.companySlug) };
}

export async function enterPlatformWorkspaceAndRedirect(input: {
  companyId: string;
  companySlug: string;
  companyName: string;
  reason: string;
  grants?: WorkspaceGrantKey[];
  supportTicketId?: string | null;
}): Promise<WorkspaceSessionActionResult> {
  const result = await enterPlatformWorkspace(input);
  if (!result.ok) return result;
  redirect(result.redirectTo);
}

export async function enterPlatformWorkspaceBySlug(input: {
  slug: string;
  reason: string;
  grants?: WorkspaceGrantKey[];
}): Promise<
  | { ok: true; redirectTo: string }
  | { ok: false; error: string }
> {
  const denied = await requirePlatformAdmin();
  if (denied) return denied;

  const row = await getCompanyBySlug(input.slug);
  if (!row) {
    return { ok: false, error: "Business not found." };
  }

  return enterPlatformWorkspace({
    companyId: row.id,
    companySlug: row.slug,
    companyName: row.name,
    reason: input.reason,
    grants: input.grants,
  });
}

export async function exitPlatformWorkspace(): Promise<WorkspaceSessionActionResult> {
  const denied = await requirePlatformAdmin();
  if (denied) return denied;

  const result = await endPlatformWorkspaceSession();
  if (!result.ok) return result;

  await clearPlatformWorkspaceSessionCookie();
  revalidatePath("/admin");

  redirect("/admin");
}

export async function exitPlatformWorkspaceAction(): Promise<WorkspaceSessionActionResult> {
  const denied = await requirePlatformAdmin();
  if (denied) return denied;

  const result = await endPlatformWorkspaceSession();
  if (!result.ok) return result;

  await clearPlatformWorkspaceSessionCookie();
  revalidatePath("/admin");
  return { ok: true };
}
