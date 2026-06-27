"use client";

import { X } from "lucide-react";

import { AdminSidebarBrand } from "@/components/admin/admin-sidebar-brand";
import { AdminSidebarNav } from "@/components/admin/admin-sidebar-nav";
import type { AdminNavKey } from "@/lib/constants/admin-nav";
import { cn } from "@/lib/utils";

export function AdminMobileNav({
  activeNav,
  searchQuery,
  onSearchChange,
  open,
  onOpenChange,
}: {
  activeNav: AdminNavKey;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <>
      <div
        className={cn(
          "fixed inset-0 z-40 bg-slate-900/40 transition-opacity lg:hidden",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => onOpenChange(false)}
        aria-hidden={!open}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[min(280px,88vw)] flex-col border-r border-slate-200 bg-white transition-transform duration-200 lg:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        aria-hidden={!open}
      >
        <div className="flex h-[52px] items-center justify-between border-b border-slate-200 px-3">
          <p className="text-sm font-medium text-slate-900">Admin navigation</p>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close menu"
          >
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>
        <AdminSidebarBrand searchQuery={searchQuery} onSearchChange={onSearchChange} />
        <AdminSidebarNav
          activeNav={activeNav}
          searchQuery={searchQuery}
          onNavigate={() => onOpenChange(false)}
        />
      </aside>
    </>
  );
}
