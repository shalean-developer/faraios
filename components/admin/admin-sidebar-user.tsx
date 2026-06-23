"use client";

import { LogOut, Shield } from "lucide-react";
import { useTransition } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function AdminSidebarUser({
  adminDisplayName,
  adminEmail,
}: {
  adminDisplayName: string;
  adminEmail: string | null;
}) {
  const [isPending, startTransition] = useTransition();

  const handleLogout = () => {
    startTransition(async () => {
      const supabase = getSupabaseBrowserClient();
      await supabase.auth.signOut();
      window.location.href = "/";
    });
  };

  return (
    <div className="flex-shrink-0 border-t border-slate-800 px-4 py-4">
      <div className="rounded-xl border border-slate-700 bg-slate-800 p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600">
            <Shield className="h-3.5 w-3.5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-white">
              {adminDisplayName}
            </p>
            <p className="truncate text-[10px] text-slate-400">
              {adminEmail ?? "—"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          disabled={isPending}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-900 hover:text-white disabled:opacity-60"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>{isPending ? "Signing out…" : "Log out"}</span>
        </button>
      </div>
    </div>
  );
}
