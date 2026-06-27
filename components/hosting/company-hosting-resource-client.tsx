"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  requestHostingDatabaseAction,
  requestHostingFtpAction,
  requestHostingMailboxAction,
} from "@/app/actions/hosting-automation";
import { CompanyHostingLegacyBanner } from "@/components/hosting/company-hosting-legacy-banner";
import { HostingStatusBadge } from "@/components/hosting/hosting-shared-ui";
import { Button } from "@/components/ui/button";
import { companyHostingOrderPath } from "@/lib/paths/company";
import type { HostingServiceRow } from "@/types/hosting-automation";

type ResourceRecord = Record<string, unknown>;

const REQUEST_ACTIONS = {
  mailboxes: requestHostingMailboxAction,
  ftp: requestHostingFtpAction,
  databases: requestHostingDatabaseAction,
} as const;

export function CompanyHostingResourceClient({
  slug,
  companyId,
  title,
  description,
  resourceType,
  services,
  records,
  createLabel,
  createFieldLabel,
  hasLegacySubscription = false,
}: {
  slug: string;
  companyId: string;
  title: string;
  description: string;
  resourceType: "domains" | "mailboxes" | "ftp" | "databases" | "dns";
  services: HostingServiceRow[];
  records: ResourceRecord[];
  createLabel?: string;
  createFieldLabel?: string;
  hasLegacySubscription?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const activeServices = services.filter((s) => s.status === "active");
  const [serviceId, setServiceId] = useState(activeServices[0]?.id ?? "");
  const [value, setValue] = useState("");

  const requestAction =
    resourceType === "mailboxes" || resourceType === "ftp" || resourceType === "databases"
      ? REQUEST_ACTIONS[resourceType]
      : undefined;

  const submitRequest = () => {
    if (!requestAction || !serviceId || !value.trim()) return;
    startTransition(() => {
      void (async () => {
        const result = await requestAction({
          companyId,
          companySlug: slug,
          serviceId,
          value: value.trim(),
        });
        setMessage(result.ok ? "Request submitted." : result.error ?? "Failed.");
        if (result.ok) {
          setValue("");
          router.refresh();
        }
      })();
    });
  };

  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
      <p className="mt-2 text-sm text-slate-500">{description}</p>

      <CompanyHostingLegacyBanner
        slug={slug}
        hasLegacySubscription={hasLegacySubscription}
        hasAutomationServices={services.length > 0}
      />

      {message && (
        <p className="mt-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
          {message}
        </p>
      )}

      {requestAction && activeServices.length > 0 && (
        <section className="mt-6 space-y-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900">{createLabel ?? "Request creation"}</h2>
          <label className="block text-xs font-semibold text-slate-600">
            Service
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
            >
              {activeServices.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.domain_name}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-semibold text-slate-600">
            {createFieldLabel ?? "Name"}
            <input
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </label>
          <Button disabled={pending} onClick={submitRequest}>
            Submit request
          </Button>
        </section>
      )}

      <section className="mt-6 space-y-3">
        {records.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            No {resourceType} yet.{" "}
            {activeServices.length === 0 && !hasLegacySubscription && (
              <Link href={companyHostingOrderPath(slug)} className="font-semibold text-indigo-600">
                Order hosting
              </Link>
            )}
          </div>
        ) : (
          records.map((record) => (
            <div
              key={String(record.id)}
              className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"
            >
              {resourceType === "domains" && (
                <>
                  <p className="font-bold text-slate-900">{String(record.domain_name)}</p>
                  <HostingStatusBadge status={String(record.dns_status ?? "unknown")} />
                </>
              )}
              {resourceType === "mailboxes" && (
                <p className="font-bold text-slate-900">{String(record.email_address)}</p>
              )}
              {resourceType === "ftp" && (
                <p className="font-bold text-slate-900">{String(record.username)}</p>
              )}
              {resourceType === "databases" && (
                <p className="font-bold text-slate-900">{String(record.db_name)}</p>
              )}
              {resourceType === "dns" && (
                <p className="font-bold text-slate-900">
                  {String(record.record_type)} {String(record.host)} → {String(record.value)}
                </p>
              )}
            </div>
          ))
        )}
      </section>
    </>
  );
}
