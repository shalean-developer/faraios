"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Copy, KeyRound, ShieldOff } from "lucide-react";

import { revokeApiKeyAction, rotateApiKeyAction } from "@/app/actions/website-engine";
import { companyWebsitesPath } from "@/lib/paths/company";
import {
  riseCardClassName,
  riseOutlineButtonClassName,
  risePageClassName,
  risePrimaryButtonClassName,
} from "@/lib/ui/rise-dashboard-styles";
import { cn } from "@/lib/utils";
import type { BusinessApiKeyEvent } from "@/types/website-engine";

function appOrigin(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_APP_URL ?? "https://faraios.com";
}

export function WebsiteApiKeysClient({
  companyId,
  slug,
  apiKey,
  apiKeyStatus,
  keyEvents,
}: {
  companyId: string;
  slug: string;
  apiKey: string | null;
  apiKeyStatus: string;
  keyEvents: BusinessApiKeyEvent[];
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [displayKey, setDisplayKey] = useState(apiKey);

  const origin = appOrigin();
  const bookingEndpoint = `${origin}/api/public/business/${companyId}/bookings`;

  const onRotate = async () => {
    if (!confirm("Rotate API key? Existing integrations using the old key will stop working.")) {
      return;
    }
    setPending(true);
    setError(null);
    const result = await rotateApiKeyAction({ companyId, companySlug: slug });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDisplayKey(result.apiKey);
    setSuccess("New API key generated.");
  };

  const onRevoke = async () => {
    if (!confirm("Revoke API key? V1 API access will be disabled until you rotate a new key.")) {
      return;
    }
    setPending(true);
    const result = await revokeApiKeyAction({ companyId, companySlug: slug });
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSuccess("API key revoked.");
    window.location.reload();
  };

  const onCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={risePageClassName}>
      <Link
        href={companyWebsitesPath(slug)}
        className="text-sm font-medium text-slate-600 hover:text-slate-900"
      >
        ← Website overview
      </Link>

      <div className={cn(riseCardClassName, "mt-4")}>
        <div className="px-4 py-4 sm:px-5">
          <h1 className="text-lg font-medium text-slate-800">API keys</h1>
          <p className="mt-1 text-sm text-slate-500">
            Generate, rotate, and revoke public API keys for external website integrations.
          </p>
        </div>
      </div>

      <div className={cn(riseCardClassName, "mt-4 p-5")}>
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 text-sky-700">
            <KeyRound className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-medium text-slate-800">Public API access</h3>
            <p className="mt-1 text-sm text-slate-500">
              V2 public API uses your business ID. V1 legacy endpoints use the company API key
              below. Public keys only allow safe actions: fetch business details, services, booking
              form config, and submit bookings.
            </p>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase text-slate-500">Business ID</p>
            <code className="mt-1 block break-all text-xs">{companyId}</code>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase text-slate-500">V1 API key</p>
            <div className="mt-1 flex gap-2">
              <input
                readOnly
                value={displayKey ?? "No key — connect a website to generate one"}
                className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs"
              />
              {displayKey ? (
                <button
                  type="button"
                  className={riseOutlineButtonClassName}
                  onClick={() => onCopy(displayKey)}
                >
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                </button>
              ) : null}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Status:{" "}
              <span className={apiKeyStatus === "active" ? "text-emerald-700" : "text-red-700"}>
                {apiKeyStatus}
              </span>
            </p>
          </div>

          <div className="rounded-lg border border-slate-100 bg-slate-50 p-3">
            <p className="text-xs font-semibold uppercase text-slate-500">Booking API endpoint</p>
            <code className="mt-1 block break-all text-xs">{bookingEndpoint}</code>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            className={risePrimaryButtonClassName}
            disabled={pending}
            onClick={onRotate}
          >
            {displayKey ? "Rotate key" : "Generate key"}
          </button>
          {displayKey && apiKeyStatus === "active" ? (
            <button
              type="button"
              className={cn(riseOutlineButtonClassName, "text-red-700")}
              disabled={pending}
              onClick={onRevoke}
            >
              <ShieldOff className="h-4 w-4" />
              Revoke key
            </button>
          ) : null}
        </div>
      </div>

      {keyEvents.length > 0 ? (
        <div className={cn(riseCardClassName, "mt-4 p-5")}>
          <h3 className="font-medium text-slate-800">Key activity</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {keyEvents.map((event) => (
              <li key={event.id} className="flex justify-between gap-4 text-slate-600">
                <span className="capitalize">{event.event_type.replace(/_/g, " ")}</span>
                <span className="text-xs text-slate-400">
                  {new Date(event.created_at).toLocaleString()}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {error ? <p className="mt-4 text-sm font-medium text-red-600">{error}</p> : null}
      {success ? <p className="mt-4 text-sm font-medium text-emerald-600">{success}</p> : null}
    </div>
  );
}
