"use client";

import { useSyncExternalStore, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

import { CompanyMobileNav } from "@/components/company/company-mobile-nav";
import { CompanySidebarBrand } from "@/components/company/company-sidebar-brand";
import { CompanySidebarNav } from "@/components/company/company-sidebar-nav";
import { companyNavKeyFromPathname } from "@/lib/constants/company-nav";
import type { PermissionKey } from "@/lib/permissions/shared";
import type { UserCompany } from "@/types/database";
import type { SubscriptionCompanyFields } from "@/lib/subscriptions/types";
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
  subscription,
  industrySlug,
  children,
}: {
  slug: string;
  companyName: string;
  hasWebsiteProject?: boolean;
  companies?: UserCompany[];
  userDisplayName: string;
  userEmail: string | null;
  userPermissions?: PermissionKey[];
  subscription?: SubscriptionCompanyFields;
  industrySlug?: string | null;
  children: ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const activeNav = companyNavKeyFromPathname(slug, pathname);
  const [searchQuery, setSearchQuery] = useState("");
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
    <div className="flex h-screen w-full overflow-hidden bg-white font-sans">
      <aside
        className={cn(
          "hidden h-full flex-shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-[#fafafa] lg:flex",
          mounted && "transition-[width] duration-200 ease-out",
          mounted && collapsed ? "w-14" : "w-[240px]"
        )}
      >
        <CompanySidebarBrand
          slug={slug}
          companyName={companyName}
          companies={companies}
          planSlug={subscription?.plan}
          collapsed={mounted && collapsed}
          onToggle={toggleCollapsed}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />
        <CompanySidebarNav
          slug={slug}
          activeNav={activeNav}
          hasWebsiteProject={hasWebsiteProject}
          collapsed={mounted && collapsed}
          userPermissions={userPermissions}
          subscription={subscription}
          industrySlug={industrySlug}
          searchQuery={searchQuery}
          displayName={userDisplayName}
          userEmail={userEmail}
        />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[#fafafa]">
        <CompanyMobileNav
          slug={slug}
          activeNav={activeNav}
          companyName={companyName}
          hasWebsiteProject={hasWebsiteProject}
          userPermissions={userPermissions}
          subscription={subscription}
          industrySlug={industrySlug}
        />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
