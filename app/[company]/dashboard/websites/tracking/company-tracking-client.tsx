"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

function appOrigin(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return process.env.NEXT_PUBLIC_APP_URL ?? "https://faraios.com";
}

export function WebsiteTrackingClient({
  companyId,
  trackingEnabled,
  recentEvents,
}: {
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
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-semibold text-slate-900">Tracking script</h3>
        <p className="mt-1 text-sm text-slate-500">
          Add this script to your external website to track page visits, booking form views, and
          conversions. Tracking is {trackingEnabled ? "enabled" : "disabled"} for your connection.
        </p>

        <div className="mt-4">
          <div className="mb-1 flex justify-end">
            <Button type="button" variant="ghost" size="sm" className="rounded-lg" onClick={onCopy}>
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <pre className="overflow-x-auto rounded-xl bg-slate-900 p-3 text-xs text-slate-100">
            {snippet}
          </pre>
        </div>

        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm text-slate-600">
          <p className="font-medium text-slate-900">Tracked events</p>
          <ul className="mt-2 list-inside list-disc space-y-1 text-sm">
            <li>Page visits</li>
            <li>Booking form views</li>
            <li>Booking submissions</li>
            <li>Quote requests</li>
            <li>Contact form submissions</li>
          </ul>
          <p className="mt-3 text-xs text-slate-500">
            UTM parameters and referrer are captured automatically. Use{" "}
            <code className="rounded bg-white px-1">window.Shalean.track(&apos;event_type&apos;)</code>{" "}
            for custom events.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="font-semibold text-slate-900">Recent activity</h3>
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
