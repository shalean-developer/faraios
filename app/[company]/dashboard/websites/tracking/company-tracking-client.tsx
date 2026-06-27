"use client";

import Link from "next/link";
import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { companyWebsitesPath } from "@/lib/paths/company";
import {
  riseCardClassName,
  riseOutlineButtonClassName,
  risePageClassName,
} from "@/lib/ui/rise-dashboard-styles";
import { cn } from "@/lib/utils";

function appOrigin(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_APP_URL ?? "https://faraios.com";
}

export function WebsiteTrackingClient({
  slug,
  companyId,
  trackingEnabled,
  recentEvents,
}: {
  slug: string;
  companyId: string;
  trackingEnabled: boolean;
  recentEvents: {
    id: string;
    event_type: string;
    source_url: string | null;
    referrer: string | null;
    utm_source: string | null;
    created_at: string;
  }[];
}) {
  const [copied, setCopied] = useState(false);
  const origin = appOrigin();
  const snippet = `<script src="${origin}/tracking.js" data-business-id="${companyId}"></script>`;

  const onCopy = async () => {
    await navigator.clipboard.writeText(snippet);
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
          <h1 className="text-lg font-medium text-slate-800">Tracking</h1>
          <p className="mt-1 text-sm text-slate-500">
            Install the FaraiOS tracking script on your external website to capture leads and
            conversions.
          </p>
        </div>
      </div>

      <div className={cn(riseCardClassName, "mt-4 p-5")}>
        <h3 className="font-medium text-slate-800">Tracking script</h3>
        <p className="mt-1 text-sm text-slate-500">
          Add this script to your external website to track page visits, booking form views, and
          conversions. Tracking is {trackingEnabled ? "enabled" : "disabled"} for your connection.
        </p>

        <div className="mt-4">
          <div className="mb-1 flex justify-end">
            <button type="button" className={riseOutlineButtonClassName} onClick={onCopy}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 text-xs text-slate-100">
            {snippet}
          </pre>
        </div>

        <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600">
          <p className="font-medium text-slate-900">Tracked events</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
            <li>Page visits</li>
            <li>Link and button clicks</li>
            <li>Booking form views</li>
            <li>Booking submissions</li>
            <li>Quote requests</li>
            <li>Contact form submissions</li>
            <li>Core Web Vitals (LCP, CLS)</li>
          </ul>
          <p className="mt-3 text-xs text-slate-500">
            UTM parameters and referrer are captured automatically. Use{" "}
            <code className="rounded bg-white px-1">window.FaraiOS.track(&apos;event_type&apos;)</code>{" "}
            for custom events.
          </p>
        </div>
      </div>

      <div className={cn(riseCardClassName, "mt-4 p-5")}>
        <h3 className="font-medium text-slate-800">Recent activity</h3>
        {recentEvents.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No tracking events yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-slate-100">
            {recentEvents.map((event) => (
              <li key={event.id} className="py-3 text-sm">
                <div className="flex justify-between gap-4">
                  <span className="font-medium capitalize text-slate-900">
                    {event.event_type.replace(/_/g, " ")}
                  </span>
                  <span className="shrink-0 text-xs text-slate-400">
                    {new Date(event.created_at).toLocaleString()}
                  </span>
                </div>
                {event.source_url ? (
                  <p className="mt-1 truncate text-xs text-slate-500">{event.source_url}</p>
                ) : null}
                {event.utm_source ? (
                  <p className="mt-0.5 text-xs text-slate-400">utm_source: {event.utm_source}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
