"use client";

import { type FormEvent, useState } from "react";
import { Trash2 } from "lucide-react";

import {
  inviteTeamMember,
  removeTeamMember,
  updateTeamMemberRole,
} from "@/app/actions/team";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CompanyMember, CompanyMemberRole } from "@/lib/services/team";
import type { CompanyWithIndustry } from "@/types/database";

const ROLE_LABELS: Record<CompanyMemberRole, string> = {
  owner: "Owner",
  admin: "Admin",
  staff: "Staff",
};

function roleBadgeClass(role: CompanyMemberRole): string {
  switch (role) {
    case "owner":
      return "bg-violet-50 text-violet-700";
    case "admin":
      return "bg-blue-50 text-blue-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

export function CompanyTeamClient({
  slug,
  company,
  members,
  currentUserId,
  canManage,
}: {
  slug: string;
  company: CompanyWithIndustry;
  members: CompanyMember[];
  currentUserId: string;
  canManage: boolean;
}) {
  const [rows, setRows] = useState(members);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<CompanyMemberRole>("staff");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const onInvite = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      const result = await inviteTeamMember({
        companyId: company.id,
        companySlug: slug,
        email,
        role,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      window.location.reload();
    } finally {
      setPending(false);
    }
  };

  const onRoleChange = async (memberUserId: string, nextRole: CompanyMemberRole) => {
    setError(null);
    const result = await updateTeamMemberRole({
      memberUserId,
      companyId: company.id,
      companySlug: slug,
      role: nextRole,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setRows((prev) =>
      prev.map((row) => (row.user_id === memberUserId ? { ...row, role: nextRole } : row))
    );
  };

  const onRemove = async (memberUserId: string) => {
    if (!confirm("Remove this team member?")) return;
    setError(null);
    const result = await removeTeamMember({
      memberUserId,
      companyId: company.id,
      companySlug: slug,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setRows((prev) => prev.filter((row) => row.user_id !== memberUserId));
  };

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
          Settings
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Team</h1>
        <p className="mt-2 text-sm text-slate-500">
          Manage who can access {company.name} on FaraiOS.
        </p>
      </header>

      {canManage ? (
        <form
          onSubmit={onInvite}
          className="mb-8 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[1fr_160px_auto]"
        >
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="colleague@company.com"
            required
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as CompanyMemberRole)}
            className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
          <Button type="submit" className="rounded-xl" disabled={pending}>
            {pending ? "Inviting..." : "Invite member"}
          </Button>
          <p className="text-xs text-slate-500 sm:col-span-3">
            The person must already have a FaraiOS account with this email.
          </p>
        </form>
      ) : (
        <p className="mb-8 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
          Only the workspace owner can invite or remove team members.
        </p>
      )}

      {error ? (
        <p className="mb-4 text-sm font-medium text-red-600">{error}</p>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Member</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              {canManage ? (
                <th className="px-4 py-3 text-right">Actions</th>
              ) : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((row) => (
              <tr key={row.id}>
                <td className="px-4 py-3 font-medium text-slate-900">
                  {row.full_name ?? row.email ?? "Member"}
                  {row.user_id === currentUserId ? (
                    <span className="ml-2 text-xs text-slate-400">(you)</span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-slate-600">{row.email || "—"}</td>
                <td className="px-4 py-3">
                  {canManage && row.role !== "owner" ? (
                    <select
                      value={row.role}
                      onChange={(e) =>
                        onRoleChange(row.user_id, e.target.value as CompanyMemberRole)
                      }
                      className={cn(
                        "rounded-full border-0 px-2.5 py-1 text-xs font-semibold",
                        roleBadgeClass(row.role)
                      )}
                    >
                      <option value="admin">Admin</option>
                      <option value="staff">Staff</option>
                    </select>
                  ) : (
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                        roleBadgeClass(row.role)
                      )}
                    >
                      {ROLE_LABELS[row.role]}
                    </span>
                  )}
                </td>
                {canManage ? (
                  <td className="px-4 py-3 text-right">
                    {row.role !== "owner" && row.user_id !== currentUserId ? (
                      <button
                        type="button"
                        onClick={() => onRemove(row.user_id)}
                        className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                        aria-label="Remove member"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    ) : null}
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
