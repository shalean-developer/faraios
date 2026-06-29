"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { CalendarDays, CreditCard, Megaphone, PenLine } from "lucide-react";

import { fadeUp, sectionScrollClass, stagger } from "@/components/marketing/home/motion";
import { landingContainer, landingSectionPad } from "@/components/marketing/home/landing-styles";
import { FEATURE_GRID_ITEMS, type FeatureGridItem } from "@/lib/data/home-marketing";
import { cn } from "@/lib/utils";

const GRID_ICONS = [PenLine, CalendarDays, CreditCard, Megaphone] as const;

const accentStyles: Record<
  FeatureGridItem["accent"],
  { card: string; icon: string; mockup: string; mockupBorder: string; mockupText: string }
> = {
  green: {
    card: "from-emerald-50/80 to-white",
    icon: "bg-emerald-100 text-emerald-600",
    mockup: "bg-emerald-600",
    mockupBorder: "border-emerald-200",
    mockupText: "text-emerald-700",
  },
  blue: {
    card: "from-sky-50/80 to-white",
    icon: "bg-sky-100 text-sky-600",
    mockup: "bg-sky-600",
    mockupBorder: "border-sky-200",
    mockupText: "text-sky-700",
  },
  cream: {
    card: "from-amber-50/80 to-white",
    icon: "bg-amber-100 text-amber-600",
    mockup: "bg-amber-500",
    mockupBorder: "border-amber-200",
    mockupText: "text-amber-700",
  },
  slate: {
    card: "from-slate-50/80 to-white",
    icon: "bg-slate-100 text-slate-600",
    mockup: "bg-slate-700",
    mockupBorder: "border-slate-200",
    mockupText: "text-slate-700",
  },
};

function MockupShell({ children }: { children: ReactNode }) {
  return (
    <div className="mt-5 overflow-hidden rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
      {children}
    </div>
  );
}

function BookingFormMockup({ accent }: { accent: FeatureGridItem["accent"] }) {
  const style = accentStyles[accent];
  return (
    <MockupShell>
      <p className="text-[10px] font-semibold text-slate-900">Book a service</p>
      <div className="mt-2 space-y-1.5">
        <div className="flex items-center justify-between rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] text-slate-600">
          House cleaning
          <span className="text-slate-400">▾</span>
        </div>
        <div className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] text-slate-600">
          Thu, 26 Jun · 09:00
        </div>
        <div className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[10px] text-slate-400">
          Name, phone & address
        </div>
        <div
          className={cn(
            "rounded-lg py-1.5 text-center text-[10px] font-semibold text-white",
            style.mockup
          )}
        >
          Confirm booking
        </div>
      </div>
    </MockupShell>
  );
}

function CalendarDispatchMockup({ accent }: { accent: FeatureGridItem["accent"] }) {
  const style = accentStyles[accent];
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"] as const;
  return (
    <MockupShell>
      <div className="flex gap-1">
        {days.map((day, i) => (
          <span
            key={day}
            className={cn(
              "flex-1 rounded-md py-1 text-center text-[9px] font-semibold",
              i === 1 ? cn("text-white", style.mockup) : "bg-slate-50 text-slate-500"
            )}
          >
            {day}
          </span>
        ))}
      </div>
      <div className="mt-2 space-y-1.5">
        <div className={cn("rounded-lg border px-2 py-1.5", style.mockupBorder, "bg-sky-50/50")}>
          <p className={cn("text-[9px] font-semibold", style.mockupText)}>09:00 · House clean</p>
          <p className="text-[9px] text-slate-500">Sarah M. · Sandton</p>
        </div>
        <div className="rounded-lg border border-slate-100 bg-slate-50 px-2 py-1.5">
          <p className="text-[9px] font-semibold text-slate-700">13:00 · Office clean</p>
          <p className="text-[9px] text-slate-500">Greenview Ltd</p>
        </div>
      </div>
    </MockupShell>
  );
}

function PaymentsMockup({ accent }: { accent: FeatureGridItem["accent"] }) {
  const rows = [
    { id: "#1042", amount: "R1,800", status: "Paid" as const },
    { id: "#1041", amount: "R2,400", status: "Pending" as const },
  ];
  return (
    <MockupShell>
      <p className="text-[10px] font-semibold text-slate-900">Recent invoices</p>
      <div className="mt-2 space-y-1.5">
        {rows.map((row) => (
          <div
            key={row.id}
            className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5"
          >
            <span className="text-[10px] text-slate-600">Invoice {row.id}</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-semibold text-slate-900">{row.amount}</span>
              <span
                className={cn(
                  "text-[9px] font-medium",
                  row.status === "Paid" ? "text-emerald-600" : "text-amber-600"
                )}
              >
                {row.status}
              </span>
            </div>
          </div>
        ))}
        <div className="flex items-center justify-between border-t border-slate-100 pt-1.5">
          <span className="text-[10px] font-semibold text-slate-900">Total due</span>
          <span className={cn("text-[10px] font-bold", accentStyles[accent].mockupText)}>
            R2,400
          </span>
        </div>
      </div>
    </MockupShell>
  );
}

function GrowthToolsMockup({ accent }: { accent: FeatureGridItem["accent"] }) {
  const style = accentStyles[accent];
  return (
    <MockupShell>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold text-slate-900">Google reviews</p>
          <p className="text-[9px] text-amber-500">★★★★★ 4.9</p>
        </div>
        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[9px] font-semibold text-emerald-700">
          +12 this month
        </span>
      </div>
      <div className="mt-2 space-y-1.5">
        <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5">
          <span className="text-[10px] text-slate-600">Email campaign</span>
          <span className="text-[10px] font-semibold text-slate-900">128 opens</span>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50 px-2.5 py-1.5">
          <span className="text-[10px] text-slate-600">SEO score</span>
          <span className={cn("text-[10px] font-bold", style.mockupText)}>82 / 100</span>
        </div>
        <div
          className={cn(
            "rounded-lg py-1.5 text-center text-[10px] font-semibold text-white",
            style.mockup
          )}
        >
          Boost visibility
        </div>
      </div>
    </MockupShell>
  );
}

const FEATURE_MOCKUPS = [
  BookingFormMockup,
  CalendarDispatchMockup,
  PaymentsMockup,
  GrowthToolsMockup,
] as const;

function FeatureMockup({ index, accent }: { index: number; accent: FeatureGridItem["accent"] }) {
  const Mockup = FEATURE_MOCKUPS[index] ?? BookingFormMockup;
  return <Mockup accent={accent} />;
}

export function FeatureGridSection() {
  return (
    <section className={cn(landingSectionPad, sectionScrollClass, "bg-white")}>
      <div className={landingContainer}>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={stagger}
          className="grid gap-6 sm:grid-cols-2"
        >
          {FEATURE_GRID_ITEMS.map((item, i) => {
            const Icon = GRID_ICONS[i] ?? PenLine;
            const style = accentStyles[item.accent];
            return (
              <motion.div
                key={item.title}
                variants={fadeUp}
                className={cn(
                  "rounded-2xl border border-slate-100 bg-gradient-to-br p-6 shadow-sm transition-shadow hover:shadow-md sm:p-8",
                  style.card
                )}
              >
                <div
                  className={cn(
                    "mb-4 flex h-10 w-10 items-center justify-center rounded-xl",
                    style.icon
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.description}</p>
                <FeatureMockup index={i} accent={item.accent} />
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
