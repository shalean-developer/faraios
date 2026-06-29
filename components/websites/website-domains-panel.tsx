"use client";

import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Loader2, RefreshCw } from "lucide-react";

import {
  addWebsiteDomainAction,
  verifyWebsiteDomainAction,
} from "@/app/actions/website-engine";
import { confirmHostingPaymentAction } from "@/app/actions/confirm-hosting-payment";
import { Button } from "@/components/ui/button";
import { DomainHostingCheckoutModal } from "@/components/websites/domain-hosting-checkout-modal";
import { formatDateTimeEnZA } from "@/lib/format/dates";
import {
  companyWebsiteBuilderSectionPath,
  companyWebsiteDomainsPath,
} from "@/lib/paths/company";
import type { WebsiteDnsRecord, WebsiteDomain } from "@/types/website-engine";
import type { HostingPlanRow } from "@/types/hosting-automation";
import { cn } from "@/lib/utils";

const DOMAIN_ACTION_TIMEOUT_MS = 25_000;
const AUTO_VERIFY_POLL_INTERVAL_MS = 20_000;
const AUTO_VERIFY_POLL_MAX_ATTEMPTS = 15;
const POST_PAYMENT_CONNECT_MAX_ATTEMPTS = 10;
const POST_PAYMENT_CONNECT_DELAY_MS = 3000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withDomainActionTimeout<T>(
  promise: Promise<T>,
  timeoutMs = DOMAIN_ACTION_TIMEOUT_MS
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(
        () =>
          reject(
            new Error(
              "This is taking longer than expected. Refresh the page — your domain may already be listed below."
            )
          ),
        timeoutMs
      );
    }),
  ]);
}

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
  hostingPlans?: HostingPlanRow[];
  billingEmail?: string | null;
};

export function WebsiteDomainsPanel({
  companyId,
  slug,
  domains,
  dnsByDomain,
  websiteId,
  variant = "page",
  dnsHelp,
  hostingPlans = [],
  billingEmail,
}: WebsiteDomainsPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [domainInput, setDomainInput] = useState("");
  const [pending, setPending] = useState(false);
  const [verifyingId, setVerifyingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [autoPolling, setAutoPolling] = useState(false);
  const [hostingDomain, setHostingDomain] = useState<string | null>(null);
  const pollAttemptsRef = useRef(0);
  const embedded = variant === "embedded";

  const pendingDomainIds = domains
    .filter((domain) => domain.verification_status === "pending")
    .map((domain) => domain.id);
  const pendingDomainIdsKey = pendingDomainIds.join(",");

  const runVerification = useCallback(
    async (domainId: string) => {
      const result = await withDomainActionTimeout(
        verifyWebsiteDomainAction({
          companyId,
          companySlug: slug,
          websiteDomainId: domainId,
        })
      );
      return result;
    },
    [companyId, slug]
  );

  useEffect(() => {
    if (!autoPolling || !pendingDomainIdsKey) {
      pollAttemptsRef.current = 0;
      return;
    }

    const domainIds = pendingDomainIdsKey.split(",").filter(Boolean);

    const poll = async () => {
      pollAttemptsRef.current += 1;

      for (const domainId of domainIds) {
        try {
          const result = await runVerification(domainId);
          if (!result.ok) continue;
          if (result.verified) {
            setAutoPolling(false);
            setSuccess("Domain verified automatically.");
            router.refresh();
            return;
          }
        } catch {
          // Keep polling until max attempts.
        }
      }

      router.refresh();

      if (pollAttemptsRef.current >= AUTO_VERIFY_POLL_MAX_ATTEMPTS) {
        setAutoPolling(false);
      }
    };

    const intervalId = window.setInterval(() => {
      void poll();
    }, AUTO_VERIFY_POLL_INTERVAL_MS);

    void poll();

    return () => {
      window.clearInterval(intervalId);
    };
  }, [autoPolling, pendingDomainIdsKey, router, runVerification]);

  useEffect(() => {
    if (pendingDomainIdsKey) {
      setAutoPolling(true);
    }
  }, [pendingDomainIdsKey]);

  useEffect(() => {
    const payment = searchParams.get("payment");
    const domain = searchParams.get("domain");
    const reference =
      searchParams.get("reference") ?? searchParams.get("trxref") ?? "";

    if (payment !== "success" || !domain) return;

    let cancelled = false;

    const finishHostingPurchase = async () => {
      if (reference) {
        await confirmHostingPaymentAction({
          companyId,
          companySlug: slug,
          reference,
        });
      }

      if (cancelled) return;

      let connect:
        | Awaited<ReturnType<typeof addWebsiteDomainAction>>
        | null = null;

      for (let attempt = 0; attempt < POST_PAYMENT_CONNECT_MAX_ATTEMPTS; attempt++) {
        if (cancelled) return;
        if (attempt > 0) {
          await sleep(POST_PAYMENT_CONNECT_DELAY_MS);
        }

        connect = await addWebsiteDomainAction({
          companyId,
          companySlug: slug,
          domain,
          websiteId: websiteId ?? null,
          isPrimary: domains.length === 0,
        });

        if (connect.ok || !connect.requiresHosting) {
          break;
        }
      }

      if (cancelled || !connect) return;

      if (!connect.ok && connect.requiresHosting) {
        setHostingDomain(domain);
        setError(null);
      } else if (!connect.ok) {
        setError(connect.error);
      } else {
        setSuccess(
          "Hosting is active and your domain is connected. Configure DNS below, then verification will run automatically."
        );
        setAutoPolling(true);
      }

      router.replace(window.location.pathname);
      router.refresh();
    };

    void finishHostingPurchase();

    return () => {
      cancelled = true;
    };
  }, [companyId, domains.length, router, searchParams, slug, websiteId]);

  const onAddDomain = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(null);
    setSuccess(null);
    try {
      const result = await withDomainActionTimeout(
        addWebsiteDomainAction({
          companyId,
          companySlug: slug,
          domain: domainInput,
          websiteId: websiteId ?? null,
          isPrimary: domains.length === 0,
        })
      );
      if (!result.ok) {
        if (result.requiresHosting && result.domain) {
          setHostingDomain(result.domain);
          setError(null);
        } else {
          setError(result.error);
        }
        return;
      }
      setAutoPolling(true);
      pollAttemptsRef.current = 0;
      setSuccess(
        "Domain added. Auto-checking DNS every 20 seconds — add the records below at your DNS host if you have not already."
      );
      setDomainInput("");
      router.refresh();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Could not connect domain. Try again."
      );
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  const onVerify = async (domainId: string) => {
    setVerifyingId(domainId);
    setError(null);
    setAutoPolling(true);
    pollAttemptsRef.current = 0;
    try {
      const result = await runVerification(domainId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.verified) {
        setAutoPolling(false);
        setSuccess("Domain verified!");
      } else {
        setSuccess(
          result.hint ??
            "DNS not verified yet. Auto-checking every 20 seconds while this page is open."
        );
      }
      router.refresh();
    } catch (actionError) {
      setError(
        actionError instanceof Error
          ? actionError.message
          : "Verification timed out. Check DNS records and try again."
      );
      router.refresh();
    } finally {
      setVerifyingId(null);
    }
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

      {hostingDomain ? (
        <DomainHostingCheckoutModal
          open={Boolean(hostingDomain)}
          slug={slug}
          companyId={companyId}
          domain={hostingDomain}
          plans={hostingPlans}
          billingEmail={billingEmail}
          returnPath={`${
            embedded
              ? companyWebsiteBuilderSectionPath(slug, "domains")
              : companyWebsiteDomainsPath(slug)
          }?payment=success&domain=${encodeURIComponent(hostingDomain)}`}
          onClose={() => setHostingDomain(null)}
        />
      ) : null}

      {domains.length === 0 ? (
        <p className="text-sm text-slate-500">No custom domains connected yet.</p>
      ) : (
        <div className="space-y-4">
          {autoPolling && pendingDomainIdsKey ? (
            <p className="flex items-center gap-2 text-sm text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin text-violet-600" />
              Auto-checking DNS for pending domains every 20 seconds…
            </p>
          ) : null}
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
                    {records.some(
                      (record) =>
                        record.record_type === "TXT" &&
                        record.host === "_faraios" &&
                        record.status !== "verified"
                    ) ? (
                      <p className="mt-3 text-xs text-amber-800">
                        Add a TXT record at your domain&apos;s DNS host (where your nameservers
                        point): host <code className="rounded bg-white px-1">_faraios</code>, value{" "}
                        <code className="rounded bg-white px-1 break-all">{records.find((r) => r.host === "_faraios")?.value}</code>
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {error ? (
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-sm font-medium text-red-600">{error}</p>
          {hostingPlans.length > 0 && domainInput.trim() ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-xl"
              onClick={() => setHostingDomain(domainInput.trim().toLowerCase())}
            >
              View hosting plans
            </Button>
          ) : null}
        </div>
      ) : null}
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
