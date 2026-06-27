"use client";

import { useState, useTransition } from "react";
import { AdminActivityBellLink } from "@/components/admin/admin-activity-bell-link";
import { AdminPageShell } from "@/components/admin/admin-page-shell";
import { AdminHostingNav } from "@/components/hosting/hosting-shared-ui";
import { Button } from "@/components/ui/button";
import {
  riseCardClassName,
  riseInputClassName,
  riseSelectClassName,
  riseStatCardClassName,
} from "@/lib/ui/rise-dashboard-styles";
import { adminSaveHostingServerAction, adminUpdateHostingSettingsAction } from "@/app/actions/hosting-admin";
import type { AdminHostingSettings, HostingServerRow } from "@/types/hosting-automation";

export function FaraiAdminHostingSettings({
  settings,
  servers,
}: {
  settings: AdminHostingSettings;
  servers: HostingServerRow[];
}) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({
    pleskUrl: settings.pleskUrl,
    pleskUsername: settings.pleskUsername,
    pleskSecret: "",
    defaultServerId: settings.defaultServerId ?? "",
    defaultNameservers: settings.defaultNameservers.join(", "),
    welcomeEmailTemplate: settings.welcomeEmailTemplate,
  });

  const saveSettings = () => {
    startTransition(() => {
      void (async () => {
        const result = await adminUpdateHostingSettingsAction({
          pleskUrl: form.pleskUrl,
          pleskUsername: form.pleskUsername,
          pleskSecret: form.pleskSecret || undefined,
          defaultServerId: form.defaultServerId || undefined,
          defaultNameservers: form.defaultNameservers.split(",").map((s) => s.trim()).filter(Boolean),
          welcomeEmailTemplate: form.welcomeEmailTemplate,
        });
        setMessage(result.ok ? "Settings saved." : result.error ?? "Failed.");
      })();
    });
  };

  return (
    <AdminPageShell
      title="Hosting settings"
      description="Plesk API credentials (server-side only)"
      maxWidthClassName="max-w-3xl"
      actions={<AdminActivityBellLink />}
    >
          <AdminHostingNav />
          {message && <p className="text-sm text-slate-600">{message}</p>}

          <section className={`${riseStatCardClassName} space-y-4`}>
            <h2 className="text-sm font-bold text-gray-900">Plesk API</h2>
            <p className="text-xs text-gray-500">
              Source: {settings.source}. {settings.configured ? "Configured." : "Not configured."}
              {settings.hasPleskSecret && " Secret stored."}
            </p>
            <label className="block text-xs font-semibold text-gray-600">
              Plesk URL
              <input className={`${riseInputClassName} mt-1 w-full`} value={form.pleskUrl} onChange={(e) => setForm({ ...form, pleskUrl: e.target.value })} placeholder="https://so1.cloud-wex.com:8443" />
            </label>
            <p className="text-xs text-gray-400">XML API: {settings.xmlApiEndpoint || `${form.pleskUrl}/enterprise/control/agent.php`}</p>
            <label className="block text-xs font-semibold text-gray-600">
              Username
              <input className={`${riseInputClassName} mt-1 w-full`} value={form.pleskUsername} onChange={(e) => setForm({ ...form, pleskUsername: e.target.value })} />
            </label>
            <label className="block text-xs font-semibold text-gray-600">
              Secret / password {settings.hasPleskSecret && "(leave blank to keep current)"}
              <input type="password" className={`${riseInputClassName} mt-1 w-full`} value={form.pleskSecret} onChange={(e) => setForm({ ...form, pleskSecret: e.target.value })} />
            </label>
            <label className="block text-xs font-semibold text-gray-600">
              Default server
              <select className={`${riseSelectClassName} mt-1 w-full`} value={form.defaultServerId} onChange={(e) => setForm({ ...form, defaultServerId: e.target.value })}>
                <option value="">None</option>
                {servers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold text-gray-600">
              Default nameservers (comma-separated)
              <input className={`${riseInputClassName} mt-1 w-full`} value={form.defaultNameservers} onChange={(e) => setForm({ ...form, defaultNameservers: e.target.value })} />
            </label>
            <label className="block text-xs font-semibold text-gray-600">
              Welcome email template
              <textarea className={`${riseInputClassName} mt-1 w-full`} rows={3} value={form.welcomeEmailTemplate} onChange={(e) => setForm({ ...form, welcomeEmailTemplate: e.target.value })} />
            </label>
            <Button disabled={pending} onClick={saveSettings}>Save settings</Button>
          </section>

          <section className={`${riseStatCardClassName} space-y-3`}>
            <h2 className="text-sm font-bold text-gray-900">Servers</h2>
            {servers.map((server) => (
              <div key={server.id} className={`${riseCardClassName} p-3 text-sm`}>
                <p className="font-semibold text-gray-900">{server.name}</p>
                <p className="text-xs text-gray-500">{server.hostname} · {server.plesk_url}</p>
              </div>
            ))}
            <Button variant="outline" disabled={pending} onClick={() => startTransition(() => { void (async () => {
              await adminSaveHostingServerAction({
                name: "Default Plesk Server",
                hostname: "plesk.local",
                pleskUrl: form.pleskUrl || "https://plesk.example.com:8443",
                isDefault: servers.length === 0,
                isActive: true,
                defaultNameservers: form.defaultNameservers.split(",").map((s) => s.trim()).filter(Boolean),
              });
            })(); })}>
              Add server from Plesk URL
            </Button>
          </section>
    </AdminPageShell>
  );
}
