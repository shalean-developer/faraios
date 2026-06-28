"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AdminActivityBellLink } from "@/components/admin/admin-activity-bell-link";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import {
  AdminHostingNav,
  formatHostingAmount,
  HostingStatusBadge,
} from "@/components/hosting/hosting-shared-ui";
import { Button } from "@/components/ui/button";
import {
  riseStatCardClassName,
  riseTableClassName,
  riseTableHeadRowClassName,
} from "@/lib/ui/rise-dashboard-styles";
import { formatDateTimeEnZA } from "@/lib/format/dates";
import {
  adminChangeHostingPackageAction,
  adminManualProvisionAction,
  adminRemoveHostingOrderAction,
  adminResetHostingPasswordAction,
  adminRetryProvisioningAction,
  adminSuspendHostingServiceAction,
  adminTerminateHostingServiceAction,
  adminUnsuspendHostingServiceAction,
} from "@/app/actions/hosting-admin";

type ServiceRow = {
  id: string;
  domain_name: string;
  status: string;
  username: string | null;
  plesk_subscription_id: string | null;
  next_due_date: string | null;
  hosting_plans?: { name: string; slug: string };
  companies?: { name: string; slug: string };
  hosting_servers?: { name: string };
};

type OrderRow = {
  id: string;
  domain_name: string;
  status: string;
  payment_status: string;
  provisioning_status: string;
  billing_cycle: string;
  hosting_plans?: { name: string };
  companies?: { name: string; slug: string };
};

type LogRow = {
  id: string;
  action: string;
  status: string;
  error_message: string | null;
  created_at: string;
  hosting_orders?: { domain_name: string };
};

export function FaraiAdminHostingServices({
  services,
}: {
  services: ServiceRow[];
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  const run = (action: () => Promise<{ ok: boolean; error?: string }>, serviceId: string) => {
    setMessage(null);
    startTransition(() => {
      void (async () => {
        const result = await action();
        setMessage(result.ok ? `Action completed for ${serviceId.slice(0, 8)}` : result.error ?? "Failed");
      })();
    });
  };

  return (
    <AdminPageShell
      title="Hosting services"
      actions={<AdminActivityBellLink />}
    >
      <AdminHostingNav />
      {message && <p className="text-sm text-slate-600">{message}</p>}
      <div className={riseTableClassName}>
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className={riseTableHeadRowClassName}>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Domain</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Business</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Plan</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Status</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {services.map((service) => (
              <tr key={service.id} className="border-b border-slate-100 text-sm">
                <td className="px-4 py-3 font-semibold text-slate-900">{service.domain_name}</td>
                <td className="px-4 py-3 text-slate-600">{service.companies?.name ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{service.hosting_plans?.name ?? "—"}</td>
                <td className="px-4 py-3"><HostingStatusBadge status={service.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => adminSuspendHostingServiceAction(service.id), service.id)}>Suspend</Button>
                    <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => adminUnsuspendHostingServiceAction(service.id), service.id)}>Unsuspend</Button>
                    <Button size="sm" variant="outline" disabled={pending} onClick={() => run(() => adminResetHostingPasswordAction(service.id), service.id)}>Reset pwd</Button>
                    <Button size="sm" variant="destructive" disabled={pending} onClick={() => run(() => adminTerminateHostingServiceAction(service.id), service.id)}>Terminate</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminPageShell>
  );
}

export function FaraiAdminHostingOrders({ orders }: { orders: OrderRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canRemove = (status: string) =>
    status === "failed" || status === "cancelled" || status === "pending";

  return (
    <AdminPageShell
      title="Hosting orders"
      actions={<AdminActivityBellLink />}
    >
      <AdminHostingNav />
      {message ? <p className="text-sm text-emerald-700">{message}</p> : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <div className={riseTableClassName}>
        <table className="w-full min-w-[900px]">
          <thead>
            <tr className={riseTableHeadRowClassName}>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Domain</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Business</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Plan</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Status</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-widest text-slate-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b border-slate-100 text-sm">
                <td className="px-4 py-3 font-semibold text-slate-900">{order.domain_name}</td>
                <td className="px-4 py-3 text-slate-600">{order.companies?.name ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{order.hosting_plans?.name ?? "—"}</td>
                <td className="px-4 py-3"><HostingStatusBadge status={order.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {order.status === "failed" && (
                      <Button size="sm" variant="outline" disabled={pending} onClick={() => startTransition(() => { void adminRetryProvisioningAction(order.id); })}>
                        Retry
                      </Button>
                    )}
                    {(order.status === "paid" || order.status === "pending") && (
                      <Button size="sm" variant="outline" disabled={pending} onClick={() => startTransition(() => { void adminManualProvisionAction(order.id); })}>
                        Provision
                      </Button>
                    )}
                    {canRemove(order.status) && (
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={pending}
                        onClick={() => {
                          setMessage(null);
                          setError(null);
                          startTransition(async () => {
                            const result = await adminRemoveHostingOrderAction(order.id);
                            if (!result.ok) {
                              setError(result.error);
                              return;
                            }
                            setMessage(`Removed ${result.domainName ?? order.domain_name}.`);
                            router.refresh();
                          });
                        }}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminPageShell>
  );
}

export function FaraiAdminHostingLogs({ logs }: { logs: LogRow[] }) {
  return (
    <AdminPageShell
      title="Provisioning logs"
      actions={<AdminActivityBellLink />}
    >
      <AdminHostingNav />
      <div className="space-y-3">
        {logs.map((log) => (
          <div key={log.id} className={riseStatCardClassName}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-bold text-slate-900">{log.action}</p>
                <p className="text-xs text-slate-500">{log.hosting_orders?.domain_name ?? "—"} · {formatDateTimeEnZA(log.created_at)}</p>
              </div>
              <HostingStatusBadge status={log.status} />
            </div>
            {log.error_message && (
              <p className="mt-2 text-xs text-red-600">{log.error_message}</p>
            )}
          </div>
        ))}
      </div>
    </AdminPageShell>
  );
}

export function FaraiAdminHostingPlans({
  plans,
}: {
  plans: Array<{
    id: string;
    slug: string;
    name: string;
    monthly_price_cents: number;
    yearly_price_cents: number;
    is_active: boolean;
    is_popular: boolean;
  }>;
}) {
  return (
    <AdminPageShell
      title="Hosting plans"
      actions={<AdminActivityBellLink />}
    >
      <AdminHostingNav />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {plans.map((plan) => (
          <div key={plan.id} className={riseStatCardClassName}>
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">{plan.name}</h2>
              {plan.is_popular && <span className="text-[10px] font-bold uppercase text-[#5a8dee]">Popular</span>}
            </div>
            <p className="text-xs text-slate-500">{plan.slug}</p>
            <p className="mt-3 text-lg font-extrabold text-slate-900">{formatHostingAmount(plan.monthly_price_cents)}/mo</p>
            <p className="text-xs text-slate-500">{formatHostingAmount(plan.yearly_price_cents)}/yr</p>
            <div className="mt-3"><HostingStatusBadge status={plan.is_active ? "active" : "cancelled"} /></div>
          </div>
        ))}
      </div>
    </AdminPageShell>
  );
}
