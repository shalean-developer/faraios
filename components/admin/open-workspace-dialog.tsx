"use client";

import { useState, useTransition } from "react";
import { Building2, Shield } from "lucide-react";

import { fetchWorkspaceEntryOptions } from "@/app/actions/platform-admin-roles";
import { enterPlatformWorkspace } from "@/app/actions/workspace-session";
import { WorkspaceGrantPicker } from "@/components/admin/workspace-grant-picker";
import type { WorkspaceEntryOptions } from "@/lib/services/platform-admin-roles";
import type { WorkspaceGrantKey } from "@/types/platform-workspace";
import { cn } from "@/lib/utils";

export function OpenWorkspaceDialog({
  companyId,
  companySlug,
  companyName,
  triggerClassName,
  triggerLabel = "Open Workspace",
}: {
  companyId: string;
  companySlug: string;
  companyName: string;
  triggerClassName?: string;
  triggerLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [entryOptions, setEntryOptions] = useState<WorkspaceEntryOptions | null>(null);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [selectedGrants, setSelectedGrants] = useState<WorkspaceGrantKey[]>([]);
  const [fullAccess, setFullAccess] = useState(false);

  const handleOpen = () => {
    setError(null);
    setReason("");
    setOpen(true);
    setLoadingOptions(true);
    setEntryOptions(null);
    void fetchWorkspaceEntryOptions().then((options) => {
      setEntryOptions(options);
      if (options) {
        setSelectedGrants(options.defaultGrants);
        setFullAccess(false);
      }
      setLoadingOptions(false);
    });
  };

  const handleSubmit = () => {
    setError(null);
    startTransition(async () => {
      const result = await enterPlatformWorkspace({
        companyId,
        companySlug,
        companyName,
        reason,
        grants: selectedGrants,
        fullAccess,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      window.location.href = result.redirectTo;
    });
  };

  const canSubmit =
    reason.trim().length >= 3 &&
    (fullAccess || selectedGrants.length > 0) &&
    !loadingOptions;

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={cn(
          "inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-700",
          triggerClassName
        )}
      >
        <Building2 className="h-4 w-4" />
        {triggerLabel}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
          <div
            className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="open-workspace-title"
          >
            <div className="mb-4 flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                <Shield className="h-5 w-5" />
              </div>
              <div>
                <h2 id="open-workspace-title" className="text-lg font-bold text-slate-900">
                  Open Workspace
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Enter <span className="font-semibold text-slate-700">{companyName}</span>{" "}
                  as{" "}
                  <span className="font-semibold text-slate-700">
                    {entryOptions?.role.label ?? "Platform Administrator"}
                  </span>
                  . This action is audit logged.
                </p>
              </div>
            </div>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Reason for access
              </span>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
                placeholder="Support ticket, website update, SEO review…"
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none ring-indigo-500 placeholder:text-slate-400 focus:ring-2"
              />
            </label>

            {loadingOptions ? (
              <p className="mt-4 text-sm text-slate-500">Loading permissions…</p>
            ) : entryOptions ? (
              <div className="mt-4">
                <WorkspaceGrantPicker
                  allowedGrants={entryOptions.allowedGrants}
                  selectedGrants={selectedGrants}
                  onChange={setSelectedGrants}
                  fullAccess={fullAccess}
                  onFullAccessChange={setFullAccess}
                  canSelectFullAccess={entryOptions.canSelectFullAccess}
                  disabled={isPending}
                />
              </div>
            ) : (
              <p className="mt-4 text-sm text-red-600">
                Could not load workspace permissions.
              </p>
            )}

            {error ? (
              <p className="mt-3 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            ) : null}

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={isPending}
                className="rounded-xl px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isPending || !canSubmit}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60"
              >
                {isPending ? "Opening…" : "Enter Workspace"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
