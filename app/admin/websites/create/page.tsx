import Link from "next/link";

import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { AdminCreateWebsiteForm } from "@/components/websites/admin-create-website-form";
import { risePrimaryButtonClassName } from "@/lib/ui/rise-dashboard-styles";
import { getAdminQueryClient, isCurrentUserPlatformAdmin } from "@/lib/services/admin";

export const metadata = {
  title: "Admin Create Website — FaraiOS",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function AccessDenied() {
  return (
    <AdminPageShell title="Admin access required">
      <Link href="/admin" className={risePrimaryButtonClassName}>
        Back to admin
      </Link>
    </AdminPageShell>
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
    <AdminPageShell
      title="Create Website"
      description="Generate a new website for a selected client."
      actions={
        <Link href="/admin/websites" className={risePrimaryButtonClassName}>
          Back to websites
        </Link>
      }
      maxWidthClassName="max-w-3xl"
    >
      <AdminCreateWebsiteForm
        companies={((data ?? []) as { id: string; name: string }[])}
        initialCompanyId={companyId ?? ""}
      />
    </AdminPageShell>
  );
}
