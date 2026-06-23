import Link from "next/link";
import {
  BarChart3,
  Bell,
  GitBranch,
  LayoutDashboard,
  Settings,
  Users,
  Users2,
} from "lucide-react";

import {
  ADMIN_PRIMARY_NAV,
  ADMIN_SYSTEM_NAV,
  type AdminNavKey,
} from "@/lib/constants/admin-nav";

const PRIMARY_ICONS = {
  dashboard: LayoutDashboard,
  pipeline: GitBranch,
  team: Users,
  clients: Users2,
} as const;

const SYSTEM_ICONS = {
  analytics: BarChart3,
  activity: Bell,
  settings: Settings,
} as const;

export function AdminSidebarNav({ activeNav }: { activeNav: AdminNavKey }) {
  return (
    <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-5">
      <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
        Navigation
      </p>
      {ADMIN_PRIMARY_NAV.map((item) => {
        const Icon = PRIMARY_ICONS[item.key];
        const isActive = activeNav === item.key;
        return (
          <Link
            key={item.key}
            href={item.href}
            className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
              isActive
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/40"
                : "text-slate-400 hover:bg-slate-800 hover:text-white"
            }`}
          >
            <Icon
              className={`h-4 w-4 flex-shrink-0 ${isActive ? "text-white" : "text-slate-500"}`}
            />
            <span>{item.label}</span>
            {isActive ? (
              <div className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-200" />
            ) : null}
          </Link>
        );
      })}

      <div className="pt-5">
        <p className="mb-3 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">
          System
        </p>
        {ADMIN_SYSTEM_NAV.map((item) => {
          const Icon = SYSTEM_ICONS[item.key];
          const isActive = activeNav === item.key;
          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                isActive
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-900/40"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              }`}
            >
              <Icon
                className={`h-4 w-4 flex-shrink-0 ${isActive ? "text-white" : "text-slate-500"}`}
              />
              <span>{item.label}</span>
              {isActive ? (
                <div className="ml-auto h-1.5 w-1.5 rounded-full bg-indigo-200" />
              ) : null}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
