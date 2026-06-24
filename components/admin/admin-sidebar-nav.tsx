import Link from "next/link";
import {
  Activity,
  BarChart3,
  Bell,
  Building2,
  Clock,
  CreditCard,
  GitBranch,
  Globe,
  Globe2,
  LayoutDashboard,
  LifeBuoy,
  Lightbulb,
  Mail,
  Server,
  Settings,
  Users,
  Zap,
} from "lucide-react";

import {
  ADMIN_INFRASTRUCTURE_NAV,
  ADMIN_INTERNAL_NAV,
  ADMIN_OPERATIONS_NAV,
  ADMIN_PLATFORM_NAV,
  ADMIN_SYSTEM_NAV,
  type AdminNavKey,
} from "@/lib/constants/admin-nav";

const ICONS: Partial<Record<AdminNavKey, React.ElementType>> = {
  overview: LayoutDashboard,
  dashboard: LayoutDashboard,
  businesses: Building2,
  clients: Building2,
  users: Users,
  revenue: CreditCard,
  websites: Globe,
  domains: Globe2,
  apiUsage: Zap,
  emails: Mail,
  cron: Clock,
  support: LifeBuoy,
  featureRequests: Lightbulb,
  pipeline: GitBranch,
  team: Users,
  analytics: BarChart3,
  activity: Bell,
  settings: Settings,
};

function NavSection({
  title,
  items,
  activeNav,
}: {
  title: string;
  items: { key: AdminNavKey; label: string; href: string }[];
  activeNav: AdminNavKey;
}) {
  return (
    <div className="pt-4 first:pt-0">
      <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
        {title}
      </p>
      {items.map((item) => {
        const Icon = ICONS[item.key] ?? Server;
        const isActive =
          activeNav === item.key ||
          (item.key === "businesses" && activeNav === "clients") ||
          (item.key === "overview" && activeNav === "dashboard");
        return (
          <Link
            key={item.key}
            href={item.href}
            className={`mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors duration-150 ${
              isActive
                ? "bg-slate-800 text-slate-100 ring-1 ring-inset ring-indigo-400/35"
                : "text-slate-400 hover:bg-slate-800/70 hover:text-slate-100"
            }`}
          >
            <Icon
              className={`h-4 w-4 shrink-0 ${isActive ? "text-indigo-300" : "text-slate-500"}`}
            />
            <span className="truncate">{item.label}</span>
          </Link>
        );
      })}
    </div>
  );
}

export function AdminSidebarNav({ activeNav }: { activeNav: AdminNavKey }) {
  return (
    <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-5">
      <NavSection title="Platform" items={ADMIN_PLATFORM_NAV} activeNav={activeNav} />
      <NavSection
        title="Infrastructure"
        items={ADMIN_INFRASTRUCTURE_NAV}
        activeNav={activeNav}
      />
      <NavSection title="Operations" items={ADMIN_OPERATIONS_NAV} activeNav={activeNav} />
      <NavSection title="Internal" items={ADMIN_INTERNAL_NAV} activeNav={activeNav} />
      <NavSection title="System" items={ADMIN_SYSTEM_NAV} activeNav={activeNav} />
    </nav>
  );
}
