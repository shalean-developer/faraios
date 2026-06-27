import { cookies, headers } from "next/headers";

import { PLATFORM_WORKSPACE_COOKIE } from "@/lib/constants/workspace-session";
import { logPlatformAuditEvent } from "@/lib/platform/audit-log";
import { isCurrentUserPlatformAdmin } from "@/lib/services/admin";
import {
  clampWorkspaceGrantsToRole,
  getPlatformAdminRoleForUser,
  parseSessionGrantValues,
  permissionsFromSessionGrants,
  sessionGrantValues,
} from "@/lib/services/platform-admin-roles";
import { getPlatformRoleDefinition } from "@/lib/platform/platform-role-definitions";
import { normalizeWorkspaceGrants } from "@/lib/platform/workspace-grants";
import type { PermissionKey } from "@/lib/permissions/shared";
import { tryCreateAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/public-env";
import { createClient } from "@/lib/supabase/server";
import type {
  PlatformWorkspaceSession,
  WorkspaceGrantKey,
} from "@/types/platform-workspace";

type SessionRow = {
  id: string;
  platform_user_id: string;
  company_id: string;
  company_slug: string;
  reason: string;
  permissions_granted: string[] | null;
  started_at: string;
  last_activity_at: string;
  ended_at: string | null;
  companies?: { name?: string | null } | { name?: string | null }[] | null;
};

function companyNameFromRow(row: SessionRow): string {
  const companies = row.companies;
  if (!companies) return row.company_slug;
  if (Array.isArray(companies)) return companies[0]?.name ?? row.company_slug;
  return companies.name ?? row.company_slug;
}

function mapSessionRow(
  row: SessionRow,
  role?: { id: string; label: string }
): PlatformWorkspaceSession {
  const parsed = parseSessionGrantValues(row.permissions_granted);
  return {
    id: row.id,
    platformUserId: row.platform_user_id,
    companyId: row.company_id,
    companySlug: row.company_slug,
    companyName: companyNameFromRow(row),
    reason: row.reason,
    permissionsGranted: parsed.grants,
    fullAccess: parsed.fullAccess,
    platformRoleId: role?.id ?? "platform_admin",
    platformRoleLabel: role?.label ?? "Platform Admin",
    startedAt: row.started_at,
    lastActivityAt: row.last_activity_at,
  };
}

async function getRequestMeta(): Promise<{ ipAddress: string | null; userAgent: string | null }> {
  const headerStore = await headers();
  const forwarded = headerStore.get("x-forwarded-for");
  const ipAddress = forwarded?.split(",")[0]?.trim() ?? headerStore.get("x-real-ip");
  return {
    ipAddress: ipAddress ?? null,
    userAgent: headerStore.get("user-agent"),
  };
}

export async function getPlatformWorkspaceSessionIdFromCookie(): Promise<string | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(PLATFORM_WORKSPACE_COOKIE)?.value?.trim();
  return value || null;
}

export async function getActivePlatformWorkspaceSession(): Promise<PlatformWorkspaceSession | null> {
  if (!isSupabaseConfigured()) return null;
  if (!(await isCurrentUserPlatformAdmin())) return null;

  const sessionId = await getPlatformWorkspaceSessionIdFromCookie();
  if (!sessionId) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const admin = tryCreateAdminClient();
  if (!admin.ok) return null;

  const { data, error } = await admin.client
    .from("platform_workspace_sessions")
    .select(
      "id, platform_user_id, company_id, company_slug, reason, permissions_granted, started_at, last_activity_at, ended_at, companies(name)"
    )
    .eq("id", sessionId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  const row = data as SessionRow;
  if (row.ended_at || row.platform_user_id !== user.id) {
    return null;
  }

  const platformRole = await getPlatformAdminRoleForUser(user.id);
  return mapSessionRow(row, {
    id: platformRole.id,
    label: platformRole.label,
  });
}

export async function getActivePlatformWorkspaceSessionForSlug(
  slug: string
): Promise<PlatformWorkspaceSession | null> {
  const session = await getActivePlatformWorkspaceSession();
  if (!session) return null;
  if (session.companySlug !== slug) return null;
  return session;
}

export async function getPlatformWorkspacePermissions(
  session: PlatformWorkspaceSession | null
): Promise<PermissionKey[]> {
  if (!session) return [];
  return permissionsFromSessionGrants({
    grants: session.permissionsGranted,
    fullAccess: session.fullAccess,
  });
}

export async function touchPlatformWorkspaceSession(sessionId: string): Promise<void> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return;

  await admin.client
    .from("platform_workspace_sessions")
    .update({
      last_activity_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .is("ended_at", null);
}

export async function endOtherPlatformWorkspaceSessions(userId: string): Promise<void> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return;

  await admin.client
    .from("platform_workspace_sessions")
    .update({ ended_at: new Date().toISOString() })
    .eq("platform_user_id", userId)
    .is("ended_at", null);
}

export type StartPlatformWorkspaceSessionInput = {
  companyId: string;
  companySlug: string;
  companyName: string;
  reason: string;
  grants?: WorkspaceGrantKey[];
  fullAccess?: boolean;
  supportTicketId?: string | null;
};

export async function startPlatformWorkspaceSession(
  input: StartPlatformWorkspaceSessionInput
): Promise<{ ok: true; session: PlatformWorkspaceSession } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }
  if (!(await isCurrentUserPlatformAdmin())) {
    return { ok: false, error: "Forbidden." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not signed in." };
  }

  const reason = input.reason.trim();
  if (reason.length < 3) {
    return { ok: false, error: "Please provide a reason for entering this workspace." };
  }

  const admin = tryCreateAdminClient();
  if (!admin.ok) {
    return { ok: false, error: "Admin client unavailable." };
  }

  const platformRole = await getPlatformAdminRoleForUser(user.id);
  const roleDefinition = getPlatformRoleDefinition(platformRole.id);
  const requestedGrants =
    input.grants && input.grants.length > 0
      ? normalizeWorkspaceGrants(input.grants)
      : roleDefinition.defaultGrants.filter((grant) =>
          platformRole.allowedGrants.includes(grant)
        );

  const resolved = clampWorkspaceGrantsToRole(platformRole, requestedGrants, {
    fullAccess: input.fullAccess,
  });

  if (resolved.grants.length === 0 && !resolved.fullAccess) {
    return { ok: false, error: "Select at least one workspace permission." };
  }

  const grantsToStore = sessionGrantValues({
    grants: resolved.grants,
    fullAccess: resolved.fullAccess,
  });

  const { ipAddress, userAgent } = await getRequestMeta();

  await endOtherPlatformWorkspaceSessions(user.id);

  const { data, error } = await admin.client
    .from("platform_workspace_sessions")
    .insert({
      platform_user_id: user.id,
      company_id: input.companyId,
      company_slug: input.companySlug,
      reason,
      permissions_granted: grantsToStore,
      ip_address: ipAddress,
      user_agent: userAgent,
      support_ticket_id: input.supportTicketId ?? null,
    })
    .select(
      "id, platform_user_id, company_id, company_slug, reason, permissions_granted, started_at, last_activity_at, ended_at"
    )
    .single();

  if (error || !data) {
    console.error("[workspace] startPlatformWorkspaceSession", error?.message);
    return { ok: false, error: "Could not start workspace session." };
  }

  const session: PlatformWorkspaceSession = {
    ...mapSessionRow(data as SessionRow, {
      id: platformRole.id,
      label: platformRole.label,
    }),
    companyName: input.companyName,
  };

  await logPlatformAuditEvent({
    action: "workspace.enter",
    targetType: "company",
    targetId: input.companyId,
    targetLabel: input.companyName,
    companyId: input.companyId,
    sessionId: session.id,
    ipAddress,
    metadata: {
      reason,
      grants: resolved.grants,
      fullAccess: resolved.fullAccess,
      platformRoleId: platformRole.id,
      companySlug: input.companySlug,
      supportTicketId: input.supportTicketId ?? null,
    },
  });

  return { ok: true, session };
}

export async function endPlatformWorkspaceSession(
  sessionId?: string | null
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "Supabase is not configured." };
  }
  if (!(await isCurrentUserPlatformAdmin())) {
    return { ok: false, error: "Forbidden." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, error: "Not signed in." };
  }

  const admin = tryCreateAdminClient();
  if (!admin.ok) {
    return { ok: false, error: "Admin client unavailable." };
  }

  const resolvedSessionId =
    sessionId?.trim() || (await getPlatformWorkspaceSessionIdFromCookie());
  if (!resolvedSessionId) {
    return { ok: true };
  }

  const { data: existing } = await admin.client
    .from("platform_workspace_sessions")
    .select("id, company_id, company_slug, reason, started_at, ended_at, companies(name)")
    .eq("id", resolvedSessionId)
    .eq("platform_user_id", user.id)
    .maybeSingle();

  if (!existing || (existing as SessionRow).ended_at) {
    return { ok: true };
  }

  const endedAt = new Date().toISOString();
  const { error } = await admin.client
    .from("platform_workspace_sessions")
    .update({ ended_at: endedAt })
    .eq("id", resolvedSessionId)
    .eq("platform_user_id", user.id);

  if (error) {
    console.error("[workspace] endPlatformWorkspaceSession", error.message);
    return { ok: false, error: "Could not end workspace session." };
  }

  const row = existing as SessionRow;
  const startedAt = new Date(row.started_at).getTime();
  const durationMs = Math.max(0, Date.now() - startedAt);
  const { ipAddress } = await getRequestMeta();

  await logPlatformAuditEvent({
    action: "workspace.exit",
    targetType: "company",
    targetId: row.company_id,
    targetLabel: companyNameFromRow(row),
    companyId: row.company_id,
    sessionId: resolvedSessionId,
    ipAddress,
    metadata: {
      reason: row.reason,
      companySlug: row.company_slug,
      durationMs,
      endedAt,
    },
  });

  return { ok: true };
}

/** Returns true when the user has an active platform workspace session for the slug. */
export async function userHasActivePlatformWorkspaceAccess(
  userId: string,
  companySlug: string
): Promise<boolean> {
  if (!isSupabaseConfigured() || !userId || !companySlug) return false;

  const admin = tryCreateAdminClient();
  if (!admin.ok) return false;

  const { data, error } = await admin.client
    .from("platform_workspace_sessions")
    .select("id")
    .eq("platform_user_id", userId)
    .eq("company_slug", companySlug)
    .is("ended_at", null)
    .maybeSingle();

  if (error) {
    console.error("[workspace] userHasActivePlatformWorkspaceAccess", error.message);
    return false;
  }

  return Boolean(data?.id);
}

/** Resolve an active workspace session id to its company slug. */
export async function getPlatformWorkspaceSessionById(
  sessionId: string,
  userId: string
): Promise<{ companySlug: string } | null> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return null;

  const { data } = await admin.client
    .from("platform_workspace_sessions")
    .select("company_slug, platform_user_id, ended_at")
    .eq("id", sessionId)
    .maybeSingle();

  if (!data) return null;
  if (data.ended_at || data.platform_user_id !== userId) return null;
  return { companySlug: data.company_slug as string };
}

export async function setPlatformWorkspaceSessionCookie(
  sessionId: string
): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(PLATFORM_WORKSPACE_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function clearPlatformWorkspaceSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(PLATFORM_WORKSPACE_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}
