"use client";

import {
  WORKSPACE_GRANT_PRESETS,
} from "@/lib/platform/platform-role-definitions";
import { WORKSPACE_GRANT_LABELS } from "@/lib/platform/workspace-grants";
import type { WorkspaceGrantKey } from "@/types/platform-workspace";
import { cn } from "@/lib/utils";

const GRANT_GROUPS: { label: string; grants: WorkspaceGrantKey[] }[] = [
  {
    label: "Operations",
    grants: ["bookings", "customers", "crm", "support", "employees"],
  },
  {
    label: "Revenue",
    grants: ["invoices", "payments", "reports"],
  },
  {
    label: "Growth",
    grants: ["marketing", "seo", "analytics", "marketplace"],
  },
  {
    label: "Website & Agency",
    grants: ["website", "media", "files", "domains", "automation"],
  },
  {
    label: "Administration",
    grants: ["settings"],
  },
];

export function WorkspaceGrantPicker({
  allowedGrants,
  selectedGrants,
  onChange,
  fullAccess,
  onFullAccessChange,
  canSelectFullAccess,
  disabled = false,
}: {
  allowedGrants: WorkspaceGrantKey[];
  selectedGrants: WorkspaceGrantKey[];
  onChange: (grants: WorkspaceGrantKey[]) => void;
  fullAccess: boolean;
  onFullAccessChange: (value: boolean) => void;
  canSelectFullAccess: boolean;
  disabled?: boolean;
}) {
  const allowed = new Set(allowedGrants);

  const toggleGrant = (grant: WorkspaceGrantKey) => {
    if (fullAccess || disabled || !allowed.has(grant)) return;
    if (selectedGrants.includes(grant)) {
      onChange(selectedGrants.filter((item) => item !== grant));
      return;
    }
    onChange([...selectedGrants, grant]);
  };

  const applyPreset = (grants: WorkspaceGrantKey[]) => {
    if (fullAccess || disabled) return;
    onChange(grants.filter((grant) => allowed.has(grant)));
  };

  return (
    <div className="space-y-4">
      {canSelectFullAccess ? (
        <label className="flex items-start gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 px-3 py-3">
          <input
            type="checkbox"
            checked={fullAccess}
            disabled={disabled}
            onChange={(event) => onFullAccessChange(event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600"
          />
          <span>
            <span className="block text-sm font-semibold text-slate-900">
              Full workspace access
            </span>
            <span className="mt-0.5 block text-xs text-slate-500">
              Grant all business permissions for this session.
            </span>
          </span>
        </label>
      ) : null}

      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Quick presets
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {WORKSPACE_GRANT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              disabled={disabled || fullAccess}
              onClick={() => applyPreset(preset.grants)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 disabled:opacity-50"
              title={preset.description}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className={cn(fullAccess && "pointer-events-none opacity-50")}>
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Permissions for this session
        </p>
        <div className="mt-2 space-y-3">
          {GRANT_GROUPS.map((group) => {
            const visibleGrants = group.grants.filter((grant) => allowed.has(grant));
            if (visibleGrants.length === 0) return null;

            return (
              <div key={group.label}>
                <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  {group.label}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {visibleGrants.map((grant) => {
                    const checked = fullAccess || selectedGrants.includes(grant);
                    return (
                      <label
                        key={grant}
                        className={cn(
                          "flex items-center gap-2 rounded-lg border px-2.5 py-2 text-xs font-medium",
                          checked
                            ? "border-indigo-200 bg-indigo-50 text-indigo-800"
                            : "border-slate-200 bg-white text-slate-700"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={disabled || fullAccess}
                          onChange={() => toggleGrant(grant)}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600"
                        />
                        {WORKSPACE_GRANT_LABELS[grant]}
                      </label>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
