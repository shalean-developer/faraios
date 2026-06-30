import { AlertTriangle } from "lucide-react";

import type { DomainDnsGuidance } from "@/lib/hosting/external-dns-guidance";
import type { WebsiteDnsRecord } from "@/types/website-engine";

type Props = {
  domain: string;
  guidance: DomainDnsGuidance;
  records: WebsiteDnsRecord[];
  embedded?: boolean;
};

export function ExternalDnsGuidanceCallout({
  domain,
  guidance,
  records,
  embedded = false,
}: Props) {
  if (!guidance.usesExternalDns) return null;

  const pendingRecords = records.filter((record) => record.status !== "verified");
  if (!pendingRecords.length) return null;

  return (
    <div
      className={
        embedded
          ? "mt-4 rounded-xl border border-amber-300 bg-amber-50/90 p-4"
          : "mt-4 rounded-xl border border-amber-300 bg-amber-50/90 p-4 shadow-sm"
      }
    >
      <div className="flex gap-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
        <div className="min-w-0 space-y-3">
          <div>
            <h4 className="text-sm font-semibold text-amber-950">
              Update DNS at your nameserver provider — not in Plesk
            </h4>
            <p className="mt-1 text-sm text-amber-900">{guidance.summary}</p>
          </div>

          {guidance.publicNameservers.length > 0 ? (
            <p className="text-xs text-amber-800">
              <span className="font-medium">Current nameservers:</span>{" "}
              {guidance.publicNameservers.join(", ")}
            </p>
          ) : null}

          {pendingRecords.length > 0 ? (
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-amber-800">
                Add these records at {guidance.dnsHostDescription}
              </p>
              <ul className="mt-2 space-y-2">
                {pendingRecords.map((record) => (
                  <li
                    key={`${record.record_type}-${record.host}-${record.value}`}
                    className="rounded-lg border border-amber-200 bg-white/80 px-3 py-2 text-xs text-slate-800"
                  >
                    <span className="font-semibold text-slate-900">{record.record_type}</span>
                    {" · "}
                    <span className="font-mono">host {record.host}</span>
                    {" → "}
                    <span className="font-mono break-all">{record.value}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <p className="text-xs text-amber-800">
            Plesk may already show similar records for <strong>{domain}</strong>, but they only
            take effect on the internet after you add them where your nameservers point (often your
            registrar or Allanux). Changes can take up to 24 hours to propagate.
          </p>
        </div>
      </div>
    </div>
  );
}
