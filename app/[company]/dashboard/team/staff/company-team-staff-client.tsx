"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useMemo, useState, useTransition } from "react";

import { updateStaffProfileAction } from "@/app/actions/v6-engine";
import { companyTeamPath } from "@/lib/paths/company";
import type { CompanyMember } from "@/lib/services/team";
import { systemRoleLabel } from "@/lib/team/role-display";
import { buildStaffRows } from "@/lib/team/staff-rows";
import {
  riseCardClassName,
  riseOutlineButtonClassName,
  risePageClassName,
  risePrimaryButtonClassName,
} from "@/lib/ui/rise-dashboard-styles";
import { cn } from "@/lib/utils";
import type { CompanyWithIndustry } from "@/types/database";
import type { StaffProfile } from "@/types/v6-engine";

export function CompanyTeamStaffClient({
  slug,
  company,
  members,
  profiles,
  canManage,
  currentUserId,
}: {
  slug: string;
  company: CompanyWithIndustry;
  members: CompanyMember[];
  profiles: StaffProfile[];
  canManage: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
  const staffRows = useMemo(
    () => buildStaffRows(members, profiles),
    [members, profiles]
  );
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const editingRow = staffRows.find((row) => row.user_id === editingUserId);

  const onSaveProfile = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingRow) return;
    const form = new FormData(e.currentTarget);
    const displayName = String(form.get("displayName") ?? "");
    const phone = String(form.get("phone") ?? "");
    const skillsRaw = String(form.get("skills") ?? "");
    const bio = String(form.get("bio") ?? "");
    const skills = skillsRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await updateStaffProfileAction({
        companyId: company.id,
        companySlug: slug,
        userId: editingRow.user_id,
        displayName,
        phone,
        skills,
        bio,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess("Staff profile saved.");
      setEditingUserId(null);
      router.refresh();
    });
  };

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
          <h1 className="mt-2 text-lg font-medium text-slate-800">Staff profiles</h1>
          <p className="mt-1 max-w-2xl text-sm text-slate-500">
            Skills, contact details, and availability notes for people who deliver work on
            bookings and tasks.
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

      <div className={cn(riseCardClassName, "overflow-hidden")}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs font-medium text-slate-500">
              <th className="px-4 py-3">Staff member</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Skills</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3 text-right">Profile</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {staffRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-500">
                  No staff members yet. Invite team members from the Members page.
                </td>
              </tr>
            ) : (
              staffRows.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">
                      {row.profile?.displayName ?? row.full_name ?? row.email}
                    </p>
                    <p className="text-xs text-slate-500">{row.email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                      {systemRoleLabel(row.role)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {row.profile?.skills?.length
                      ? row.profile.skills.join(", ")
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {row.profile?.phone ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {(canManage || row.user_id === currentUserId) && (
                      <button
                        type="button"
                        className={riseOutlineButtonClassName}
                        onClick={() =>
                          setEditingUserId(
                            editingUserId === row.user_id ? null : row.user_id
                          )
                        }
                      >
                        {editingUserId === row.user_id ? "Close" : "Edit"}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editingRow ? (
        <form
          onSubmit={onSaveProfile}
          className={cn(riseCardClassName, "mt-4 space-y-4 p-6")}
        >
          <h2 className="text-lg font-semibold text-slate-900">
            Edit profile — {editingRow.full_name ?? editingRow.email}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Display name</span>
              <input
                name="displayName"
                defaultValue={
                  editingRow.profile?.displayName ?? editingRow.full_name ?? ""
                }
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Phone</span>
              <input
                name="phone"
                defaultValue={editingRow.profile?.phone ?? ""}
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block font-medium text-slate-700">
                Skills (comma-separated)
              </span>
              <input
                name="skills"
                defaultValue={editingRow.profile?.skills?.join(", ") ?? ""}
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
                placeholder="e.g. Plumbing, Electrical, Diagnostics"
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="mb-1 block font-medium text-slate-700">Bio / notes</span>
              <textarea
                name="bio"
                defaultValue={editingRow.profile?.bio ?? ""}
                className="min-h-[80px] w-full rounded-xl border border-slate-200 px-3 py-2"
              />
            </label>
          </div>
          <button type="submit" className={risePrimaryButtonClassName} disabled={pending}>
            {pending ? "Saving..." : "Save profile"}
          </button>
        </form>
      ) : null}

      {!canManage && staffRows.length > 0 ? (
        <p className="mt-4 text-sm text-slate-500">
          You can edit your own profile. Contact the workspace owner to update other
          staff profiles.
        </p>
      ) : null}
    </div>
  );
}
