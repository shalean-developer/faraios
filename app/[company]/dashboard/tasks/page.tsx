import { notFound } from "next/navigation";

import { getCompanyBySlug } from "@/lib/services/companies";
import { listCompanyMembers } from "@/lib/services/team";
import { listTasks, summarizeTasks } from "@/lib/services/tasks";
import { createClient } from "@/lib/supabase/server";

import { CompanyTasksClient } from "./company-tasks-client";

type Props = { params: Promise<{ company: string }> };

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Tasks — FaraiOS",
  robots: { index: false, follow: false },
};

export default async function TasksPage({ params }: Props) {
  const { company } = await params;
  const slug = decodeURIComponent(company);
  const row = await getCompanyBySlug(slug);
  if (!row) notFound();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [tasks, members] = await Promise.all([
    listTasks(row.id),
    listCompanyMembers(row.id),
  ]);

  return (
    <CompanyTasksClient
      slug={slug}
      company={row}
      tasks={tasks}
      summary={summarizeTasks(tasks)}
      members={members}
      currentUserId={user?.id ?? null}
    />
  );
}
