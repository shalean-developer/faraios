"use client";

import Link from "next/link";
import {
  BarChart3,
  CalendarDays,
  ClipboardList,
  CreditCard,
  FileText,
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
  Star,
  TrendingUp,
  Users,
  Users2,
  Wrench,
} from "lucide-react";

import {
  companyNavItems,
  type CompanyNavKey,
} from "@/lib/constants/company-nav";
import { cn } from "@/lib/utils";

const ICONS = {
  dashboard: LayoutDashboard,
  bookings: CalendarDays,
  calendar: CalendarDays,
  customers: Users,
  services: Wrench,
  quotes: FileText,
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
  "booking-form": ClipboardList,
} as const;

const SECTION_LABELS: Record<string, string> = {
  operations: "Operations",
  websites: "Websites",
  growth: "Growth",
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
  const items = companyNavItems(slug, { hasWebsiteProject });
  const sections = ["operations", "websites", "growth", "settings"] as const;

  return (
    <nav
      className={cn(
        "overflow-hidden px-2 py-2",
        collapsed ? "shrink-0" : "min-h-0 flex-1 py-3"
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
                return (
                  <li key={item.key}>
                    <Link
                      href={item.href}
                      title={collapsed ? item.label : undefined}
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
                        <span className="truncate">{item.label}</span>
                      ) : null}
                    </Link>
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
