"use client";

import { useState, useTransition } from "react";
import { AdminActivityBellLink } from "@/components/admin/admin-activity-bell-link";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { AdminHostingNav, HostingStatusBadge } from "@/components/hosting/hosting-shared-ui";
import { Button } from "@/components/ui/button";
import {
  riseStatCardClassName,
} from "@/lib/ui/rise-dashboard-styles";
import {
  adminAddDnsRecordAction,
  adminCreateDatabaseAction,
  adminCreateFtpAction,
  adminCreateMailboxAction,
  adminDeleteDnsRecordAction,
  adminForceSyncFaraiosDnsAction,
  adminForceWireFaraiosSiteAction,
} from "@/app/actions/hosting-admin";

type ServiceOption = { id: string; domain_name: string; status: string };

export function FaraiAdminHostingResources({
  title,
  description,
  resourceType,
  services,
  records,
}: {
  title: string;
  description: string;
  resourceType: "dns" | "mailboxes" | "ftp" | "databases" | "domains";
  services: ServiceOption[];
  records: Record<string, unknown>[];
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [form, setForm] = useState({
    mailboxName: "",
    username: "",
    dbName: "",
    dbUser: "",
    dnsType: "A",
    dnsHost: "@",
    dnsValue: "",
    dnsPriority: "",
  });

  const submit = () => {
    if (!serviceId) return;
    startTransition(() => {
      void (async () => {
        let result: { ok: boolean; error?: string } = { ok: false, error: "Unknown action." };
        if (resourceType === "mailboxes") {
          result = await adminCreateMailboxAction({ serviceId, mailboxName: form.mailboxName });
        } else if (resourceType === "ftp") {
          result = await adminCreateFtpAction({ serviceId, username: form.username });
        } else if (resourceType === "databases") {
          result = await adminCreateDatabaseAction({
            serviceId,
            dbName: form.dbName,
            dbUser: form.dbUser || undefined,
          });
        } else if (resourceType === "dns") {
          result = await adminAddDnsRecordAction({
            serviceId,
            type: form.dnsType,
            host: form.dnsHost,
            value: form.dnsValue,
            priority: form.dnsPriority ? parseInt(form.dnsPriority, 10) : undefined,
          });
        }
        setMessage(result.ok ? "Created successfully." : result.error ?? "Failed.");
      })();
    });
  };

  const deleteDns = (recordId: string) => {
    startTransition(() => {
      void (async () => {
        const result = await adminDeleteDnsRecordAction(serviceId, recordId);
        setMessage(result.ok ? "Deleted." : result.error ?? "Failed.");
      })();
    });
  };

  const syncFaraiosDns = () => {
    if (!serviceId) return;
    setMessage(null);
    startTransition(() => {
      void (async () => {
        const result = await adminForceSyncFaraiosDnsAction(serviceId);
        setMessage(result.ok ? result.message ?? "DNS synced." : result.error ?? "Sync failed.");
      })();
    });
  };

  const wireFaraiosSite = () => {
    if (!serviceId) return;
    setMessage(null);
    startTransition(() => {
      void (async () => {
        const result = await adminForceWireFaraiosSiteAction(serviceId);
        setMessage(result.ok ? result.message ?? "Site wired." : result.error ?? "Wire failed.");
      })();
    });
  };

  return (
    <AdminPageShell
      title={title}
      description={description}
      maxWidthClassName="max-w-6xl"
      actions={<AdminActivityBellLink />}
    >
          <AdminHostingNav />
          {message && <p className="text-sm text-slate-600">{message}</p>}

          {resourceType !== "domains" && services.length > 0 && (
            <section className={`${riseStatCardClassName} space-y-3`}>
              <h2 className="text-sm font-bold text-gray-900">Create resource</h2>
              <label className="block text-xs font-semibold text-gray-600">
                Service / domain
                <select className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>{s.domain_name} ({s.status})</option>
                  ))}
                </select>
              </label>
              {resourceType === "mailboxes" && (
                <label className="block text-xs font-semibold text-gray-600">
                  Mailbox name
                  <input className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" value={form.mailboxName} onChange={(e) => setForm({ ...form, mailboxName: e.target.value })} placeholder="info" />
                </label>
              )}
              {resourceType === "ftp" && (
                <label className="block text-xs font-semibold text-gray-600">
                  FTP username
                  <input className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} />
                </label>
              )}
              {resourceType === "databases" && (
                <>
                  <label className="block text-xs font-semibold text-gray-600">
                    Database name
                    <input className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" value={form.dbName} onChange={(e) => setForm({ ...form, dbName: e.target.value })} />
                  </label>
                  <label className="block text-xs font-semibold text-gray-600">
                    Database user (optional)
                    <input className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" value={form.dbUser} onChange={(e) => setForm({ ...form, dbUser: e.target.value })} />
                  </label>
                </>
              )}
              {resourceType === "dns" && (
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="block text-xs font-semibold text-gray-600">
                    Type
                    <select className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" value={form.dnsType} onChange={(e) => setForm({ ...form, dnsType: e.target.value })}>
                      {["A", "CNAME", "MX", "TXT", "SPF", "DKIM", "DMARC"].map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-xs font-semibold text-gray-600">
                    Host
                    <input className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" value={form.dnsHost} onChange={(e) => setForm({ ...form, dnsHost: e.target.value })} />
                  </label>
                  <label className="block text-xs font-semibold text-gray-600 md:col-span-2">
                    Value
                    <input className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" value={form.dnsValue} onChange={(e) => setForm({ ...form, dnsValue: e.target.value })} />
                  </label>
                  {(form.dnsType === "MX") && (
                    <label className="block text-xs font-semibold text-gray-600">
                      Priority
                      <input className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" value={form.dnsPriority} onChange={(e) => setForm({ ...form, dnsPriority: e.target.value })} />
                    </label>
                  )}
                </div>
              )}
              {resourceType === "dns" && (
                <div className="flex flex-wrap gap-2">
                  <Button disabled={pending || !serviceId} onClick={submit}>Create</Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pending || !serviceId}
                    onClick={syncFaraiosDns}
                  >
                    Force sync FaraiOS DNS to Plesk
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={pending || !serviceId}
                    onClick={wireFaraiosSite}
                  >
                    Wire site to FaraiOS app
                  </Button>
                </div>
              )}
              {resourceType !== "dns" && (
                <Button disabled={pending || !serviceId} onClick={submit}>Create</Button>
              )}
            </section>
          )}

          {resourceType === "domains" && services.length > 0 && (
            <section className={`${riseStatCardClassName} space-y-3`}>
              <h2 className="text-sm font-bold text-gray-900">FaraiOS site wiring</h2>
              <p className="text-sm text-slate-600">
                Point a customer subscription at the FaraiOS Node app on this Plesk server (reverse
                proxy). Use after DNS is correct at Allanux.
              </p>
              <label className="block text-xs font-semibold text-gray-600">
                Hosting service
                <select
                  className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm"
                  value={serviceId}
                  onChange={(e) => setServiceId(e.target.value)}
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.domain_name} ({s.status})
                    </option>
                  ))}
                </select>
              </label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending || !serviceId}
                  onClick={wireFaraiosSite}
                >
                  Wire site to FaraiOS app
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending || !serviceId}
                  onClick={syncFaraiosDns}
                >
                  Force sync DNS to Plesk
                </Button>
              </div>
            </section>
          )}

          <section className={riseStatCardClassName}>
            <h2 className="mb-4 text-sm font-bold text-slate-900">Records</h2>
            {records.length === 0 ? (
              <p className="text-sm text-gray-500">No records yet.</p>
            ) : (
              <div className="space-y-2">
                {records.map((record) => (
                  <div key={String(record.id)} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-gray-50 px-3 py-2 text-sm">
                    <div>
                      {resourceType === "dns" && (
                        <p className="font-semibold text-gray-900">{String(record.record_type)} {String(record.host)} → {String(record.value)}</p>
                      )}
                      {resourceType === "mailboxes" && (
                        <p className="font-semibold text-gray-900">{String(record.email_address)}</p>
                      )}
                      {resourceType === "ftp" && (
                        <p className="font-semibold text-gray-900">{String(record.username)}</p>
                      )}
                      {resourceType === "databases" && (
                        <p className="font-semibold text-gray-900">{String(record.db_name)} {record.db_user ? `(${String(record.db_user)})` : ""}</p>
                      )}
                      {resourceType === "domains" && (
                        <p className="font-semibold text-gray-900">{String(record.domain_name)}</p>
                      )}
                      {"status" in record && <HostingStatusBadge status={String(record.status ?? record.dns_status ?? "active")} />}
                    </div>
                    {resourceType === "dns" && (
                      <Button size="sm" variant="outline" disabled={pending} onClick={() => deleteDns(String(record.id))}>Delete</Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
    </AdminPageShell>
  );
}
