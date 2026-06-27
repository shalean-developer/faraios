"use client";

import Link from "next/link";
import { ArrowRight, ExternalLink } from "lucide-react";

import { BOOKING_WIDGET_PLATFORM_GUIDES } from "@/lib/constants/booking-widget-platforms";
import {
  bookingWidgetSnippet,
  faraiosAppOrigin,
  hostedBookingPageUrl,
} from "@/lib/integrations/booking-widget-snippets";
import { companyWebsiteConnectionPath } from "@/lib/paths/company";
import { cn } from "@/lib/utils";

type BookingWidgetInstallSummaryProps = {
  companySlug: string;
  businessId: string;
  formPublished?: boolean;
  className?: string;
  showSnippet?: boolean;
};

export function BookingWidgetInstallSummary({
  companySlug,
  businessId,
  formPublished = true,
  className,
  showSnippet = false,
}: BookingWidgetInstallSummaryProps) {
  const origin = faraiosAppOrigin();
  const connectionPath = companyWebsiteConnectionPath(companySlug);
  const snippet = bookingWidgetSnippet(origin, businessId);
  const bookUrl = hostedBookingPageUrl(origin, businessId);
  const platformNames = BOOKING_WIDGET_PLATFORM_GUIDES.map((platform) => platform.name);

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5",
        className
      )}
    >
      <h3 className="text-sm font-medium text-slate-700">Add booking widget to your site</h3>
      <p className="mt-1 text-sm text-slate-500">
        After publishing your form, embed it on WordPress, Wix, Squarespace, Shopify, and other
        builders — or link to a hosted booking page.
      </p>

      <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-slate-700">
        <li className={cn(!formPublished && "font-medium text-amber-900")}>
          {formPublished
            ? "Your booking form is published."
            : "Publish your booking form on this page."}
        </li>
        <li>
          Open{" "}
          <Link href={connectionPath} className="font-medium text-[#4a6fd8] hover:underline">
            Website → Connection
          </Link>{" "}
          and copy your booking widget snippet.
        </li>
        <li>Paste the snippet on your external site’s booking page (or use the hosted link below).</li>
      </ol>

      {showSnippet ? (
        <pre className="mt-4 overflow-x-auto rounded-xl bg-slate-900 p-3 text-[11px] text-slate-100">
          {snippet}
        </pre>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-1.5">
        {platformNames.map((name) => (
          <span
            key={name}
            className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-600"
          >
            {name}
          </span>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <Link
          href={connectionPath}
          className="inline-flex items-center gap-1 text-sm font-medium text-[#4a6fd8] hover:underline"
        >
          View full setup guides
          <ArrowRight className="h-4 w-4" />
        </Link>
        <a
          href={bookUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          Hosted booking page
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}
