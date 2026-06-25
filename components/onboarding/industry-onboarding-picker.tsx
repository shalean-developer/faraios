"use client";

import {
  Briefcase,
  Hammer,
  Megaphone,
  Scissors,
  Sparkles,
  User,
  Wrench,
  Zap,
} from "lucide-react";
import type { ComponentType } from "react";

import { loadIndustryModule } from "@/lib/industry-modules/loader";
import { V8_INDUSTRY_TEMPLATE_KEYS } from "@/lib/industry-modules/registry";
import { cn } from "@/lib/utils";
import type { Industry } from "@/types/database";

const ICONS: Record<string, ComponentType<{ className?: string }>> = {
  sparkles: Sparkles,
  flower: Scissors,
  wrench: Wrench,
  zap: Zap,
  user: User,
  briefcase: Briefcase,
  megaphone: Megaphone,
  hammer: Hammer,
};

type Props = {
  industries: Industry[];
  value: string;
  onChange: (industryId: string) => void;
};

export function IndustryOnboardingPicker({ industries, value, onChange }: Props) {
  const v8Industries = industries.filter((ind) =>
    V8_INDUSTRY_TEMPLATE_KEYS.includes(
      ind.slug as (typeof V8_INDUSTRY_TEMPLATE_KEYS)[number]
    )
  );
  const otherIndustries = industries.filter(
    (ind) =>
      !V8_INDUSTRY_TEMPLATE_KEYS.includes(
        ind.slug as (typeof V8_INDUSTRY_TEMPLATE_KEYS)[number]
      )
  );

  return (
    <div className="space-y-4">
      <div>
        <p className="text-base font-medium text-foreground">
          What type of business do you run?
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          We&apos;ll configure services, booking fields, and dashboard labels for your
          industry.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {v8Industries.map((industry) => {
          const module = loadIndustryModule(industry.slug);
          const Icon = ICONS[module.icon] ?? Briefcase;
          const selected = value === industry.id;
          return (
            <button
              key={industry.id}
              type="button"
              onClick={() => onChange(industry.id)}
              className={cn(
                "rounded-2xl border p-4 text-left transition",
                selected
                  ? "border-violet-500 bg-violet-50/50 ring-2 ring-violet-200"
                  : "border-border/80 bg-card hover:border-violet-200"
              )}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100">
                  <Icon className="h-5 w-5 text-violet-600" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{industry.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                    {industry.description ?? module.description}
                  </p>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {otherIndustries.length > 0 ? (
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Other industries</label>
          <select
            value={otherIndustries.some((i) => i.id === value) ? value : ""}
            onChange={(e) => e.target.value && onChange(e.target.value)}
            className="h-11 w-full rounded-xl border border-border/80 px-4 text-base"
          >
            <option value="">Select another industry…</option>
            {otherIndustries.map((industry) => (
              <option key={industry.id} value={industry.id}>
                {industry.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );
}
