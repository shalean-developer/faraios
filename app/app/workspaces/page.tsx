import { redirect } from "next/navigation";

import { WorkspacePicker } from "@/components/app/workspace-picker";
import { listCompaniesForUser } from "@/lib/services/memberships";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "Choose workspace — Shalean",
  description: "Select which Shalean workspace to open.",
};

export const dynamic = "force-dynamic";

export default async function WorkspacesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  const companies = await listCompaniesForUser(user.id);

  if (companies.length === 1) {
    redirect(`/${encodeURIComponent(companies[0].slug)}/dashboard`);
  }

  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-12 sm:px-6">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">Shalean</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">Choose a workspace</h1>
        <p className="mt-2 text-sm text-slate-600">
          Your account has access to multiple businesses. Pick one to continue.
        </p>
      </header>
      <WorkspacePicker companies={companies} />
    </main>
  );
}
