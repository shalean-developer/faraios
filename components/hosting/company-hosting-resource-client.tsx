"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  requestHostingDatabaseAction,
  requestHostingFtpAction,
  requestHostingMailboxAction,
  resetHostingFtpPasswordAction,
  resetHostingMailboxPasswordAction,
} from "@/app/actions/hosting-automation";
import { CompanyHostingLegacyBanner } from "@/components/hosting/company-hosting-legacy-banner";
import { HostingStatusBadge } from "@/components/hosting/hosting-shared-ui";
import { Button } from "@/components/ui/button";
import { companyHostingOrderPath, companyHostingServicePanelPath } from "@/lib/paths/company";
import type { HostingServiceRow } from "@/types/hosting-automation";

type ResourceRecord = Record<string, unknown>;

const REQUEST_ACTIONS = {
  mailboxes: requestHostingMailboxAction,
  ftp: requestHostingFtpAction,
  databases: requestHostingDatabaseAction,
} as const;

function filterRecordsByService(
  records: ResourceRecord[],
  scopedServiceId?: string
): ResourceRecord[] {
  if (!scopedServiceId) return records;
  return records.filter((record) => record.service_id === scopedServiceId);
}

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
  scopedServiceId,
  scopedServiceDomain,
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
  scopedServiceId?: string;
  scopedServiceDomain?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const activeServices = services.filter((service) => service.status === "active");
  const scopedActiveServices = scopedServiceId
    ? activeServices.filter((service) => service.id === scopedServiceId)
    : activeServices;
  const [serviceId, setServiceId] = useState(scopedActiveServices[0]?.id ?? "");
  const [value, setValue] = useState("");
  const [resetPassword, setResetPassword] = useState<string | null>(null);
  const visibleRecords = filterRecordsByService(records, scopedServiceId);

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

  const resetMailboxPassword = (record: ResourceRecord) => {
    const serviceIdForRecord = String(record.service_id ?? "");
    const mailboxId = String(record.id);
    if (!serviceIdForRecord || !window.confirm(`Reset password for ${String(record.email_address)}?`)) {
      return;
    }

    setMessage(null);
    setResetPassword(null);
    startTransition(async () => {
      const result = await resetHostingMailboxPasswordAction({
        companyId,
        companySlug: slug,
        serviceId: serviceIdForRecord,
        mailboxId,
      });
      if (!result.ok) {
        setMessage(result.error ?? "Could not reset password.");
        return;
      }
      setMessage("Mailbox password reset.");
      setResetPassword(result.password ?? null);
      router.refresh();
    });
  };

  const resetFtpPassword = (record: ResourceRecord) => {
    const serviceIdForRecord = String(record.service_id ?? "");
    const ftpAccountId = String(record.id);
    if (!serviceIdForRecord || !window.confirm(`Reset password for FTP user ${String(record.username)}?`)) {
      return;
    }

    setMessage(null);
    setResetPassword(null);
    startTransition(async () => {
      const result = await resetHostingFtpPasswordAction({
        companyId,
        companySlug: slug,
        serviceId: serviceIdForRecord,
        ftpAccountId,
      });
      if (!result.ok) {
        setMessage(result.error ?? "Could not reset password.");
        return;
      }
      setMessage("FTP password reset.");
      setResetPassword(result.password ?? null);
      router.refresh();
    });
  };

  return (
    <>
      {scopedServiceId && scopedServiceDomain ? (
        <Link
          href={companyHostingServicePanelPath(slug, scopedServiceId)}
          className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-800"
        >
          <ArrowLeft className="h-4 w-4" />
          {scopedServiceDomain} control panel
        </Link>
      ) : null}

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
      {resetPassword && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">New password (copy now — it will not be shown again):</p>
          <p className="mt-2 font-mono text-xs">{resetPassword}</p>
        </div>
      )}

      {requestAction && scopedActiveServices.length > 0 && (
        <section className="mt-6 space-y-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900">{createLabel ?? "Request creation"}</h2>
          {!scopedServiceId && (
            <label className="block text-xs font-semibold text-slate-600">
              Service
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
              >
                {scopedActiveServices.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.domain_name}
                  </option>
                ))}
              </select>
            </label>
          )}
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
        {visibleRecords.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            No {resourceType} yet.{" "}
            {scopedActiveServices.length === 0 && !hasLegacySubscription && (
              <Link href={companyHostingOrderPath(slug)} className="font-semibold text-indigo-600">
                Order hosting
              </Link>
            )}
          </div>
        ) : (
          visibleRecords.map((record) => (
            <div
              key={String(record.id)}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"
            >
              <div>
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
              {resourceType === "mailboxes" && record.service_id ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() => resetMailboxPassword(record)}
                >
                  Reset password
                </Button>
              ) : null}
              {resourceType === "ftp" && record.service_id ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={pending}
                  onClick={() => resetFtpPassword(record)}
                >
                  Reset password
                </Button>
              ) : null}
            </div>
          ))
        )}
      </section>
    </>
  );
}
