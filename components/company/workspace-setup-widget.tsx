"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Globe,
  Link2,
  Megaphone,
  Rocket,
  Star,
  TrendingUp,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type {
  WorkspaceGrowthItem,
  WorkspaceSetupChecklist,
} from "@/lib/services/workspace-setup";
import { cn } from "@/lib/utils";

const growthIconMap: Record<
  WorkspaceGrowthItem["icon"],
  { icon: LucideIcon; bg: string; color: string }
> = {
  globe: { icon: Globe, bg: "bg-violet-100", color: "text-violet-600" },
  link: { icon: Link2, bg: "bg-blue-100", color: "text-blue-600" },
  chart: { icon: TrendingUp, bg: "bg-blue-100", color: "text-blue-600" },
  star: { icon: Star, bg: "bg-amber-100", color: "text-amber-600" },
  users: { icon: Users, bg: "bg-violet-100", color: "text-violet-600" },
  megaphone: { icon: Megaphone, bg: "bg-blue-100", color: "text-blue-600" },
  zap: { icon: Zap, bg: "bg-violet-100", color: "text-violet-600" },
};

export function WorkspaceSetupWidget({
  checklist,
  className,
}: {
  checklist: WorkspaceSetupChecklist;
  className?: string;
}) {
  const cardsRef = useRef<HTMLDivElement>(null);
  const [growthExpanded, setGrowthExpanded] = useState(true);

  if (checklist.percentComplete >= 100) {
    return null;
  }

  const scrollToSteps = () => {
    cardsRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  return (
    <section
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6",
        className
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100">
            <Rocket className="h-5 w-5 text-violet-600" />
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-semibold tracking-tight text-slate-900">
              Complete your workspace setup
            </h2>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-slate-500">
              Finish these steps to start accepting bookings, managing customers, and
              growing your business.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={scrollToSteps}
          className="shrink-0 self-start border-slate-200 text-slate-700"
        >
          View all steps
        </Button>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm font-semibold text-violet-600">
            {checklist.completedCount} / {checklist.totalCount} Complete
          </p>
          <p className="text-sm text-slate-500">
            {checklist.percentComplete}% Complete
          </p>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-violet-100">
          <div
            className="h-full rounded-full bg-violet-600 transition-all duration-500"
            style={{ width: `${checklist.percentComplete}%` }}
          />
        </div>
      </div>

      <div
        ref={cardsRef}
        className="mt-6 flex gap-4 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {checklist.items.map((item) => (
          <SetupStepCard key={item.key} item={item} />
        ))}
      </div>

      <div className="mt-6 border-t border-slate-200 pt-5">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-sm font-semibold text-slate-900">
            Grow your business (optional)
          </h3>
          <button
            type="button"
            onClick={() => setGrowthExpanded((open) => !open)}
            className="inline-flex items-center gap-1 text-sm font-medium text-violet-600 transition-colors hover:text-violet-700"
          >
            {growthExpanded ? "Show less" : "Show more"}
            {growthExpanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </button>
        </div>

        {growthExpanded ? (
          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {checklist.growthItems.map((item) => (
              <GrowthStepCard key={item.key} item={item} />
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function SetupStepCard({
  item,
}: {
  item: WorkspaceSetupChecklist["items"][number];
}) {
  return (
    <article
      className={cn(
        "flex min-w-[11.5rem] flex-1 flex-col rounded-xl border border-slate-200 bg-white p-4",
        "sm:min-w-[12.5rem] lg:min-w-0"
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        {item.done ? (
          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
            <Check className="h-3 w-3" strokeWidth={3} />
          </span>
        ) : null}
        <span
          className={cn(
            "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold",
            item.done
              ? "bg-violet-100 text-violet-700"
              : "border border-dashed border-slate-300 text-slate-500"
          )}
        >
          {item.step}
        </span>
      </div>

      <h3 className="text-sm font-semibold leading-snug text-slate-900">
        {item.title}
      </h3>
      <p className="mt-2 flex-1 text-xs leading-relaxed text-slate-500">
        {item.description}
      </p>

      <Link
        href={item.href}
        className={cn(
          "mt-4 inline-flex h-9 items-center justify-center rounded-lg px-3 text-xs font-medium transition-colors",
          item.done
            ? "bg-violet-100 text-violet-700 hover:bg-violet-200"
            : "border border-violet-600 bg-white text-violet-600 hover:bg-violet-50"
        )}
      >
        {item.actionLabel}
      </Link>
    </article>
  );
}

function GrowthStepCard({ item }: { item: WorkspaceGrowthItem }) {
  const { icon: Icon, bg, color } = growthIconMap[item.icon];

  return (
    <Link
      href={item.href}
      title={item.description}
      className="group relative flex min-w-[8rem] flex-1 flex-col items-center rounded-lg border border-slate-200 bg-white px-2 py-2.5 text-center transition-colors hover:border-slate-300 hover:bg-slate-50 sm:min-w-[8.25rem] lg:min-w-0"
    >
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-44 -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-left text-xs leading-relaxed text-slate-600 shadow-md group-hover:block"
      >
        {item.description}
      </span>

      <span
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          bg
        )}
      >
        <Icon className={cn("h-3.5 w-3.5", color)} />
      </span>

      <span className="mt-1.5 w-full line-clamp-2 text-xs font-semibold leading-tight text-slate-900">
        {item.title}
      </span>
    </Link>
  );
}
