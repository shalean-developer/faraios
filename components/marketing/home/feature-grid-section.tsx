"use client";

import { motion } from "framer-motion";
import { CalendarDays, CreditCard, Megaphone, PenLine } from "lucide-react";

import { fadeUp, sectionScrollClass, stagger } from "@/components/marketing/home/motion";
import { FEATURE_GRID_ITEMS, type FeatureGridItem } from "@/lib/data/home-marketing";
import { cn } from "@/lib/utils";

const GRID_ICONS = [PenLine, CalendarDays, CreditCard, Megaphone] as const;

const accentStyles: Record<
  FeatureGridItem["accent"],
  { card: string; icon: string; mockup: string }
> = {
  green: {
    card: "from-emerald-50/80 to-white",
    icon: "bg-emerald-100 text-emerald-600",
    mockup: "bg-emerald-100",
  },
  blue: {
    card: "from-sky-50/80 to-white",
    icon: "bg-sky-100 text-sky-600",
    mockup: "bg-sky-100",
  },
  cream: {
    card: "from-amber-50/80 to-white",
    icon: "bg-amber-100 text-amber-600",
    mockup: "bg-amber-100",
  },
  slate: {
    card: "from-slate-50/80 to-white",
    icon: "bg-slate-100 text-slate-600",
    mockup: "bg-slate-100",
  },
};

function FeatureMockup({ accent }: { accent: FeatureGridItem["accent"] }) {
  const style = accentStyles[accent];
  return (
    <div className="mt-5 overflow-hidden rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
      <div className={cn("mb-2 h-2 w-16 rounded-full", style.mockup)} />
      <div className="space-y-2">
        <div className="h-8 rounded-lg bg-slate-50" />
        <div className="h-8 rounded-lg bg-slate-50" />
        <div className={cn("h-8 rounded-lg", style.mockup)} />
      </div>
    </div>
  );
}

export function FeatureGridSection() {
  return (
    <section className={`bg-white px-4 py-20 sm:px-6 lg:px-8 ${sectionScrollClass}`}>
      <div className="mx-auto max-w-6xl">
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
                <FeatureMockup accent={item.accent} />
              </motion.div>
            );
          })}
        </motion.div>
      </div>
    </section>
  );
}
