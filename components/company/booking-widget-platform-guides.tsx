"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  BOOKING_WIDGET_PLATFORM_GUIDES,
  BOOKING_WIDGET_PREREQUISITES,
  BOOKING_WIDGET_TROUBLESHOOTING,
} from "@/lib/constants/booking-widget-platforms";
import { hostedBookingPageUrl } from "@/lib/integrations/booking-widget-snippets";

type BookingWidgetPlatformGuidesProps = {
  businessId: string;
  appOrigin: string;
  bookingSnippet: string;
  trackingSnippet: string;
  hasConnectedWebsite: boolean;
  companySlug: string;
};

export function BookingWidgetPlatformGuides({
  businessId,
  appOrigin,
  bookingSnippet,
  trackingSnippet,
  hasConnectedWebsite,
  companySlug,
}: BookingWidgetPlatformGuidesProps) {
  const hostedBookUrl = hostedBookingPageUrl(appOrigin, businessId);

  return (
    <div className="mt-6 space-y-4 border-t border-slate-100 pt-6">
      <div>
        <h4 className="text-sm font-semibold text-slate-900">Install on your website builder</h4>
        <p className="mt-1 text-sm text-slate-500">
          Shalean works with popular website builders and custom-coded sites. Copy the embed
          snippets above, then follow the guide for your platform.
        </p>
      </div>

      <div className="rounded-xl border border-violet-100 bg-violet-50/60 p-4 text-sm text-slate-700">
        <p className="font-semibold text-slate-900">Before you install</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          {BOOKING_WIDGET_PREREQUISITES.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-slate-600">
          Manage your form in{" "}
          <Link
            href={`/${companySlug}/dashboard/booking-form`}
            className="font-medium text-violet-700 hover:text-violet-900"
          >
            Booking form
          </Link>{" "}
          and services in{" "}
          <Link
            href={`/${companySlug}/dashboard/services`}
            className="font-medium text-violet-700 hover:text-violet-900"
          >
            Services
          </Link>
          .
        </p>
      </div>

      {!hasConnectedWebsite ? (
        <p className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Save your connected website above to generate your personal booking and tracking snippets.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm">
            <p className="font-medium text-slate-900">Booking widget snippet</p>
            <p className="mt-1 text-xs text-slate-600">
              Paste on your booking page. The form loads automatically.
            </p>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-900 p-2 text-[11px] text-slate-100">
              {bookingSnippet}
            </pre>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 text-sm">
            <p className="font-medium text-slate-900">Tracking script (optional)</p>
            <p className="mt-1 text-xs text-slate-600">
              Paste in your site footer or site-wide code injection area.
            </p>
            <pre className="mt-2 overflow-x-auto rounded-lg bg-slate-900 p-2 text-[11px] text-slate-100">
              {trackingSnippet}
            </pre>
          </div>
        </div>
      )}

      <Accordion className="space-y-3">
        {BOOKING_WIDGET_PLATFORM_GUIDES.map((platform) => (
          <AccordionItem key={platform.id} value={platform.id}>
            <AccordionTrigger>{platform.name}</AccordionTrigger>
            <AccordionContent>
              <p className="mb-3 text-slate-600">{platform.summary}</p>
              <ol className="list-decimal space-y-2 pl-5 text-slate-700">
                {platform.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
              {platform.tips?.length ? (
                <ul className="mt-4 list-disc space-y-1 pl-5 text-xs text-slate-500">
                  {platform.tips.map((tip) => (
                    <li key={tip}>{tip}</li>
                  ))}
                </ul>
              ) : null}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-700">
        <p className="font-medium text-slate-900">Optional: hosted booking page</p>
        <p className="mt-1 text-slate-600">
          Prefer not to embed? Link a &quot;Book now&quot; button to Shalean instead:
        </p>
        <a
          href={hostedBookUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-flex items-center gap-1 break-all font-mono text-xs text-violet-700 hover:text-violet-900"
        >
          {hostedBookUrl}
          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
        </a>
      </div>

      <div className="rounded-xl border border-amber-100 bg-amber-50/80 p-4 text-sm">
        <p className="font-semibold text-slate-900">Troubleshooting</p>
        <ul className="mt-3 space-y-3">
          {BOOKING_WIDGET_TROUBLESHOOTING.map((item) => (
            <li key={item.issue}>
              <p className="font-medium text-slate-900">{item.issue}</p>
              <p className="mt-0.5 text-slate-600">{item.fix}</p>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-slate-500">
        After publishing, open your live booking page and submit a test request. It should appear
        under Bookings in your Shalean dashboard within a few seconds.
      </p>
    </div>
  );
}
