"use client";

import type { ComponentType } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useState, useTransition } from "react";
import { ArrowRight, Settings, Shield, Trash2, UserPlus, Users } from "lucide-react";

import {
  inviteTeamMember,
  removeTeamMember,
  updateTeamMemberRole,
} from "@/app/actions/team";
import { ClientOnly } from "@/components/client-only";
import { Button } from "@/components/ui/button";
import {
  companyDashboardPath,
  companyTeamRolesPath,
  companyTeamStaffPath,
} from "@/lib/paths/company";
import {
  ASSIGNABLE_MEMBER_ROLES,
  ROLE_DESCRIPTIONS,
} from "@/lib/team/assignable-roles";
import { roleDisplayLabel, type CompanyRoleRecord } from "@/lib/team/role-display";
import type { CompanyMember, CompanyMemberRole, TeamSummary } from "@/lib/services/team";
import { cn } from "@/lib/utils";
import type { CompanyWithIndustry } from "@/types/database";

const ROLE_LABELS: Record<CompanyMemberRole, string> = {
  owner: "Owner",
  admin: "Admin",
  manager: "Manager",
  staff: "Staff",
  finance: "Finance",
  marketing: "Marketing",
};

function MetricCard({
  label,
  value,
  hint,
  highlight,
}: {
  label: string;
  value: string;
  hint?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border p-4 shadow-sm",
        highlight
          ? "border-2 border-violet-200 bg-gradient-to-br from-violet-50/70 to-white"
          : "border-slate-200 bg-white"
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
      {hint ? <p className="mt-1 text-xs text-slate-400">{hint}</p> : null}
    </div>
  );
}

function roleBadgeClass(role: string): string {
  switch (role as CompanyMemberRole) {
    case "owner":
      return "bg-violet-50 text-violet-700";
    case "admin":
      return "bg-blue-50 text-blue-700";
    case "manager":
      return "bg-indigo-50 text-indigo-700";
    case "finance":
      return "bg-emerald-50 text-emerald-700";
    case "marketing":
      return "bg-pink-50 text-pink-700";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

export function CompanyTeamClient({
  slug,
  company,
  members,
  summary,
  currentUserId,
  canManage,
  customRoles,
}: {
  slug: string;
  company: CompanyWithIndustry;
  members: CompanyMember[];
  summary: TeamSummary;
  currentUserId: string;
  canManage: boolean;
  customRoles: CompanyRoleRecord[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [rolePending, startRoleTransition] = useTransition();
  const [rows, setRows] = useState(members);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<string>("staff");
  const assignableRoles = [
    ...ASSIGNABLE_MEMBER_ROLES,
    ...customRoles.map((item) => item.roleKey),
  ];
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    setRows(members);
  }, [members]);

  const statCards = [
    { label: "Team members", value: String(summary.total), hint: "With workspace access" },
    { label: "Admins", value: String(summary.admins), hint: "Can manage operations" },
    { label: "Staff", value: String(summary.staff), hint: "Day-to-day access" },
    {
      label: "Your access",
      value: canManage ? "Owner" : "Member",
      hint: canManage ? "Can invite & remove" : "View only",
      highlight: canManage,
    },
  ];

  const quickLinks: { href: string; label: string; icon: ComponentType<{ className?: string }> }[] =
    [
      { href: companyTeamStaffPath(slug), label: "Staff profiles", icon: Users },
      { href: companyTeamRolesPath(slug), label: "Roles & permissions", icon: Shield },
      { href: companyDashboardPath(slug), label: "Overview", icon: Settings },
    ];

  const onInvite = (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    startTransition(async () => {
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
      setEmail("");
      setRole("staff");
      setSuccess("Team member invited.");
      router.refresh();
    });
  };

  const onRoleChange = (memberUserId: string, nextRole: string) => {
    setError(null);
    setSuccess(null);
    startRoleTransition(async () => {
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
      setSuccess("Role updated.");
      router.refresh();
    });
  };

  const onRemove = (memberUserId: string) => {
    if (!confirm("Remove this team member?")) return;
    setError(null);
    setSuccess(null);
    startRoleTransition(async () => {
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
      setSuccess("Team member removed.");
      router.refresh();
    });
  };

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <Link
          href={companyDashboardPath(slug)}
          className="text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          ← Dashboard
        </Link>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-violet-600">
          Team
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Members</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Manage who can access {company.name} on FaraiOS. Assign roles for operations,
          finance, marketing, and administration.
        </p>
      </header>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((card) => (
          <MetricCard key={card.label} {...card} />
        ))}
      </div>

      {error ? (
        <p className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {success}
        </p>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-[1fr_280px]">
        <div className="space-y-8">
          {canManage ? (
            <ClientOnly
              fallback={
                <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="h-6 w-40 animate-pulse rounded bg-slate-100" />
                  <div className="grid gap-3 sm:grid-cols-[1fr_160px_auto]">
                    <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
                    <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
                    <div className="h-10 animate-pulse rounded-xl bg-slate-100" />
                  </div>
                </div>
              }
            >
              <form
                onSubmit={onInvite}
                className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Invite member</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      They must sign up first with the same email you invite. Role:{" "}
                      {ROLE_DESCRIPTIONS[role as CompanyMemberRole] ??
                        "Custom role with permissions defined in Roles & permissions."}
                    </p>
                  </div>
                  <UserPlus className="h-5 w-5 shrink-0 text-slate-300" aria-hidden />
                </div>
                <div className="grid gap-3 sm:grid-cols-[1fr_160px_auto]">
                  <input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    suppressHydrationWarning
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    placeholder="colleague@company.com"
                    required
                  />
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as CompanyMemberRole)}
                    suppressHydrationWarning
                    className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  >
                    {assignableRoles.map((memberRole) => (
                      <option key={memberRole} value={memberRole}>
                        {roleDisplayLabel(memberRole, customRoles)}
                      </option>
                    ))}
                  </select>
                  <Button type="submit" className="rounded-xl" disabled={pending}>
                    {pending ? "Inviting..." : "Invite"}
                  </Button>
                </div>
              </form>
            </ClientOnly>
          ) : (
            <div className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <Shield className="mt-0.5 h-5 w-5 shrink-0 text-slate-400" />
              <p className="text-sm text-slate-500">
                Only the workspace owner can invite or remove team members. Contact your owner if
                you need access changes.
              </p>
            </div>
          )}

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-4 py-3">
              <h2 className="text-sm font-semibold text-slate-900">Members</h2>
            </div>
            {rows.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-slate-500">No team members yet.</p>
            ) : (
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
                            onChange={(e) => onRoleChange(row.user_id, e.target.value)}
                            disabled={rolePending}
                            suppressHydrationWarning
                            className={cn(
                              "rounded-full border-0 px-2.5 py-1 text-xs font-semibold",
                              roleBadgeClass(row.role)
                            )}
                          >
                            {assignableRoles.map((memberRole) => (
                              <option key={memberRole} value={memberRole}>
                                {roleDisplayLabel(memberRole, customRoles)}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className={cn(
                              "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                              roleBadgeClass(row.role)
                            )}
                          >
                            {roleDisplayLabel(row.role, customRoles)}
                          </span>
                        )}
                      </td>
                      {canManage ? (
                        <td className="px-4 py-3 text-right">
                          {row.role !== "owner" && row.user_id !== currentUserId ? (
                            <button
                              type="button"
                              onClick={() => onRemove(row.user_id)}
                              disabled={rolePending}
                              className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
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
            )}
          </div>
        </div>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Quick links
            </p>
            <ul className="mt-3 space-y-1">
              {quickLinks.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
                  >
                    <span className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-slate-400" />
                      {label}
                    </span>
                    <ArrowRight className="h-4 w-4 text-slate-300" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
