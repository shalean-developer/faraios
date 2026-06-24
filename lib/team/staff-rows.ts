import type { CompanyMember } from "@/lib/services/team";
import type { StaffProfile } from "@/types/v6-engine";

export type StaffRow = CompanyMember & {
  profile: StaffProfile | null;
};

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
