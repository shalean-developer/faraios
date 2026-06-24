"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import { CompanyMobileNav } from "@/components/company/company-mobile-nav";
import { CompanySidebarBrand } from "@/components/company/company-sidebar-brand";
import { CompanySidebarNav } from "@/components/company/company-sidebar-nav";
import { CompanySidebarUser } from "@/components/company/company-sidebar-user";
import { CompanyWorkspaceHeader } from "@/components/company/company-workspace-header";
import { companyNavKeyFromPathname } from "@/lib/constants/company-nav";
import type { PermissionKey } from "@/lib/permissions/shared";
import type { UserCompany } from "@/types/database";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "faraios.workspace-sidebar-collapsed";
const COLLAPSE_EVENT = "faraios:workspace-sidebar-collapse";

function readCollapsedFromStorage(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function subscribeSidebarCollapsed(onStoreChange: () => void) {
  const handler = () => onStoreChange();
  window.addEventListener(COLLAPSE_EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(COLLAPSE_EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

const emptySubscribe = () => () => {};

export function CompanyWorkspaceShell({
  slug,
  companyName,
  hasWebsiteProject = false,
  companies = [],
  userDisplayName,
  userEmail,
  userPermissions = [],
  children,
}: {
  slug: string;
  companyName: string;
  hasWebsiteProject?: boolean;
  companies?: UserCompany[];
  userDisplayName: string;
  userEmail: string | null;
  userPermissions?: PermissionKey[];
  children: ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const activeNav = companyNavKeyFromPathname(slug, pathname);
  const collapsed = useSyncExternalStore(
    subscribeSidebarCollapsed,
    readCollapsedFromStorage,
    () => false
  );
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);

  const toggleCollapsed = () => {
    const next = !readCollapsedFromStorage();
    try {
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    } catch {
      // ignore
    }
    window.dispatchEvent(new Event(COLLAPSE_EVENT));
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f4f6fb] font-sans">
      <aside
        className={cn(
          "hidden h-full flex-shrink-0 flex-col overflow-hidden bg-slate-900 lg:flex",
          mounted && "transition-[width] duration-200 ease-out",
          mounted && collapsed ? "w-[3.75rem]" : "w-56"
        )}
      >
        <CompanySidebarBrand
          slug={slug}
          companyName={companyName}
          companies={companies}
          collapsed={mounted && collapsed}
          onToggle={toggleCollapsed}
        />
        <CompanySidebarNav
          slug={slug}
          activeNav={activeNav}
          hasWebsiteProject={hasWebsiteProject}
          collapsed={mounted && collapsed}
          userPermissions={userPermissions}
        />
        <CompanySidebarUser
          displayName={userDisplayName}
          email={userEmail}
          collapsed={mounted && collapsed}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <CompanyMobileNav
          slug={slug}
          activeNav={activeNav}
          companyName={companyName}
          hasWebsiteProject={hasWebsiteProject}
          userPermissions={userPermissions}
        />
        <CompanyWorkspaceHeader slug={slug} className="hidden lg:flex" />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
