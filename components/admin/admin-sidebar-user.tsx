"use client";

import Link from "next/link";
import { Building2, LogOut, Shield } from "lucide-react";
import { useTransition } from "react";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function AdminSidebarUser({
  adminDisplayName,
  adminEmail,
  workspaceSlug,
}: {
  adminDisplayName: string;
  adminEmail: string | null;
  workspaceSlug?: string | null;
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
      <div className="rounded-xl border border-slate-700/80 bg-slate-800/90 p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-600">
            <Shield className="h-3.5 w-3.5 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium leading-tight text-slate-100">
              {adminDisplayName}
            </p>
            <p className="truncate text-[10px] leading-tight text-slate-400">
              Platform admin
            </p>
            {adminEmail ? (
              <p className="truncate text-[10px] leading-tight text-slate-500">
                {adminEmail}
              </p>
            ) : null}
          </div>
        </div>
        {workspaceSlug ? (
          <Link
            href={`/${encodeURIComponent(workspaceSlug)}/dashboard`}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-600/80 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-950 hover:text-white"
          >
            <Building2 className="h-3.5 w-3.5" aria-hidden />
            Business workspace
          </Link>
        ) : null}
        <button
          type="button"
          onClick={handleLogout}
          disabled={isPending}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-600/80 bg-slate-900 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-slate-500 hover:bg-slate-950 hover:text-white disabled:opacity-60"
        >
          <LogOut className="h-3.5 w-3.5" />
          <span>{isPending ? "Signing out…" : "Log out"}</span>
        </button>
      </div>
    </div>
  );
}
