"use client";

import { useSyncExternalStore, useState } from "react";
import { usePathname } from "next/navigation";

import { AdminCommandPalette } from "@/components/admin/admin-command-palette";
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";
import { AdminSidebarBrand } from "@/components/admin/admin-sidebar-brand";
import { AdminSidebarNav } from "@/components/admin/admin-sidebar-nav";
import { useAdminThemeOptional } from "@/components/admin/admin-theme-provider";
import { AdminWorkspaceHeader } from "@/components/admin/admin-workspace-header";
import { resolveAdminNavKey } from "@/lib/constants/admin-nav";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "faraios.admin-sidebar-collapsed";
const COLLAPSE_EVENT = "faraios:admin-sidebar-collapse";

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

export function AdminLayoutShell({
  adminDisplayName,
  adminEmail,
  workspaceSlug,
  children,
}: {
  adminDisplayName: string;
  adminEmail: string | null;
  workspaceSlug?: string | null;
  children: React.ReactNode;
}) {
  const themeContext = useAdminThemeOptional();
  const applyDarkClass =
    themeContext?.hydrated === true && themeContext.effectiveTheme === "dark";
  const pathname = usePathname();
  const activeNav = resolveAdminNavKey(pathname);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
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
    <div
      className={cn(
        "flex h-dvh w-full flex-col overflow-hidden bg-white font-sans dark:bg-slate-950",
        applyDarkClass && "dark"
      )}
    >
      <AdminWorkspaceHeader
        adminDisplayName={adminDisplayName}
        adminEmail={adminEmail}
        workspaceSlug={workspaceSlug}
        onToggleSidebar={toggleCollapsed}
        onToggleMobileNav={() => setMobileNavOpen((open) => !open)}
        mobileNavOpen={mobileNavOpen}
      />
      <AdminCommandPalette />

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside
          className={cn(
            "hidden h-full flex-shrink-0 flex-col overflow-hidden border-r border-slate-200 bg-white lg:flex dark:border-slate-800 dark:bg-slate-950",
            mounted && "transition-[width] duration-200 ease-out",
            mounted && collapsed ? "w-14" : "w-[220px]"
          )}
        >
          <AdminSidebarBrand
            collapsed={mounted && collapsed}
            onToggle={toggleCollapsed}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
          />
          <AdminSidebarNav
            activeNav={activeNav}
            collapsed={mounted && collapsed}
            searchQuery={searchQuery}
          />
        </aside>

        <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden bg-[#fafafa] dark:bg-slate-900">
          <AdminMobileNav
            activeNav={activeNav}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            open={mobileNavOpen}
            onOpenChange={setMobileNavOpen}
          />
          <main className="flex-1 overflow-y-auto">{children}</main>
        </div>
      </div>
    </div>
  );
}
