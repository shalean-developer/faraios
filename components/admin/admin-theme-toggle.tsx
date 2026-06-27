"use client";

import { Monitor, Moon, Sun } from "lucide-react";

import { useAdminThemeOptional } from "@/components/admin/admin-theme-provider";
import type { AdminTheme } from "@/lib/constants/admin-theme";
import { cn } from "@/lib/utils";

const OPTIONS: Array<{ value: AdminTheme; label: string; icon: typeof Sun }> = [
  { value: "light", label: "Light", icon: Sun },
  { value: "dark", label: "Dark", icon: Moon },
  { value: "system", label: "System", icon: Monitor },
];

export function AdminThemeToggle({ className }: { className?: string }) {
  const themeContext = useAdminThemeOptional();
  const theme = themeContext?.theme ?? "light";
  const setTheme = themeContext?.setTheme;

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800",
        className
      )}
      role="group"
      aria-label="Admin theme"
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          onClick={() => setTheme?.(value)}
          disabled={!setTheme}
          suppressHydrationWarning
          className={cn(
            "inline-flex h-7 items-center gap-1 rounded px-2 text-[11px] font-medium transition-colors",
            theme === value
              ? "bg-white text-slate-900 shadow-sm dark:bg-slate-900 dark:text-slate-100"
              : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200",
            !setTheme && "cursor-not-allowed opacity-60"
          )}
          aria-pressed={theme === value}
          title={label}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">{label}</span>
        </button>
      ))}
    </div>
  );
}
