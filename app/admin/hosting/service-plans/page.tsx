import { AdminActivityBellLink } from "@/components/admin/admin-activity-bell-link";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { AdminHostingNav } from "@/components/hosting/hosting-shared-ui";
import { riseStatCardClassName } from "@/lib/ui/rise-dashboard-styles";
import { getAdminServicePlans } from "@/lib/services/hosting-admin";

export const metadata = { title: "Service Plans — FaraiOS Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminHostingServicePlansPage() {
  const plans = await getAdminServicePlans();

  return (
    <AdminPageShell
      title="Plesk service plans"
      description="Imported from Plesk via XML API — map to FaraiOS plans"
      maxWidthClassName="max-w-5xl"
      actions={<AdminActivityBellLink />}
    >
      <AdminHostingNav />
      {plans.length === 0 ? (
        <p className="text-sm text-slate-500">
          No Plesk service plans imported yet. Use Servers → Import service plans.
        </p>
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {plans.map((plan) => (
            <div key={plan.id} className={riseStatCardClassName}>
              <p className="font-bold text-slate-900">{plan.name}</p>
              <p className="text-xs text-slate-500">Plesk ID: {plan.plesk_plan_id}</p>
              <ul className="mt-2 space-y-1 text-xs text-slate-600">
                {plan.storage_limit_gb != null && <li>Storage: {plan.storage_limit_gb} GB</li>}
                {plan.mailbox_limit != null && <li>Mailboxes: {plan.mailbox_limit}</li>}
                {plan.ftp_account_limit != null && <li>FTP: {plan.ftp_account_limit}</li>}
                {plan.database_limit != null && (
                  <li>Databases: {plan.database_limit === -1 ? "Unlimited" : plan.database_limit}</li>
                )}
              </ul>
            </div>
          ))}
        </div>
      )}
    </AdminPageShell>
  );
}
