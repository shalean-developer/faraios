"use client";

import { useTransition } from "react";
import { LogOut, Shield } from "lucide-react";

import { exitPlatformWorkspaceAction } from "@/app/actions/workspace-session";
import { usePlatformWorkspace } from "@/components/platform/platform-workspace-context";
import { cn } from "@/lib/utils";

export function PlatformWorkspaceBanner({ className }: { className?: string }) {
  const workspace = usePlatformWorkspace();
  const [isPending, startTransition] = useTransition();

  if (!workspace.active || !workspace.session) {
    return null;
  }

  const handleExit = () => {
    startTransition(async () => {
      await exitPlatformWorkspaceAction();
      window.location.href = "/admin";
    });
  };

  return (
    <div
      className={cn(
        "relative z-20 shrink-0 border-b border-indigo-200 bg-gradient-to-r from-indigo-600 via-indigo-600 to-violet-600 px-3 py-2.5 text-white sm:px-4",
        className
      )}
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-indigo-100">
            Workspace
          </p>
          <p className="truncate text-sm font-semibold sm:text-base">
            {workspace.session.companyName}
          </p>
        </div>

        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs sm:text-sm">
          <span className="inline-flex items-center gap-1.5 text-indigo-50">
            <Shield className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              Logged in as{" "}
              <span className="font-semibold text-white">
                Platform Administrator
              </span>
            </span>
          </span>
          <span className="hidden text-indigo-100 md:inline" aria-hidden="true">
            ·
          </span>
          <span className="hidden max-w-[200px] truncate text-indigo-100 md:inline">
            {workspace.session.platformRoleLabel}
            {workspace.session.fullAccess
              ? " · Full access"
              : workspace.session.permissionsGranted.length > 0
                ? ` · ${workspace.session.permissionsGranted.length} permissions`
                : null}
          </span>
          <span className="hidden text-indigo-100 lg:inline" aria-hidden="true">
            ·
          </span>
          <span className="hidden max-w-[280px] truncate text-indigo-100 lg:inline">
            {workspace.session.reason}
          </span>
        </div>

        <button
          type="button"
          onClick={handleExit}
          disabled={isPending}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/20 disabled:opacity-60 sm:text-sm"
        >
          <LogOut className="h-3.5 w-3.5" />
          {isPending ? "Exiting…" : "Exit Workspace"}
        </button>
      </div>
    </div>
  );
}
