"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  Bell,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileText,
  Globe,
  LayoutGrid,
  LogOut,
  Mail,
  Menu,
  Monitor,
  X,
  Plus,
  Receipt,
  Search,
  Settings,
  UserPlus,
  CheckSquare,
} from "lucide-react";

import { FaraiLogo } from "@/components/brand/farai-logo";
import { WORKSPACE_SEARCH_FOCUS_EVENT } from "@/lib/constants/workspace-events";
import {
  companyCalendarPath,
  companyCustomersPath,
  companyDashboardPath,
  companyInvoicesPath,
  companyNotificationsPath,
  companyProjectPath,
  companyQuotesPath,
  companySettingsPath,
  companySubscriptionPath,
  companySupportPath,
  companyTasksPath,
  companyWebsitesPath,
} from "@/lib/paths/company";
import { workspaceAvatarGradient, workspaceInitial } from "@/lib/company/workspace-avatar";
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
    "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[#5f6b7a] transition-colors hover:bg-slate-100 hover:text-slate-800 sm:h-9 sm:w-9",
    active && "bg-slate-100 text-slate-900",
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

export function CompanyWorkspaceHeader({
  slug,
  userDisplayName,
  userEmail,
  onToggleSidebar,
  onToggleMobileNav,
  onOpenMobileNav,
  mobileNavOpen = false,
}: {
  slug: string;
  userDisplayName: string;
  userEmail: string | null;
  onToggleSidebar?: () => void;
  onToggleMobileNav?: () => void;
  onOpenMobileNav?: () => void;
  mobileNavOpen?: boolean;
}) {
  const pathname = usePathname() ?? "";
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [newMenuOpen, setNewMenuOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const userMenuRef = useRef<HTMLDivElement>(null);
  const newMenuRef = useRef<HTMLDivElement>(null);

  const userGradient = workspaceAvatarGradient(userEmail ?? userDisplayName);
  const userInitial = workspaceInitial(userDisplayName);

  const isActive = (path: string) => pathname === path || pathname.startsWith(`${path}/`);

  useEffect(() => {
    const onPointerDown = (event: MouseEvent) => {
      if (!userMenuRef.current?.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      if (!newMenuRef.current?.contains(event.target as Node)) {
        setNewMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  const focusSidebarSearch = () => {
    window.dispatchEvent(new Event(WORKSPACE_SEARCH_FOCUS_EVENT));
  };

  const handleLogout = () => {
    startTransition(async () => {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
      window.location.href = "/auth/sign-in";
    });
  };

  const newMenuItems = [
    { label: "Booking", href: companyCalendarPath(slug), icon: CalendarDays },
    { label: "Customer", href: companyCustomersPath(slug), icon: UserPlus },
    { label: "Quote", href: companyQuotesPath(slug), icon: FileText },
    { label: "Invoice", href: companyInvoicesPath(slug), icon: Receipt },
    { label: "Task", href: companyTasksPath(slug), icon: CheckSquare },
  ];

  return (
    <header className="relative z-30 flex h-12 shrink-0 items-center border-b border-[#ece8e1] bg-white px-2 sm:h-[52px] sm:px-4">
      <div className="flex min-w-0 flex-1 items-center gap-1 sm:gap-3 md:gap-4">
        <HeaderIconButton
          label={mobileNavOpen ? "Close menu" : "Open menu"}
          onClick={onToggleMobileNav ?? onToggleSidebar}
          className="lg:hidden"
        >
          {mobileNavOpen ? (
            <X className="h-[18px] w-[18px]" strokeWidth={1.75} />
          ) : (
            <Menu className="h-[18px] w-[18px]" strokeWidth={1.75} />
          )}
        </HeaderIconButton>

        <Link
          href={companyDashboardPath(slug)}
          className="flex min-w-0 shrink items-center transition-opacity hover:opacity-90"
          aria-label="FaraiOS home"
        >
          <FaraiLogo
            size="header"
            priority
            imageClassName="h-7 max-w-[7.5rem] sm:h-9 sm:max-w-[11rem] md:h-10 md:max-w-[13.75rem]"
          />
        </Link>

        <div className="hidden items-center md:flex">
          <HeaderIconButton
            label="Toggle sidebar"
            onClick={onToggleSidebar}
            className="hidden lg:inline-flex"
          >
            <Menu className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </HeaderIconButton>
          <HeaderIconButton
            label="Tasks"
            href={companyTasksPath(slug)}
            active={isActive(companyTasksPath(slug))}
          >
            <CheckCircle2 className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </HeaderIconButton>
          <HeaderIconButton
            label="Dashboard"
            href={companyDashboardPath(slug)}
            active={pathname === companyDashboardPath(slug)}
          >
            <LayoutGrid className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </HeaderIconButton>
          <HeaderIconButton
            label="Projects"
            href={companyProjectPath(slug)}
            active={isActive(companyProjectPath(slug))}
          >
            <Briefcase className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </HeaderIconButton>
          <HeaderIconButton
            label="Website"
            href={companyWebsitesPath(slug)}
            active={isActive(companyWebsitesPath(slug))}
            className="hidden lg:inline-flex"
          >
            <Monitor className="h-[18px] w-[18px]" strokeWidth={1.75} />
          </HeaderIconButton>
        </div>
      </div>

      <div className="ml-1 flex shrink-0 items-center gap-0 sm:ml-2 sm:gap-0.5 md:gap-1">
        <HeaderIconButton
          label="Search"
          onClick={() => {
            onOpenMobileNav?.();
            window.setTimeout(() => {
              window.dispatchEvent(new Event(WORKSPACE_SEARCH_FOCUS_EVENT));
            }, 200);
          }}
          className="lg:hidden"
        >
          <Search className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </HeaderIconButton>
        <HeaderIconButton
          label="Search"
          onClick={focusSidebarSearch}
          className="hidden lg:inline-flex"
        >
          <Search className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </HeaderIconButton>

        <div className="relative hidden sm:block" ref={newMenuRef}>
          <HeaderIconButton
            label="Create new"
            onClick={() => setNewMenuOpen((open) => !open)}
            active={newMenuOpen}
          >
            <span className="relative flex h-[18px] w-[18px] items-center justify-center">
              <span className="absolute inset-0 rounded-full border border-current" />
              <Plus className="h-3 w-3" strokeWidth={2} />
            </span>
          </HeaderIconButton>
          {newMenuOpen ? (
            <div className="absolute right-0 top-full z-40 mt-1 min-w-[11rem] overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
              {newMenuItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="flex items-center gap-2.5 px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
                  onClick={() => setNewMenuOpen(false)}
                >
                  <item.icon className="h-4 w-4 text-slate-500" />
                  {item.label}
                </Link>
              ))}
            </div>
          ) : null}
        </div>

        <HeaderIconButton
          label="Website"
          href={companyWebsitesPath(slug)}
          className="hidden md:inline-flex"
        >
          <Globe className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </HeaderIconButton>
        <HeaderIconButton
          label="Calendar"
          href={companyCalendarPath(slug)}
          className="hidden md:inline-flex"
        >
          <Clock className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </HeaderIconButton>
        <HeaderIconButton
          label="Notifications"
          href={companyNotificationsPath(slug)}
          active={isActive(companyNotificationsPath(slug))}
        >
          <Bell className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </HeaderIconButton>
        <HeaderIconButton
          label="Messages"
          href={companySupportPath(slug)}
          active={isActive(companySupportPath(slug))}
          className="hidden md:inline-flex"
        >
          <Mail className="h-[18px] w-[18px]" strokeWidth={1.75} />
        </HeaderIconButton>

        <div className="relative ml-0.5 sm:ml-1 md:ml-2" ref={userMenuRef}>
          <button
            type="button"
            onClick={() => setUserMenuOpen((open) => !open)}
            className="flex items-center gap-2 rounded-md p-0.5 transition-colors hover:bg-slate-50 sm:py-1 sm:pl-1 sm:pr-1.5"
            aria-expanded={userMenuOpen}
            aria-haspopup="menu"
            suppressHydrationWarning
          >
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br text-[11px] font-semibold text-white sm:h-8 sm:w-8 sm:text-xs",
                userGradient
              )}
            >
              {userInitial}
            </span>
            <span className="hidden max-w-[120px] truncate text-sm font-medium text-slate-700 md:inline">
              {userDisplayName}
            </span>
            <ChevronDown
              className={cn(
                "hidden h-4 w-4 text-slate-400 transition-transform md:inline",
                userMenuOpen && "rotate-180"
              )}
            />
          </button>

          {userMenuOpen ? (
            <div className="absolute right-0 top-full z-40 mt-1 min-w-[180px] overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
              <div className="border-b border-slate-100 px-3 py-2">
                <p className="truncate text-sm font-medium text-slate-900">{userDisplayName}</p>
                {userEmail ? (
                  <p className="truncate text-xs text-slate-500">{userEmail}</p>
                ) : null}
              </div>
              <div className="border-b border-slate-100 py-1 sm:hidden">
                <p className="px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  Create new
                </p>
                {newMenuItems.map((item) => (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <item.icon className="h-4 w-4 text-slate-500" />
                    {item.label}
                  </Link>
                ))}
              </div>
              <Link
                href={companySettingsPath(slug)}
                className="flex items-center gap-2 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                onClick={() => setUserMenuOpen(false)}
              >
                <Settings className="h-4 w-4" />
                Settings
              </Link>
              <Link
                href={companySubscriptionPath(slug)}
                className="block px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                onClick={() => setUserMenuOpen(false)}
              >
                Subscription
              </Link>
              <Link
                href={companySupportPath(slug)}
                className="block px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                onClick={() => setUserMenuOpen(false)}
              >
                Support
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                disabled={isPending}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
