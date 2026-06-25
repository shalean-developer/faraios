import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export function PhoneMockup({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "relative mx-auto w-[220px] overflow-hidden rounded-[2rem] border-[6px] border-slate-800 bg-slate-800 shadow-2xl",
        className
      )}
    >
      <div className="absolute left-1/2 top-2 z-10 h-4 w-16 -translate-x-1/2 rounded-full bg-slate-900" />
      <div className="overflow-hidden rounded-[1.4rem] bg-white">{children}</div>
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
    <div className="p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-600">
        Booking confirmed
      </p>
      <p className="mt-1 text-sm font-bold text-slate-900">House cleaning</p>
      <p className="mt-0.5 text-xs text-slate-500">Thu, 26 Jun · 09:00</p>
      <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2">
        <p className="text-xs font-medium text-emerald-800">Sarah M. · R850</p>
      </div>
      <div className="mt-3 space-y-1.5">
        <div className="h-2 rounded-full bg-slate-100" />
        <div className="h-2 w-4/5 rounded-full bg-slate-100" />
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
