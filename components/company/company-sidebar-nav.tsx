"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import {
  Activity,
  BarChart3,
  Bell,
  CalendarDays,
  CheckSquare,
  ChevronDown,
  ClipboardList,
  CreditCard,
  FolderKanban,
  Globe,
  LayoutDashboard,
  LineChart,
  Mail,
  Megaphone,
  PenLine,
  Receipt,
  Search,
  Settings,
  Sparkles,
  Star,
  TrendingUp,
  Users,
  Users2,
  Wrench,
  Zap,
} from "lucide-react";

import {
  bookingsSubNavItems,
  bookingsViewFromPathname,
  companyNavItems,
  type CompanyNavKey,
} from "@/lib/constants/company-nav";
import { cn } from "@/lib/utils";

const ICONS = {
  dashboard: LayoutDashboard,
  insights: TrendingUp,
  "business-health": Activity,
  "ai-insights": Sparkles,
  bookings: CalendarDays,
  calendar: CalendarDays,
  customers: Users,
  services: Wrench,
  invoices: Receipt,
  payments: CreditCard,
  revenue: TrendingUp,
  reports: BarChart3,
  websites: Globe,
  seo: Search,
  marketing: Megaphone,
  reviews: Star,
  campaigns: Mail,
  content: PenLine,
  analytics: LineChart,
  project: FolderKanban,
  settings: Settings,
  team: Users2,
  tasks: CheckSquare,
  automations: Zap,
  notifications: Bell,
  "booking-form": ClipboardList,
} as const;

const SECTION_LABELS: Record<string, string> = {
  operations: "Operations",
  websites: "Websites",
  growth: "Growth",
  intelligence: "Intelligence",
  settings: "Settings",
};

export function CompanySidebarNav({
  slug,
  activeNav,
  hasWebsiteProject = false,
  collapsed = false,
}: {
  slug: string;
  activeNav: CompanyNavKey;
  hasWebsiteProject?: boolean;
  collapsed?: boolean;
}) {
  const pathname = usePathname() ?? "";
  const items = companyNavItems(slug, { hasWebsiteProject });
  const sections = ["operations", "intelligence", "websites", "growth", "settings"] as const;
  const bookingsSubNav = bookingsSubNavItems(slug);
  const activeBookingsView = bookingsViewFromPathname(slug, pathname);
  const isBookingsSection = activeNav === "bookings";
  const [bookingsExpanded, setBookingsExpanded] = useState(isBookingsSection);
  const previousPathnameRef = useRef(pathname);

  useEffect(() => {
    const bookingsBase = `/${encodeURIComponent(slug)}/dashboard/bookings`;
    const quotesBase = `/${encodeURIComponent(slug)}/dashboard/quotes`;
    const isBookingsPath = (path: string) =>
      path.startsWith(bookingsBase) || path.startsWith(quotesBase);

    const wasBookings = isBookingsPath(previousPathnameRef.current);
    const isNowBookings = isBookingsPath(pathname);

    if (isNowBookings && !wasBookings) {
      setBookingsExpanded(true);
    } else if (!isNowBookings) {
      setBookingsExpanded(false);
    }

    previousPathnameRef.current = pathname;
  }, [pathname, slug]);

  const handleBookingsClick = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (isBookingsSection) {
      event.preventDefault();
      setBookingsExpanded((value) => !value);
      return;
    }
    setBookingsExpanded(true);
  };

  return (
    <nav
      className={cn(
        "min-h-0 flex-1 overflow-x-hidden overflow-y-auto px-2 py-2",
        !collapsed && "py-3"
      )}
    >
      {sections.map((section) => {
        const sectionItems = items.filter((item) => item.section === section);
        return (
          <div key={section} className={collapsed ? "mb-1" : "mb-3"}>
            {!collapsed ? (
              <p className="mb-1.5 px-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {SECTION_LABELS[section]}
              </p>
            ) : null}
            <ul className={cn(collapsed && "flex flex-col items-center gap-0.5")}>
              {sectionItems.map((item) => {
                const Icon = ICONS[item.key];
                const isActive = activeNav === item.key;
                const showBookingsSubNav =
                  item.key === "bookings" && !collapsed && bookingsExpanded;

                return (
                  <li key={item.key}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      onClick={item.key === "bookings" ? handleBookingsClick : undefined}
                      aria-expanded={
                        item.key === "bookings" && !collapsed ? bookingsExpanded : undefined
                      }
                      className={cn(
                        "flex items-center text-sm font-medium transition-all",
                        collapsed
                          ? "h-9 w-9 justify-center rounded-lg"
                          : "mb-0.5 gap-2.5 rounded-lg px-2.5 py-2",
                        isActive
                          ? "bg-violet-600 text-white shadow-md shadow-violet-900/30"
                          : "text-slate-400 hover:bg-slate-800 hover:text-white"
                      )}
                    >
                      <Icon
                        className={cn(
                          "h-4 w-4 shrink-0",
                          isActive ? "text-white" : "text-slate-500"
                        )}
                      />
                      {!collapsed ? (
                        <>
                          <span className="truncate">{item.label}</span>
                          {item.key === "bookings" ? (
                            <ChevronDown
                              className={cn(
                                "ml-auto h-4 w-4 shrink-0 transition-transform duration-200",
                                bookingsExpanded && "rotate-180",
                                isActive ? "text-white/80" : "text-slate-500"
                              )}
                            />
                          ) : null}
                        </>
                      ) : null}
                    </Link>
                    {showBookingsSubNav ? (
                      <ul className="mb-1 ml-3 space-y-0.5 border-l border-slate-700 pl-2.5">
                        {bookingsSubNav.map((subItem) => {
                          const isSubActive = activeBookingsView === subItem.key;
                          return (
                            <li key={subItem.key}>
                              <Link
                                href={subItem.href}
                                className={cn(
                                  "block rounded-md px-2 py-1.5 text-xs font-medium transition-all",
                                  isSubActive
                                    ? "bg-violet-600/90 text-white"
                                    : "text-slate-400 hover:bg-slate-800 hover:text-white"
                                )}
                              >
                                {subItem.label}
                              </Link>
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}
