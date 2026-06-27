"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, RefreshCw } from "lucide-react";

import {
  addWebsiteDomainAction,
  verifyWebsiteDomainAction,
} from "@/app/actions/website-engine";
import { Button } from "@/components/ui/button";
import { formatDateTimeEnZA } from "@/lib/format/dates";
import type { WebsiteDnsRecord, WebsiteDomain } from "@/types/website-engine";
import { cn } from "@/lib/utils";

export type WebsiteDomainDnsHelp = {
  serverIp: string | null;
  serverHostname: string | null;
  nameservers: string[];
  helpText: string;
};

type WebsiteDomainsPanelProps = {
  companyId: string;
  slug: string;
  domains: WebsiteDomain[];
  dnsByDomain: Record<string, WebsiteDnsRecord[]>;
  websiteId?: string | null;
  variant?: "page" | "embedded";
  dnsHelp?: WebsiteDomainDnsHelp | null;
};

export function WebsiteDomainsPanel({
  companyId,
  slug,
  domains,
  dnsByDomain,
  websiteId,
  variant = "page",
  dnsHelp,
}: WebsiteDomainsPanelProps) {
  const router = useRouter();
  const [domainInput, setDomainInput] = useState("");
  const [pending, setPending] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const embedded = variant === "embedded";

  const onAddDomain = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(null);
    const result = await addWebsiteDomainAction({
      companyId,
      companySlug: slug,
      domain: domainInput,
      websiteId: websiteId ?? null,
      isPrimary: domains.length === 0,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSuccess("Domain added. Configure DNS records below.");
    setDomainInput("");
    router.refresh();
  };

  const onVerify = async (domainId: string) => {
    setVerifyingId(domainId);
    setError(null);
    const result = await verifyWebsiteDomainAction({
      companyId,
      companySlug: slug,
      websiteDomainId: domainId,
    });
    setVerifyingId(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSuccess(result.verified ? "Domain verified!" : "DNS not verified yet. Check your records.");
    router.refresh();
  };

  return (
    <div className={embedded ? "space-y-4" : "space-y-8"}>
      <form
        onSubmit={onAddDomain}
        className={cn(
          embedded
            ? "rounded-xl border border-slate-100 bg-slate-50/60 p-4"
            : "rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
        )}
      >
        <h3 className={cn("font-semibold text-slate-900", embedded && "text-sm")}>
          {embedded ? "Connect custom domain" : "Add domain"}
        </h3>
        <p className="mt-1 text-sm text-slate-500">
          {dnsHelp?.helpText ??
            "Connect your domain to load DNS records for your FaraiOS Plesk server."}
        </p>
        {dnsHelp?.serverIp ? (
          <p className="mt-2 text-xs text-slate-500">
            Plesk server IP:{" "}
            <code className="rounded bg-white px-1 py-0.5">{dnsHelp.serverIp}</code>
            {dnsHelp.serverHostname ? (
              <>
                {" "}
                · Hostname:{" "}
                <code className="rounded bg-white px-1 py-0.5">{dnsHelp.serverHostname}</code>
              </>
            ) : null}
            {dnsHelp.nameservers.length > 0 ? (
              <>
                {" "}
                · Nameservers: {dnsHelp.nameservers.join(", ")}
              </>
            ) : null}
          </p>
        ) : null}
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={domainInput}
            onChange={(e) => setDomainInput(e.target.value)}
            placeholder="www.yourbusiness.com"
            className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          />
          <Button type="submit" className="rounded-xl" disabled={pending}>
            {pending ? "Connecting..." : embedded ? "Connect domain" : "Add domain"}
          </Button>
        </div>
      </form>

      {domains.length === 0 ? (
        <p className="text-sm text-slate-500">No custom domains connected yet.</p>
      ) : (
        <div className="space-y-4">
          {domains.map((domain) => {
            const records = dnsByDomain[domain.id] ?? [];
            return (
              <div
                key={domain.id}
                className={cn(
                  embedded
                    ? "rounded-xl border border-slate-100 bg-slate-50/60 p-4"
                    : "rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{domain.domain}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {domain.domain_type}
                      {domain.is_primary ? " · primary" : ""}
                      {domain.hosting_provider ? ` · ${domain.hosting_provider}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusPill label={domain.verification_status} />
                    <StatusPill label={domain.ssl_status} variant="ssl" />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      disabled={verifyingId === domain.id}
                      onClick={() => onVerify(domain.id)}
                    >
                      {verifyingId === domain.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                          Verify DNS
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                {domain.last_checked_at ? (
                  <p className="mt-2 text-xs text-slate-400">
                    Last checked: {formatDateTimeEnZA(domain.last_checked_at)}
                  </p>
                ) : null}

                {records.length > 0 ? (
                  <div className="mt-4 overflow-x-auto">
                    <table className="w-full min-w-[480px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 text-xs uppercase text-slate-500">
                          <th className="py-2 pr-4">Type</th>
                          <th className="py-2 pr-4">Host</th>
                          <th className="py-2 pr-4">Value</th>
                          <th className="py-2">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {records.map((record) => (
                          <tr key={record.id} className="border-b border-slate-50">
                            <td className="py-2 pr-4 font-mono text-xs">{record.record_type}</td>
                            <td className="py-2 pr-4 font-mono text-xs">{record.host}</td>
                            <td className="max-w-xs truncate py-2 pr-4 font-mono text-xs">
                              {record.value}
                            </td>
                            <td className="py-2">
                              {record.status === "verified" ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700">
                                  <Check className="h-3.5 w-3.5" /> verified
                                </span>
                              ) : (
                                <span className="text-amber-700">{record.status}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
      {success ? <p className="text-sm font-medium text-emerald-600">{success}</p> : null}
    </div>
  );
}

function StatusPill({
  label,
  variant,
}: {
  label: string;
  variant?: "ssl";
}) {
  const colors =
    label === "verified" || label === "active"
      ? "bg-emerald-50 text-emerald-800"
      : label === "failed"
        ? "bg-red-50 text-red-800"
        : label === "pending" || label === "not_started"
          ? "bg-amber-50 text-amber-800"
          : "bg-slate-100 text-slate-700";

  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
        colors
      )}
    >
      {variant === "ssl" ? `SSL: ${label.replace(/_/g, " ")}` : label.replace(/_/g, " ")}
    </span>
  );
}
