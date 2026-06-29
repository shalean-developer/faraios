"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import {
  hostingAddDnsRecordAction,
  hostingDeleteDnsRecordAction,
} from "@/app/actions/hosting-automation";
import { CompanyHostingLegacyBanner } from "@/components/hosting/company-hosting-legacy-banner";
import { Button } from "@/components/ui/button";
import { companyHostingOrderPath, companyHostingServicePanelPath } from "@/lib/paths/company";
import type { HostingServiceRow } from "@/types/hosting-automation";

type DnsRecord = {
  id: string;
  service_id: string | null;
  record_type: string;
  host: string;
  value: string;
  priority: number | null;
  ttl: number;
};

const DNS_TYPES = ["A", "CNAME", "MX", "TXT", "SPF", "DKIM", "DMARC"];

export function CompanyHostingDnsClient({
  slug,
  companyId,
  services,
  records,
  hasLegacySubscription = false,
  scopedServiceId,
  scopedServiceDomain,
}: {
  slug: string;
  companyId: string;
  services: HostingServiceRow[];
  records: DnsRecord[];
  hasLegacySubscription?: boolean;
  scopedServiceId?: string;
  scopedServiceDomain?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const activeServices = services.filter((service) => service.status === "active");
  const scopedActiveServices = scopedServiceId
    ? activeServices.filter((service) => service.id === scopedServiceId)
    : activeServices;
  const [serviceId, setServiceId] = useState(scopedActiveServices[0]?.id ?? "");
  const [form, setForm] = useState({
    type: "A",
    host: "@",
    value: "",
    priority: "",
  });

  const visibleRecords = scopedServiceId
    ? records.filter((record) => record.service_id === scopedServiceId)
    : records;

  const submit = () => {
    if (!serviceId || !form.value.trim()) return;
    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await hostingAddDnsRecordAction({
        companyId,
        companySlug: slug,
        serviceId,
        type: form.type,
        host: form.host.trim() || "@",
        value: form.value.trim(),
        priority: form.priority ? parseInt(form.priority, 10) : undefined,
      });
      if (!result.ok) {
        setError(result.error ?? "Could not add DNS record.");
        return;
      }
      setMessage("DNS record added.");
      setForm({ type: "A", host: "@", value: "", priority: "" });
      router.refresh();
    });
  };

  const deleteRecord = (record: DnsRecord) => {
    if (!record.service_id) return;
    if (!window.confirm(`Delete ${record.record_type} ${record.host} → ${record.value}?`)) return;

    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await hostingDeleteDnsRecordAction({
        companyId,
        companySlug: slug,
        serviceId: record.service_id!,
        recordId: record.id,
      });
      if (!result.ok) {
        setError(result.error ?? "Could not delete DNS record.");
        return;
      }
      setMessage("DNS record deleted.");
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

      <h1 className="text-2xl font-bold tracking-tight text-slate-900">DNS records</h1>
      <p className="mt-2 text-sm text-slate-500">
        {scopedServiceDomain
          ? `Manage DNS records for ${scopedServiceDomain}`
          : "Manage DNS records for your hosting services."}
      </p>

      <CompanyHostingLegacyBanner
        slug={slug}
        hasLegacySubscription={hasLegacySubscription}
        hasAutomationServices={services.length > 0}
      />

      {message && (
        <p className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {message}
        </p>
      )}
      {error && (
        <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {scopedActiveServices.length > 0 ? (
        <section className="mt-6 space-y-3 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900">Add DNS record</h2>
          {!scopedServiceId && (
            <label className="block text-xs font-semibold text-slate-600">
              Service
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={serviceId}
                onChange={(event) => setServiceId(event.target.value)}
              >
                {scopedActiveServices.map((service) => (
                  <option key={service.id} value={service.id}>
                    {service.domain_name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-semibold text-slate-600">
              Type
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={form.type}
                onChange={(event) => setForm({ ...form, type: event.target.value })}
              >
                {DNS_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-semibold text-slate-600">
              Host
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={form.host}
                onChange={(event) => setForm({ ...form, host: event.target.value })}
                placeholder="@ or subdomain"
              />
            </label>
            <label className="block text-xs font-semibold text-slate-600 sm:col-span-2">
              Value
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={form.value}
                onChange={(event) => setForm({ ...form, value: event.target.value })}
              />
            </label>
            {form.type === "MX" && (
              <label className="block text-xs font-semibold text-slate-600">
                Priority
                <input
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  value={form.priority}
                  onChange={(event) => setForm({ ...form, priority: event.target.value })}
                />
              </label>
            )}
          </div>
          <Button disabled={pending || !form.value.trim()} onClick={submit}>
            Add record
          </Button>
        </section>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
          No active hosting services.{" "}
          {!hasLegacySubscription && (
            <Link href={companyHostingOrderPath(slug)} className="font-semibold text-indigo-600">
              Order hosting
            </Link>
          )}
        </div>
      )}

      <section className="mt-6 space-y-3">
        <h2 className="text-sm font-bold text-slate-900">Records</h2>
        {visibleRecords.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            No DNS records yet.
          </div>
        ) : (
          visibleRecords.map((record) => (
            <div
              key={record.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm"
            >
              <div>
                <p className="font-bold text-slate-900">
                  {record.record_type} {record.host} → {record.value}
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  TTL {record.ttl}
                  {record.priority != null ? ` · Priority ${record.priority}` : ""}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                disabled={pending || !record.service_id}
                onClick={() => deleteRecord(record)}
              >
                Delete
              </Button>
            </div>
          ))
        )}
      </section>
    </>
  );
}
