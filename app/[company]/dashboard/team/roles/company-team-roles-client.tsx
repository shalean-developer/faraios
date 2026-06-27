"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { updateRolePermissionsAction } from "@/app/actions/v6-engine";
import {
  createCompanyRoleAction,
  deleteCompanyRoleAction,
  updateCustomRolePermissionsAction,
} from "@/app/actions/phase-c";
import { companyTeamPath } from "@/lib/paths/company";
import {
  PERMISSION_KEYS,
  PERMISSION_LABELS,
  type PermissionKey,
} from "@/lib/permissions/shared";
import { ROLE_DESCRIPTIONS } from "@/lib/team/assignable-roles";
import type { CompanyRoleRecord } from "@/lib/team/role-display";
import { systemRoleLabel } from "@/lib/team/role-display";
import type { CompanyMemberRole } from "@/lib/services/team";
import {
  riseCardClassName,
  riseOutlineButtonClassName,
  risePageClassName,
  risePrimaryButtonClassName,
} from "@/lib/ui/rise-dashboard-styles";
import { cn } from "@/lib/utils";
import type { CompanyWithIndustry } from "@/types/database";

const EDITABLE_ROLES: CompanyMemberRole[] = [
  "admin",
  "manager",
  "staff",
  "finance",
  "marketing",
];

const ROLE_LABELS: Record<CompanyMemberRole, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  staff: "Staff",
  finance: "Finance",
  marketing: "Marketing",
};

export function CompanyTeamRolesClient({
  slug,
  company,
  rolePermissions,
  customRoles,
  canEdit,
}: {
  slug: string;
  company: CompanyWithIndustry;
  rolePermissions: { role: string; permissions: PermissionKey[] }[];
  customRoles: CompanyRoleRecord[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [activeRole, setActiveRole] = useState<string>("admin");
  const [drafts, setDrafts] = useState<Record<string, PermissionKey[]>>(() =>
    Object.fromEntries(rolePermissions.map((r) => [r.role, r.permissions]))
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [newRoleLabel, setNewRoleLabel] = useState("");
  const [activeCustomRole, setActiveCustomRole] = useState<string | null>(
    customRoles[0]?.roleKey ?? null
  );

  const activePermissions = drafts[activeRole] ?? [];
  const activeCustomPermissions =
    (activeCustomRole ? drafts[activeCustomRole] : undefined) ?? [];

  const togglePermission = (permission: PermissionKey, roleKey = activeRole) => {
    if (!canEdit || roleKey === "owner") return;
    setDrafts((current) => {
      const existing = current[roleKey] ?? [];
      const next = existing.includes(permission)
        ? existing.filter((p) => p !== permission)
        : [...existing, permission];
      return { ...current, [roleKey]: next };
    });
  };

  const onSave = () => {
    if (!canEdit || activeRole === "owner") return;
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await updateRolePermissionsAction({
        companyId: company.id,
        companySlug: slug,
        role: activeRole,
        permissions: drafts[activeRole] ?? [],
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(`Permissions saved for ${systemRoleLabel(activeRole)}.`);
      router.refresh();
    });
  };

  const onSaveCustomRole = () => {
    if (!canEdit || !activeCustomRole) return;
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await updateCustomRolePermissionsAction({
        companyId: company.id,
        companySlug: slug,
        roleKey: activeCustomRole,
        permissions: drafts[activeCustomRole] ?? [],
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess("Custom role permissions saved.");
      router.refresh();
    });
  };

  const onCreateCustomRole = () => {
    if (!canEdit || !newRoleLabel.trim()) return;
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await createCompanyRoleAction({
        companyId: company.id,
        companySlug: slug,
        label: newRoleLabel.trim(),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setNewRoleLabel("");
      setSuccess("Custom role created.");
      router.refresh();
    });
  };

  const onDeleteCustomRole = (roleKey: string) => {
    if (!canEdit) return;
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await deleteCompanyRoleAction({
        companyId: company.id,
        companySlug: slug,
        roleKey,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess("Custom role deleted.");
      router.refresh();
    });
  };

  const groupedPermissions = PERMISSION_KEYS.reduce<
    Record<string, PermissionKey[]>
  >((acc, key) => {
    const category = PERMISSION_LABELS[key].category;
    acc[category] = acc[category] ?? [];
    acc[category].push(key);
    return acc;
  }, {});

  return (
    <div className={risePageClassName}>
      <div className={cn(riseCardClassName, "mb-4")}>
        <div className="px-4 py-4">
          <Link
            href={companyTeamPath(slug)}
            className="text-sm font-medium text-slate-500 hover:text-slate-800"
          >
            ← Team members
          </Link>
          <h1 className="mt-2 text-lg font-medium text-slate-800">Roles & permissions</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Control what each role can access across Operations, Revenue, Growth, and
            Intelligence. Owner always has full access.
          </p>
        </div>
      </div>

      {error ? (
        <p className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </p>
      ) : null}

      {!canEdit ? (
        <div className={cn(riseCardClassName, "mb-4 p-4 text-sm text-slate-600")}>
          Only the workspace owner can edit role permissions. You can review the matrix
          below.
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
        <nav className="flex flex-row gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
          {(["owner", ...EDITABLE_ROLES] as CompanyMemberRole[]).map((role) => (
            <button
              key={role}
              type="button"
              onClick={() => setActiveRole(role)}
              className={cn(
                "rounded-md px-4 py-2.5 text-left text-sm font-medium transition-colors",
                activeRole === role
                  ? "bg-[#5a8dee] text-white"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              )}
            >
              {ROLE_LABELS[role]}
            </button>
          ))}
        </nav>

        <div className={cn(riseCardClassName, "p-6")}>
          <h2 className="text-lg font-semibold text-slate-900">
            {systemRoleLabel(activeRole)}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {ROLE_DESCRIPTIONS[activeRole as CompanyMemberRole] ??
              "Custom or extended role permissions."}
          </p>

          {activeRole === "owner" ? (
            <p className="mt-6 text-sm text-slate-600">
              Owners always have full access to every section and cannot be restricted.
            </p>
          ) : (
            <div className="mt-6 space-y-6">
              {Object.entries(groupedPermissions).map(([category, keys]) => (
                <section key={category}>
                  <h3 className="text-xs font-medium text-slate-500">{category}</h3>
                  <ul className="mt-3 space-y-2">
                    {keys.map((permission) => {
                      const checked = activePermissions.includes(permission);
                      return (
                        <li key={permission}>
                          <label
                            className={cn(
                              "flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm",
                              checked
                                ? "border-[#5a8dee]/30 bg-[#eef2ff]/60"
                                : "border-slate-200 bg-white",
                              !canEdit && "cursor-default opacity-80"
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              disabled={!canEdit || pending}
                              onChange={() => togglePermission(permission)}
                            />
                            <span className="font-medium text-slate-900">
                              {PERMISSION_LABELS[permission].label}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </section>
              ))}

              {canEdit ? (
                <button
                  type="button"
                  className={risePrimaryButtonClassName}
                  disabled={pending}
                  onClick={onSave}
                >
                  {pending ? "Saving..." : `Save ${systemRoleLabel(activeRole)} permissions`}
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>

      <section className={cn(riseCardClassName, "mt-4 p-6")}>
        <h2 className="text-lg font-semibold text-slate-900">Custom roles</h2>
        <p className="mt-1 text-sm text-slate-500">
          Create company-specific roles and assign them to team members from the team page.
        </p>

        {canEdit ? (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              value={newRoleLabel}
              onChange={(e) => setNewRoleLabel(e.target.value)}
              placeholder="e.g. Dispatcher"
              className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
            <button
              type="button"
              className={risePrimaryButtonClassName}
              disabled={pending}
              onClick={onCreateCustomRole}
            >
              Add custom role
            </button>
          </div>
        ) : null}

        {customRoles.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No custom roles yet.</p>
        ) : (
          <div className="mt-6 grid gap-6 lg:grid-cols-[220px_1fr]">
            <nav className="flex flex-row gap-2 overflow-x-auto lg:flex-col">
              {customRoles.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => setActiveCustomRole(role.roleKey)}
                  className={cn(
                    "rounded-md px-4 py-2.5 text-left text-sm font-medium",
                    activeCustomRole === role.roleKey
                      ? "bg-[#5a8dee] text-white"
                      : "border border-slate-200 bg-slate-50 text-slate-700"
                  )}
                >
                  {role.label}
                </button>
              ))}
            </nav>

            {activeCustomRole ? (
              <div>
                <div className="space-y-6">
                  {Object.entries(groupedPermissions).map(([category, keys]) => (
                    <section key={`custom-${category}`}>
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {category}
                      </h3>
                      <ul className="mt-3 space-y-2">
                        {keys.map((permission) => {
                          const checked = activeCustomPermissions.includes(permission);
                          return (
                            <li key={`custom-${permission}`}>
                              <label className="flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm">
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  disabled={!canEdit || pending}
                                  onChange={() => togglePermission(permission, activeCustomRole)}
                                />
                                <span className="font-medium text-slate-900">
                                  {PERMISSION_LABELS[permission].label}
                                </span>
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    </section>
                  ))}
                </div>
                {canEdit ? (
                  <div className="mt-6 flex flex-wrap gap-2">
                    <button
                      type="button"
                      className={risePrimaryButtonClassName}
                      disabled={pending}
                      onClick={onSaveCustomRole}
                    >
                      Save custom role permissions
                    </button>
                    <button
                      type="button"
                      className={riseOutlineButtonClassName}
                      disabled={pending}
                      onClick={() => onDeleteCustomRole(activeCustomRole)}
                    >
                      Delete role
                    </button>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        )}
      </section>
    </div>
  );
}
