"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";

import { updateStaffProfileAction } from "@/app/actions/v6-engine";
import { Button } from "@/components/ui/button";
import { companyTeamPath } from "@/lib/paths/company";
import type { CompanyMember } from "@/lib/services/team";
import { systemRoleLabel } from "@/lib/team/role-display";
import type { CompanyWithIndustry } from "@/types/database";
import type { StaffProfile } from "@/types/v6-engine";

type StaffRow = CompanyMember & {
  profile: StaffProfile | null;
};

export function CompanyTeamStaffClient({
  slug,
  company,
  staffRows,
  canManage,
  currentUserId,
}: {
  slug: string;
  company: CompanyWithIndustry;
  staffRows: StaffRow[];
  canManage: boolean;
  currentUserId: string;
}) {
  const router = useRouter();
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
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8">
        <Link
          href={companyTeamPath(slug)}
          className="text-sm font-medium text-slate-500 hover:text-slate-800"
        >
          ← Team members
        </Link>
        <p className="mt-3 text-xs font-semibold uppercase tracking-wider text-violet-600">
          Team
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">Staff profiles</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">
          Skills, contact details, and availability notes for people who deliver work on
          bookings and tasks.
        </p>
      </header>

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

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
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
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="rounded-lg"
                        onClick={() =>
                          setEditingUserId(
                            editingUserId === row.user_id ? null : row.user_id
                          )
                        }
                      >
                        {editingUserId === row.user_id ? "Close" : "Edit"}
                      </Button>
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
          className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
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
          <Button type="submit" className="rounded-xl" disabled={pending}>
            {pending ? "Saving..." : "Save profile"}
          </Button>
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

export function buildStaffRows(
  members: CompanyMember[],
  profiles: StaffProfile[]
): StaffRow[] {
  const profileByUser = new Map(profiles.map((p) => [p.userId, p]));
  return members.map((member) => ({
    ...member,
    profile: profileByUser.get(member.user_id) ?? null,
  }));
}
