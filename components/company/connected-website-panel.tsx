"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, ExternalLink, Loader2 } from "lucide-react";

import {
  registerExternalWebsiteAction,
  updateWebsiteConnectionSettingsAction,
} from "@/app/actions/website-engine";
import { connectExternalWebsite } from "@/app/actions/company";
import { Button } from "@/components/ui/button";
import type { ConnectedWebsite } from "@/types/database";

function appOrigin(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_APP_URL ?? "https://faraios.com";
}

export function ConnectedWebsitePanel({
  companyId,
  slug,
  connectedWebsite,
}: {
  companyId: string;
  slug: string;
  connectedWebsite: ConnectedWebsite | null;
}) {
  const router = useRouter();
  const [name, setName] = useState(connectedWebsite?.name ?? "");
  const [productionUrl, setProductionUrl] = useState(
    connectedWebsite?.production_url ?? ""
  );
  const [apiKey, setApiKey] = useState(connectedWebsite?.api_key ?? "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [testing, setTesting] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const origin = appOrigin();
  const businessId = companyId;

  const bookingSnippet = `<script src="${origin}/embed/booking.js" data-business-id="${businessId}"></script>`;
  const trackingSnippet = `<script src="${origin}/tracking.js" data-business-id="${businessId}"></script>`;

  const onConnect = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setPending(true);
    try {
      const registerResult = await registerExternalWebsiteAction({
        companyId,
        companySlug: slug,
        name: name || "External website",
        productionUrl,
      });
      if (!registerResult.ok) {
        setError(registerResult.error);
        return;
      }

      const result = await connectExternalWebsite({
        companyId,
        companySlug: slug,
        productionUrl,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess("Connected website saved.");
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  const onCopy = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const onTestConnection = async () => {
    if (!apiKey) return;
    setTesting(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch("/api/v1/health", {
        headers: { "X-FaraiOS-Company-Key": apiKey },
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error ?? "Connection test failed.");
        return;
      }
      setSuccess("API connection verified.");
    } catch {
      setError("Could not reach the API.");
    } finally {
      setTesting(false);
    }
  };

  const onToggleSetting = async (
    field: "bookingEnabled" | "trackingEnabled" | "seoEnabled",
    value: boolean
  ) => {
    const result = await updateWebsiteConnectionSettingsAction({
      companyId,
      companySlug: slug,
      [field]: value,
    });
    if (!result.ok) setError(result.error);
    else router.refresh();
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="font-semibold text-slate-900">Connect your existing site</h3>
      <p className="mt-1 text-sm text-slate-500">
        Option A — connect a custom website built outside FaraiOS using your business ID,
        public API, booking widget, and tracking script.
      </p>

      <form onSubmit={onConnect} className="mt-4 space-y-3">
        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Website name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="My business website"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
            Production URL
          </label>
          <input
            value={productionUrl}
            onChange={(e) => setProductionUrl(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            placeholder="https://yourbusiness.com"
          />
        </div>

        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Business ID
          </p>
          <code className="mt-1 block break-all text-xs text-slate-700">{businessId}</code>
        </div>

        {apiKey ? (
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">
              Public API key (V1 legacy)
            </label>
            <div className="flex gap-2">
              <input
                value={apiKey}
                readOnly
                className="min-w-0 flex-1 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2 font-mono text-xs text-slate-600"
              />
              <Button
                type="button"
                variant="outline"
                className="shrink-0 rounded-xl"
                onClick={() => onCopy(apiKey, "key")}
              >
                {copied === "key" ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="mt-2 text-xs text-slate-500">
              V2 public API uses business ID only. V1 uses{" "}
              <code className="rounded bg-slate-100 px-1">X-FaraiOS-Company-Key</code>.
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2">
          <Button type="submit" className="rounded-xl" disabled={pending}>
            {pending ? "Saving..." : connectedWebsite ? "Update connection" : "Connect site"}
          </Button>
          {apiKey ? (
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              disabled={testing}
              onClick={onTestConnection}
            >
              {testing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testing...
                </>
              ) : (
                "Test API connection"
              )}
            </Button>
          ) : null}
        </div>
      </form>

      {connectedWebsite ? (
        <div className="mt-6 space-y-4 border-t border-slate-100 pt-6">
          <h4 className="text-sm font-semibold text-slate-900">Embed scripts</h4>

          <SnippetBlock
            label="Booking widget"
            snippet={bookingSnippet}
            copied={copied === "booking"}
            onCopy={() => onCopy(bookingSnippet, "booking")}
          />
          <SnippetBlock
            label="Tracking script"
            snippet={trackingSnippet}
            copied={copied === "tracking"}
            onCopy={() => onCopy(trackingSnippet, "tracking")}
          />

          <div className="flex flex-wrap gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={connectedWebsite.booking_enabled !== false}
                onChange={(e) => onToggleSetting("bookingEnabled", e.target.checked)}
              />
              Booking enabled
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={connectedWebsite.tracking_enabled !== false}
                onChange={(e) => onToggleSetting("trackingEnabled", e.target.checked)}
              />
              Tracking enabled
            </label>
          </div>

          {connectedWebsite.production_url ? (
            <a
              href={connectedWebsite.production_url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-violet-700 hover:text-violet-900"
            >
              Visit connected site <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : null}
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm font-medium text-red-600">{error}</p> : null}
      {success ? (
        <p className="mt-3 text-sm font-medium text-emerald-600">{success}</p>
      ) : null}
    </div>
  );
}

function SnippetBlock({
  label,
  snippet,
  copied,
  onCopy,
}: {
  label: string;
  snippet: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {label}
        </span>
        <Button type="button" variant="ghost" size="sm" className="h-7 rounded-lg" onClick={onCopy}>
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </Button>
      </div>
      <pre className="overflow-x-auto rounded-xl bg-slate-900 p-3 text-xs text-slate-100">
        {snippet}
      </pre>
    </div>
  );
}
