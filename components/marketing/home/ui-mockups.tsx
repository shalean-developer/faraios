import type { ReactNode } from "react";
import { Calendar, ChevronLeft, MapPin, X } from "lucide-react";

import { cn } from "@/lib/utils";

export function PhoneMockup({
  children,
  className,
  edgeToEdge = false,
}: {
  children: ReactNode;
  className?: string;
  edgeToEdge?: boolean;
}) {
  return (
    <div
      className={cn(
        "relative mx-auto aspect-[9/19.5] w-[min(100%,220px)] shrink-0 overflow-hidden rounded-[2.25rem] border-[6px] border-slate-800 bg-slate-800 shadow-2xl",
        className
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-2.5 z-20 h-[18px] w-[76px] -translate-x-1/2 rounded-full bg-slate-900"
      />
      <div
        className={cn(
          "flex h-full min-h-0 flex-col overflow-hidden rounded-[1.65rem] bg-white",
          !edgeToEdge && "pt-9"
        )}
      >
        <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      </div>
    </div>
  );
}

export function BrowserMockup({
  children,
  title = "Shalean",
  className,
}: {
  children: ReactNode;
  title?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl",
        className
      )}
    >
      <div className="flex items-center gap-2 border-b border-slate-100 bg-slate-50 px-4 py-2.5">
        <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        <span className="ml-2 text-xs font-medium text-slate-500">{title}</span>
      </div>
      <div className="bg-white">{children}</div>
    </div>
  );
}

export function BookingWidgetPreview() {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 p-6 text-white shadow-xl">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20 text-lg">
          🚐
        </div>
        <div>
          <p className="text-sm font-bold">Your Business</p>
          <p className="text-xs text-blue-100">Professional home services</p>
        </div>
      </div>
      <div className="space-y-3 rounded-xl bg-white/10 p-4">
        <div className="rounded-lg bg-white/20 px-3 py-2 text-sm">Select a service ▾</div>
        <div className="rounded-lg bg-white/20 px-3 py-2 text-sm">Pick a date & time ▾</div>
        <div className="rounded-lg bg-white/20 px-3 py-2 text-sm">Your details</div>
      </div>
      <button
        type="button"
        className="mt-4 w-full rounded-xl bg-white py-2.5 text-sm font-bold text-blue-700"
      >
        Book now
      </button>
    </div>
  );
}

export function MiniBookingScreen() {
  return (
    <div className="flex h-full flex-col px-4 pb-5 pt-9">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
        Booking confirmed
      </p>
      <p className="mt-1 text-sm font-bold text-slate-900">House cleaning</p>
      <p className="mt-0.5 text-xs text-slate-500">Thu, 26 Jun · 09:00</p>
      <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2">
        <p className="text-xs font-medium text-emerald-800">Sarah M. · R850</p>
      </div>
      <div className="mt-auto space-y-1.5 pt-8">
        <div className="h-2 rounded-full bg-slate-100" />
        <div className="h-2 w-4/5 rounded-full bg-slate-100" />
        <div className="h-2 w-3/5 rounded-full bg-slate-100" />
      </div>
    </div>
  );
}

const MOBILE_TIME_SLOTS = [
  "9 AM – 12 PM",
  "12 PM – 1 PM",
  "1 PM – 2 PM",
  "2 PM – 3 PM",
  "3 PM – 4 PM",
  "4 PM – 5 PM",
] as const;

function BookingFlowBrandMark({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-white/90 text-[9px] font-bold text-white">
        S
      </span>
      <span className="text-sm font-bold tracking-tight text-white">Shalean</span>
    </div>
  );
}

export function BookingFlowDesktopPreview({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/10",
        className
      )}
    >
      <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-100 px-4 py-2">
        <div className="h-2.5 w-2.5 rounded-full bg-red-400" />
        <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
        <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
        <div className="ml-1 flex-1 rounded-md border border-slate-200 bg-white px-3 py-1 text-[11px] text-slate-500">
          book.yourbusiness.com
        </div>
      </div>

      <div className="flex h-[calc(min(100%,240px)*19.5/9)] flex-col sm:h-[calc(220px*19.5/9)]">
        <div className="flex shrink-0 items-center bg-emerald-800 px-4 py-2.5">
          <ChevronLeft className="h-5 w-5 shrink-0 text-white/90" aria-hidden />
          <div className="flex flex-1 justify-center">
            <BookingFlowBrandMark />
          </div>
          <span className="w-5" aria-hidden />
        </div>

        <div className="grid min-h-0 flex-1 sm:grid-cols-[1fr_minmax(0,10.5rem)]">
          <div className="flex min-h-0 flex-col justify-between bg-white p-5 sm:p-6">
            <div>
              <p className="text-base font-bold leading-snug text-slate-900 sm:text-lg">
                Do you also need the boxspring removed?
              </p>
              <div className="mt-4 space-y-2.5">
                <div className="rounded-xl border border-emerald-600 bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-800 sm:text-base">
                  Yes
                </div>
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-center text-sm font-medium text-slate-700 sm:text-base">
                  No
                </div>
              </div>
            </div>
            <div className="mt-4 flex justify-start sm:mt-0">
              <div className="rounded-xl bg-emerald-800 px-7 py-2.5">
                <div className="h-2.5 w-14 rounded-full bg-emerald-400/80" />
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-col border-t border-slate-100 bg-slate-50/50 p-4 sm:border-l sm:border-t-0 sm:p-5">
          <p className="text-sm font-bold text-slate-900">Mattress Removal</p>
          <p className="mt-1 text-xs text-slate-600">Queen</p>
          <p className="text-xs text-slate-600">Yes</p>

          <div className="mt-4 space-y-3">
            <div className="flex items-start gap-2">
              <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
              <div className="space-y-1.5">
                <div className="h-1.5 w-20 rounded-full bg-slate-200" />
                <div className="h-1.5 w-14 rounded-full bg-slate-200" />
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
              <div className="space-y-1.5">
                <div className="h-1.5 w-24 rounded-full bg-slate-200" />
                <div className="h-1.5 w-16 rounded-full bg-slate-200" />
              </div>
            </div>
          </div>

          <div className="mt-auto space-y-1 pt-4 text-xs font-semibold text-slate-900">
            <p>Subtotal</p>
            <p>Discount</p>
            <p className="text-sm">Estimated</p>
          </div>
        </div>
        </div>
      </div>
    </div>
  );
}

export function BookingFlowMobilePreview() {
  return (
    <div className="flex h-full flex-col bg-white">
      <div className="bg-emerald-800 px-3 pb-2 pt-9">
        <div className="flex items-center justify-between">
          <ChevronLeft className="h-4 w-4 text-white/90" aria-hidden />
          <BookingFlowBrandMark className="scale-90" />
          <X className="h-4 w-4 text-white/90" aria-hidden />
        </div>
        <div className="mt-2 h-0.5 w-full overflow-hidden rounded-full bg-emerald-900/50">
          <div className="h-full w-2/5 rounded-full bg-emerald-400" />
        </div>
      </div>

      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5">
        <p className="text-[11px] font-semibold text-slate-900">Mattress Removal</p>
        <p className="text-sm font-bold text-emerald-600">R1,290</p>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden px-4 py-3">
        <p className="text-xs font-bold text-slate-900">Date &amp; Time</p>

        <div className="mt-3 flex items-center justify-between gap-1">
          <button
            type="button"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-emerald-200 text-emerald-700"
            aria-hidden
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <div className="flex flex-1 justify-center gap-3 text-center">
            <div className="text-[10px] text-slate-400">
              <p>Mon</p>
              <p className="font-medium">Sep 14</p>
            </div>
            <div className="text-[10px] text-emerald-600">
              <p className="font-semibold">Tue</p>
              <p className="font-bold underline decoration-2 underline-offset-4">Sep 15</p>
            </div>
            <div className="text-[10px] text-slate-400">
              <p>Wed</p>
              <p className="font-medium">Sep 16</p>
            </div>
          </div>
          <button
            type="button"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-emerald-200 text-emerald-700"
            aria-hidden
          >
            <ChevronLeft className="h-3.5 w-3.5 rotate-180" />
          </button>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          {MOBILE_TIME_SLOTS.map((slot) => (
            <div
              key={slot}
              className="rounded-lg border border-emerald-600 px-2 py-2 text-center text-[9px] font-semibold leading-tight text-emerald-700"
            >
              {slot}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-emerald-800 px-4 py-3">
        <div className="mx-auto h-2.5 w-20 rounded-full bg-emerald-400/80" />
      </div>
    </div>
  );
}

export function PaymentsDashboardPreview() {
  return (
    <div className="p-5">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm font-bold text-white">Revenue overview</p>
        <span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
          +18% this month
        </span>
      </div>
      <p className="text-3xl font-extrabold text-white">R24,500</p>
      <div className="mt-4 flex h-24 items-end gap-1.5">
        {[40, 55, 45, 70, 60, 85, 75].map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-md bg-emerald-500/60"
            style={{ height: `${h}%` }}
          />
        ))}
      </div>
      <div className="mt-4 space-y-2">
        {[
          { label: "Invoice #1042", amount: "R1,800", status: "Paid" },
          { label: "Invoice #1041", amount: "R2,400", status: "Pending" },
        ].map((row) => (
          <div
            key={row.label}
            className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2"
          >
            <span className="text-xs text-slate-300">{row.label}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-white">{row.amount}</span>
              <span
                className={`text-[10px] font-medium ${row.status === "Paid" ? "text-emerald-400" : "text-amber-400"}`}
              >
                {row.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
