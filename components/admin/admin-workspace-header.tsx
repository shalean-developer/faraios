"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { Building2, ChevronDown, LogOut, Menu, Search, Settings, Shield } from "lucide-react";

import { FaraiLogo } from "@/components/brand/farai-logo";
import { AdminThemeToggle } from "@/components/admin/admin-theme-toggle";
import { ADMIN_HOME_PATH, ADMIN_SYSTEM_NAV } from "@/lib/constants/admin-nav";
import {
  ADMIN_COMMAND_PALETTE_EVENT,
} from "@/lib/constants/workspace-events";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

function HeaderIconButton({
  children,
  href,
  onClick,
  active,
  label,
  className,
}: {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  active?: boolean;
  label: string;
  className?: string;
}) {
  const classes = cn(
    "inline-flex h-9 w-9 items-center justify-center rounded-md text-[#5f6b7a] transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100",
    active && "bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-100",
    className
  );

  if (href) {
    return (
      <Link
        href={href}
        className={classes}
        aria-label={label}
        title={label}
        suppressHydrationWarning
      >
        {children}
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={classes}
      aria-label={label}
      title={label}
      suppressHydrationWarning
    >
      {children}
    </button>
  );
}

export function AdminWorkspaceHeader({
  adminDisplayName,
  adminEmail,
  workspaceSlug,
  onToggleSidebar,
  onToggleMobileNav,
  mobileNavOpen = false,
}: {
  adminDisplayName: string;
  adminEmail: string | null;
  workspaceSlug?: string | null;
  onToggleSidebar?: () => void;
  onToggleMobileNav?: () => void;
  mobileNavOpen?: boolean;
}) {
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const userMenuRef = useRef<HTMLDivElement>(null);
  const settingsHref = ADMIN_SYSTEM_NAV.find((item) => item.key === "settings")?.href ?? "/admin/settings";

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!userMenuRef.current?.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const openCommandPalette = () => {
    window.dispatchEvent(new Event(ADMIN_COMMAND_PALETTE_EVENT));
  };

  const handleLogout = () => {
    startTransition(async () => {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
      window.location.href = "/";
    });
  };

  return (
    <header className="relative z-30 flex h-[52px] shrink-0 items-center border-b border-[#ece8e1] bg-white px-3 sm:px-4 dark:border-slate-800 dark:bg-slate-950">
      <div className="flex min-w-0 items-center gap-3 sm:gap-4">
        <Link
          href={ADMIN_HOME_PATH}
          className="flex shrink-0 items-center transition-opacity hover:opacity-90"
          aria-label="FaraiOS admin home"
        >
          <FaraiLogo size="header" priority />
        </Link>

        <div className="flex items-center">
          <HeaderIconButton
            label={mobileNavOpen ? "Close menu" : "Open menu"}
            onClick={onToggleMobileNav ?? onToggleSidebar}
            className="lg:hidden"
          >
            <Menu className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </HeaderIconButton>
          <HeaderIconButton
            label="Toggle sidebar"
            onClick={onToggleSidebar}
            className="hidden lg:inline-flex"
          >
            <Menu className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </HeaderIconButton>
          <span className="ml-1 hidden items-center gap-1.5 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600 sm:inline-flex dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            <Shield className="h-3.5 w-3.5 text-[#5a8dee]" />
            Platform admin
          </span>
        </div>
      </div>

      <div className="ml-auto flex items-center gap-0.5 sm:gap-1">
        <HeaderIconButton label="Search platform (Ctrl+K)" onClick={openCommandPalette}>
          <Search className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </HeaderIconButton>
        <AdminThemeToggle className="hidden md:inline-flex" />
        <HeaderIconButton label="Platform settings" href={settingsHref}>
          <Settings className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </HeaderIconButton>

        <div className="relative ml-1 sm:ml-2" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setUserMenuOpen((open) => !open)}
            suppressHydrationWarning
            className="flex items-center gap-2 rounded-md py-1 pl-1 pr-1.5 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
            aria-expanded={userMenuOpen}
            aria-haspopup="menu"
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#5a8dee] text-xs font-semibold text-white">
              {adminDisplayName.trim().charAt(0).toUpperCase() || "A"}
            </span>
            <span className="hidden max-w-[120px] truncate text-sm font-medium text-slate-700 md:inline dark:text-slate-200">
              {adminDisplayName}
            </span>
            <ChevronDown
              className={cn(
                "hidden h-4 w-4 text-slate-400 transition-transform md:inline",
                userMenuOpen && "rotate-180"
              )}
            />
          </button>

          {userMenuOpen ? (
            <div className="absolute right-0 top-full z-40 mt-1 min-w-[200px] overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
              <div className="border-b border-slate-100 px-3 py-2 dark:border-slate-800">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{adminDisplayName}</p>
                {adminEmail ? (
                  <p className="truncate text-xs text-slate-500 dark:text-slate-400">{adminEmail}</p>
                ) : null}
                <p className="text-xs text-slate-400">Platform admin</p>
              </div>
              <div className="border-b border-slate-100 px-3 py-2 md:hidden dark:border-slate-800">
                <AdminThemeToggle className="w-full" />
              </div>
              {workspaceSlug ? (
                <Link
                  href={`/${encodeURIComponent(workspaceSlug)}/dashboard`}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800"
                  onClick={() => setUserMenuOpen(false)}
                >
                  <Building2 className="h-4 w-4" />
                  Business workspace
                </Link>
              ) : null}
              <Link
                href={settingsHref}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                onClick={() => setUserMenuOpen(false)}
              >
                <Settings className="h-4 w-4" />
                Platform settings
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isPending}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-60 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <LogOut className="h-4 w-4" />
                {isPending ? "Signing out…" : "Log out"}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
