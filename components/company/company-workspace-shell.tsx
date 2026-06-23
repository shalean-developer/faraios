"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";

import { CompanyMobileNav } from "@/components/company/company-mobile-nav";
import { CompanySidebarBrand } from "@/components/company/company-sidebar-brand";
import { CompanySidebarNav } from "@/components/company/company-sidebar-nav";
import { CompanySidebarUser } from "@/components/company/company-sidebar-user";
import { companyNavKeyFromPathname } from "@/lib/constants/company-nav";
import type { UserCompany } from "@/types/database";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "faraios.workspace-sidebar-collapsed";

function CollapsedFooter({
  onToggle,
  displayName,
  email,
}: {
  onToggle: () => void;
  displayName: string;
  email: string | null;
}) {
  return (
    <div className="mt-auto flex shrink-0 flex-col items-center gap-1 border-t border-slate-800 px-2 py-2">
      <button
        type="button"
        onClick={onToggle}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
        aria-label="Expand sidebar"
        title="Expand sidebar"
      >
        <PanelLeftOpen className="h-4 w-4" />
      </button>
      <CompanySidebarUser displayName={displayName} email={email} collapsed />
    </div>
  );
}

export function CompanyWorkspaceShell({
  slug,
  companyName,
  hasWebsiteProject = false,
  companies = [],
  userDisplayName,
  userEmail,
  children,
}: {
  slug: string;
  companyName: string;
  hasWebsiteProject?: boolean;
  companies?: UserCompany[];
  userDisplayName: string;
  userEmail: string | null;
  children: ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const activeNav = companyNavKeyFromPathname(slug, pathname);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      // ignore
    }
  }, []);

  const toggleCollapsed = () => {
    setCollapsed((value) => {
      const next = !value;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // ignore
      }
      return next;
    });
  };

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#f4f6fb] font-sans">
      <aside
        className={cn(
          "hidden h-full flex-shrink-0 flex-col overflow-hidden bg-slate-900 transition-[width] duration-200 ease-out lg:flex",
          collapsed ? "w-[3.75rem]" : "w-52"
        )}
      >
        <CompanySidebarBrand
          slug={slug}
          companyName={companyName}
          companies={companies}
          collapsed={collapsed}
        />
        <CompanySidebarNav
          slug={slug}
          activeNav={activeNav}
          hasWebsiteProject={hasWebsiteProject}
          collapsed={collapsed}
        />
        {collapsed ? (
          <CollapsedFooter
            onToggle={toggleCollapsed}
            displayName={userDisplayName}
            email={userEmail}
          />
        ) : (
          <>
            <div className="mt-auto shrink-0 border-t border-slate-800 p-2">
              <button
                type="button"
                onClick={toggleCollapsed}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-slate-400 transition-colors hover:bg-slate-800 hover:text-white"
                aria-label="Collapse sidebar"
              >
                <PanelLeftClose className="h-4 w-4 shrink-0" />
                <span>Collapse</span>
              </button>
            </div>
            <CompanySidebarUser
              displayName={userDisplayName}
              email={userEmail}
              collapsed={false}
            />
          </>
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <CompanyMobileNav
          slug={slug}
          activeNav={activeNav}
          companyName={companyName}
          hasWebsiteProject={hasWebsiteProject}
        />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
