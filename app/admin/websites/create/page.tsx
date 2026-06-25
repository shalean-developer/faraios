import Link from "next/link";

import { AdminCreateWebsiteForm } from "@/components/websites/admin-create-website-form";
import { getAdminQueryClient, isCurrentUserPlatformAdmin } from "@/lib/services/admin";

export const metadata = {
  title: "Admin Create Website — Shalean",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function AccessDenied() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Admin access required</h1>
      <Link href="/admin" className="mt-6 inline-block text-sm font-medium text-violet-700 hover:text-violet-900">
        ← Back to admin
      </Link>
    </main>
  );
}

export default async function AdminCreateWebsitePage({
  searchParams,
}: {
  searchParams: Promise<{ companyId?: string }>;
}) {
  if (!(await isCurrentUserPlatformAdmin())) return <AccessDenied />;
  const { companyId } = await searchParams;
  const supabase = await getAdminQueryClient();
  const { data } = await supabase
    .from("companies")
    .select("id,name")
    .order("name", { ascending: true });

  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-6">
        <Link href="/admin/websites" className="text-sm font-medium text-violet-700 transition-colors hover:text-violet-900">
          ← Back to websites
        </Link>
      </div>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Create Website</h1>
      <p className="mt-2 text-sm text-slate-500">Generate a new website for a selected client.</p>
      <div className="mt-6">
        <AdminCreateWebsiteForm
          companies={((data ?? []) as { id: string; name: string }[])}
          initialCompanyId={companyId ?? ""}
        />
      </div>
    </main>
  );
}
