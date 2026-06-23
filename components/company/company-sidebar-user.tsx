"use client";

import { Building2, LogOut } from "lucide-react";
import { useTransition } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export function CompanySidebarUser({
  displayName,
  email,
  collapsed = false,
  embedded = false,
}: {
  displayName: string;
  email: string | null;
  collapsed?: boolean;
  embedded?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
      window.location.href = "/";
    });
  };

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={handleLogout}
        disabled={isPending}
        title={`${displayName} — Log out`}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-800 hover:text-white disabled:opacity-60"
      >
        <LogOut className="h-4 w-4" />
      </button>
    );
  }

  return (
    <div
      className={cn(
        "flex-shrink-0 p-2",
        !embedded && "border-t border-slate-800"
      )}
    >
      <div className="rounded-lg border border-slate-700 bg-slate-800 p-2.5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600">
            <Building2 className="h-3.5 w-3.5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-white">{displayName}</p>
            <p className="truncate text-[10px] text-slate-400">{email ?? "—"}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isPending}
            title="Log out"
            className={cn(
              "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-900 hover:text-white disabled:opacity-60"
            )}
          >
            <LogOut className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
