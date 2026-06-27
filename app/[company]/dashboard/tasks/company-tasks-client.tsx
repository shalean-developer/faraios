"use client";

import { RiseTasksDashboard } from "@/components/company/rise-tasks-dashboard";
import type { TaskListSummary } from "@/lib/services/tasks";
import type { CompanyMember } from "@/lib/services/team";
import type { CompanyWithIndustry } from "@/types/database";
import type { CompanyTask } from "@/types/v6-engine";

export function CompanyTasksClient({
  slug,
  company,
  tasks,
  summary,
  members,
  currentUserId,
}: {
  slug: string;
  company: CompanyWithIndustry;
  tasks: CompanyTask[];
  summary: TaskListSummary;
  members: CompanyMember[];
  currentUserId: string | null;
}) {
  return (
    <RiseTasksDashboard
      slug={slug}
      company={company}
      tasks={tasks}
      summary={summary}
      members={members}
      currentUserId={currentUserId}
    />
  );
}
