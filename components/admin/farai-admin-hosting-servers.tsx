"use client";

import { useState, useTransition } from "react";
import { AdminActivityBellLink } from "@/components/admin/admin-activity-bell-link";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { AdminHostingNav, HostingStatusBadge } from "@/components/hosting/hosting-shared-ui";
import { Button } from "@/components/ui/button";
import {
  riseCardClassName,
  riseInputClassName,
  riseStatCardClassName,
} from "@/lib/ui/rise-dashboard-styles";
import {
  adminImportPleskServicePlansAction,
  adminSaveHostingServerAction,
  adminSyncPleskSubscriptionsAction,
  adminTestPleskConnectionAction,
} from "@/app/actions/hosting-admin";
import type { HostingServerRow } from "@/types/hosting-automation";

const DEFAULT_XML_ENDPOINT = "https://so1.cloud-wex.com:8443/enterprise/control/agent.php";

export function FaraiAdminHostingServers({ servers }: { servers: HostingServerRow[] }) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "Shalean Plesk Reseller",
    hostname: "so1.cloud-wex.com",
    pleskUrl: "https://so1.cloud-wex.com:8443",
    xmlApiEndpoint: DEFAULT_XML_ENDPOINT,
    apiUsername: "shalean1",
    apiSecret: "",
    isDefault: true,
    isActive: true,
    defaultNameservers: "",
    notes: "",
  });

  const resetForm = () => {
    setEditingId(null);
    setForm({
      name: "Shalean Plesk Reseller",
      hostname: "so1.cloud-wex.com",
      pleskUrl: "https://so1.cloud-wex.com:8443",
      xmlApiEndpoint: DEFAULT_XML_ENDPOINT,
      apiUsername: "shalean1",
      apiSecret: "",
      isDefault: servers.length === 0,
      isActive: true,
      defaultNameservers: "",
      notes: "",
    });
  };

  const editServer = (server: HostingServerRow) => {
    setEditingId(server.id);
    setForm({
      name: server.name,
      hostname: server.hostname,
      pleskUrl: server.plesk_url,
      xmlApiEndpoint: server.xml_api_endpoint ?? `${server.plesk_url}/enterprise/control/agent.php`,
      apiUsername: server.api_username ?? "",
      apiSecret: "",
      isDefault: server.is_default,
      isActive: server.is_active,
      defaultNameservers: server.default_nameservers.join(", "),
      notes: server.notes ?? "",
    });
  };

  const saveServer = () => {
    startTransition(() => {
      void (async () => {
        const result = await adminSaveHostingServerAction({
          id: editingId ?? undefined,
          name: form.name,
          hostname: form.hostname,
          pleskUrl: form.pleskUrl,
          xmlApiEndpoint: form.xmlApiEndpoint,
          apiUsername: form.apiUsername,
          apiSecret: form.apiSecret || undefined,
          isDefault: form.isDefault,
          isActive: form.isActive,
          defaultNameservers: form.defaultNameservers.split(",").map((s) => s.trim()).filter(Boolean),
          notes: form.notes,
        });
        setMessage(result.ok ? "Server saved." : result.error ?? "Failed.");
        if (result.ok) resetForm();
      })();
    });
  };

  const testConnection = (serverId: string) => {
    startTransition(() => {
      void (async () => {
        const result = await adminTestPleskConnectionAction(serverId);
        setMessage(
          result.ok
            ? `Connected: ${result.message ?? "OK"}`
            : result.error ?? "Connection failed."
        );
      })();
    });
  };

  const importPlans = (serverId: string) => {
    startTransition(() => {
      void (async () => {
        const result = await adminImportPleskServicePlansAction(serverId);
        setMessage(result.ok ? `Imported ${result.count ?? 0} plans.` : result.error ?? "Failed.");
      })();
    });
  };

  const syncSubscriptions = (serverId: string) => {
    startTransition(() => {
      void (async () => {
        const result = await adminSyncPleskSubscriptionsAction(serverId);
        setMessage(
          result.ok
            ? `Synced ${result.synced ?? 0} of ${result.count ?? 0} subscriptions.`
            : result.error ?? "Failed."
        );
      })();
    });
  };

  return (
    <AdminPageShell
      title="Hosting servers"
      description="Plesk XML API — credentials stored server-side only"
      maxWidthClassName="max-w-5xl"
      actions={<AdminActivityBellLink />}
    >
          <AdminHostingNav />
          {message && <p className="text-sm text-slate-600">{message}</p>}

          <section className={`${riseStatCardClassName} space-y-4`}>
            <h2 className="text-sm font-bold text-gray-900">
              {editingId ? "Edit Plesk server" : "Add Plesk server"}
            </h2>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="block text-xs font-semibold text-gray-600">
                Server name
                <input className={`${riseInputClassName} mt-1 w-full`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </label>
              <label className="block text-xs font-semibold text-gray-600">
                Hostname
                <input className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" value={form.hostname} onChange={(e) => setForm({ ...form, hostname: e.target.value })} />
              </label>
              <label className="block text-xs font-semibold text-gray-600 md:col-span-2">
                Server URL
                <input className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" value={form.pleskUrl} onChange={(e) => setForm({ ...form, pleskUrl: e.target.value })} placeholder="https://so1.cloud-wex.com:8443" />
              </label>
              <label className="block text-xs font-semibold text-gray-600 md:col-span-2">
                XML API endpoint
                <input className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" value={form.xmlApiEndpoint} onChange={(e) => setForm({ ...form, xmlApiEndpoint: e.target.value })} />
              </label>
              <label className="block text-xs font-semibold text-gray-600">
                Reseller username
                <input className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" value={form.apiUsername} onChange={(e) => setForm({ ...form, apiUsername: e.target.value })} />
              </label>
              <label className="block text-xs font-semibold text-gray-600">
                API secret / password
                <input type="password" className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" value={form.apiSecret} onChange={(e) => setForm({ ...form, apiSecret: e.target.value })} placeholder={editingId ? "Leave blank to keep current" : "Required"} />
              </label>
              <label className="block text-xs font-semibold text-gray-600 md:col-span-2">
                Default nameservers (comma-separated)
                <input className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm" value={form.defaultNameservers} onChange={(e) => setForm({ ...form, defaultNameservers: e.target.value })} />
              </label>
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} />
                Default server
              </label>
              <label className="flex items-center gap-2 text-xs font-semibold text-gray-600">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                Active
              </label>
            </div>
            <div className="flex gap-2">
              <Button disabled={pending} onClick={saveServer}>{editingId ? "Update server" : "Add server"}</Button>
              {editingId && <Button variant="outline" disabled={pending} onClick={resetForm}>Cancel</Button>}
            </div>
          </section>

          <section className="space-y-3">
            {servers.length === 0 ? (
              <p className="text-sm text-gray-500">No servers configured yet.</p>
            ) : (
              servers.map((server) => (
                <div key={server.id} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-gray-900">{server.name}</p>
                      <p className="text-sm text-gray-500">{server.hostname}</p>
                      <p className="text-xs text-gray-400">{server.plesk_url}</p>
                      <p className="text-xs text-gray-400">{server.xml_api_endpoint}</p>
                      <p className="text-xs text-gray-400">User: {server.api_username ?? "—"} · API: {server.api_type}</p>
                      {server.has_api_secret && <p className="text-xs text-emerald-600">Secret stored (masked)</p>}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {server.is_default && <HostingStatusBadge status="active" />}
                      {server.last_connection_status && (
                        <HostingStatusBadge status={server.last_connection_status === "connected" ? "success" : "failed"} />
                      )}
                    </div>
                  </div>
                  {server.last_connection_message && (
                    <p className="mt-2 text-xs text-gray-500">
                      Last test: {server.last_connection_message}
                      {server.last_connection_at && ` · ${new Date(server.last_connection_at).toLocaleString()}`}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button size="sm" disabled={pending} onClick={() => testConnection(server.id)}>Test connection</Button>
                    <Button size="sm" variant="outline" disabled={pending} onClick={() => importPlans(server.id)}>Import service plans</Button>
                    <Button size="sm" variant="outline" disabled={pending} onClick={() => syncSubscriptions(server.id)}>Sync subscriptions</Button>
                    <Button size="sm" variant="outline" disabled={pending} onClick={() => editServer(server)}>Edit</Button>
                  </div>
                </div>
              ))
            )}
          </section>
    </AdminPageShell>
  );
}
