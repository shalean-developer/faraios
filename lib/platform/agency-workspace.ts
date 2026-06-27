import {
  AGENCY_WORKSPACE_GRANT_KEYS,
  AGENCY_WORKSPACE_NAV,
  type ResolvedAgencyWorkspaceNavItem,
} from "@/lib/constants/agency-workspace-nav";
import { toPlatformWorkspacePath } from "@/lib/paths/workspace";
import type { PlatformWorkspaceSession, WorkspaceGrantKey } from "@/types/platform-workspace";

export function sessionHasGrant(
  session: PlatformWorkspaceSession | null,
  grant: WorkspaceGrantKey
): boolean {
  if (!session) return false;
  if (session.fullAccess) return true;
  return session.permissionsGranted.includes(grant);
}

export function sessionHasAnyGrant(
  session: PlatformWorkspaceSession | null,
  grants: WorkspaceGrantKey[]
): boolean {
  if (!session) return false;
  if (session.fullAccess) return true;
  return grants.some((grant) => session.permissionsGranted.includes(grant));
}

export function hasAgencyWorkspaceAccess(
  session: PlatformWorkspaceSession | null
): boolean {
  if (!session) return false;
  if (session.fullAccess) return true;
  return session.permissionsGranted.some((grant) =>
    AGENCY_WORKSPACE_GRANT_KEYS.includes(grant)
  );
}

export function filterAgencyWorkspaceNavItems(
  slug: string,
  session: PlatformWorkspaceSession | null,
  options?: { searchQuery?: string }
): ResolvedAgencyWorkspaceNavItem[] {
  if (!hasAgencyWorkspaceAccess(session)) return [];

  const query = options?.searchQuery?.trim().toLowerCase() ?? "";

  return AGENCY_WORKSPACE_NAV.filter((item) =>
    sessionHasAnyGrant(session, item.requiredGrants)
  )
    .filter((item) => {
      if (!query) return true;
      return (
        item.label.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query)
      );
    })
    .map((item) => ({
      ...item,
      href: toPlatformWorkspacePath(slug, item.href(slug)),
    }));
}

export function isAgencyWorkspaceNavActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function agencyWorkspaceHref(
  slug: string,
  companyDashboardPath: string
): string {
  return toPlatformWorkspacePath(slug, companyDashboardPath);
}
