import { describe, expect, it } from "vitest";

import {
  filterAgencyWorkspaceNavItems,
  hasAgencyWorkspaceAccess,
  sessionHasAnyGrant,
} from "@/lib/platform/agency-workspace";
import type { PlatformWorkspaceSession } from "@/types/platform-workspace";

function mockSession(
  overrides: Partial<PlatformWorkspaceSession> = {}
): PlatformWorkspaceSession {
  return {
    id: "session-1",
    platformUserId: "user-1",
    companyId: "company-1",
    companySlug: "luxury-spa",
    companyName: "Luxury Spa",
    reason: "SEO audit",
    permissionsGranted: ["seo", "website"],
    fullAccess: false,
    platformRoleId: "seo_specialist",
    platformRoleLabel: "SEO Specialist",
    startedAt: new Date().toISOString(),
    lastActivityAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("agency workspace nav", () => {
  it("detects agency access from relevant grants", () => {
    expect(hasAgencyWorkspaceAccess(mockSession({ permissionsGranted: ["crm"] }))).toBe(false);
    expect(hasAgencyWorkspaceAccess(mockSession({ permissionsGranted: ["seo"] }))).toBe(true);
    expect(hasAgencyWorkspaceAccess(mockSession({ fullAccess: true, permissionsGranted: [] }))).toBe(
      true
    );
  });

  it("filters nav items by granted permissions", () => {
    const items = filterAgencyWorkspaceNavItems("luxury-spa", mockSession());
    expect(items.some((item) => item.key === "seo_tools")).toBe(true);
    expect(items.some((item) => item.key === "automation")).toBe(false);
    expect(items.every((item) => item.href.startsWith("/admin/workspace/luxury-spa/dashboard"))).toBe(
      true
    );
  });

  it("checks grant membership", () => {
    const session = mockSession({ permissionsGranted: ["marketing"] });
    expect(sessionHasAnyGrant(session, ["seo", "website"])).toBe(false);
    expect(sessionHasAnyGrant(session, ["marketing", "media"])).toBe(true);
  });
});
