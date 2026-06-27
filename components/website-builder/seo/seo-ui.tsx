"use client";

import { motion } from "framer-motion";
import { HelpCircle } from "lucide-react";

import { descriptionLengthStatus, titleLengthStatus } from "@/lib/website-builder/seo";
import { cn } from "@/lib/utils";

export const riseCardClassName =
  "rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";

export const inputClassName =
  "mt-1 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100";

export function SeoField({
  label,
  hint,
  children,
  className,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block text-sm", className)}>
      <span className="inline-flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-100">
        {label}
        {hint ? (
          <span className="group relative">
            <HelpCircle className="h-3.5 w-3.5 text-slate-400" aria-hidden />
            <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 hidden w-48 -translate-x-1/2 rounded-md bg-slate-900 px-2 py-1 text-xs text-white group-hover:block">
              {hint}
            </span>
          </span>
        ) : null}
      </span>
      {children}
    </label>
  );
}

export function CharCounter({
  value,
  max,
  type = "title",
}: {
  value: string;
  max: number;
  type?: "title" | "description";
}) {
  const length = value.length;
  const status =
    type === "title" ? titleLengthStatus(length) : descriptionLengthStatus(length);
  const color =
    status === "good" ? "text-emerald-600" : status === "warn" ? "text-amber-600" : "text-red-600";

  return (
    <p className={cn("mt-1 text-xs", color)} aria-live="polite">
      {length} / {max}
      {status === "good" ? " · Good length" : status === "warn" ? " · Could be improved" : " · Out of range"}
    </p>
  );
}

export function ScoreRing({
  score,
  label,
  size = 88,
}: {
  score: number;
  label: string;
  size?: number;
}) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={6}
          className="text-slate-100 dark:text-slate-800"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xl font-bold text-slate-900 dark:text-white">{score}</span>
        </div>
      </div>
      <p className="text-center text-xs font-medium text-slate-600 dark:text-slate-300">{label}</p>
    </div>
  );
}

export function MetricCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className={cn(riseCardClassName, "p-4")}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900 dark:text-white">{value}</p>
      {sub ? <p className="mt-1 text-xs text-slate-500">{sub}</p> : null}
    </div>
  );
}

export function GoogleSearchPreview({
  title,
  description,
  url,
}: {
  title: string;
  description: string;
  url: string;
}) {
  const displayTitle = title.trim() || "Page title preview";
  const displayDescription =
    description.trim() || "Meta description preview — add a compelling summary for search results.";
  const displayUrl = url.replace(/^https?:\/\//, "");

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-950">
      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Google preview</p>
      <p className="truncate text-sm text-[#202124] dark:text-slate-300">{displayUrl}</p>
      <p className="mt-0.5 line-clamp-1 text-xl text-[#1a0dab] dark:text-blue-400">{displayTitle}</p>
      <p className="mt-1 line-clamp-2 text-sm leading-snug text-[#4d5156] dark:text-slate-400">
        {displayDescription}
      </p>
    </div>
  );
}

export function SocialPlatformPreview({
  platform,
  title,
  description,
  imageUrl,
  url,
}: {
  platform: "facebook" | "twitter" | "linkedin" | "whatsapp";
  title: string;
  description: string;
  imageUrl?: string | null;
  url: string;
}) {
  const labels = {
    facebook: "Facebook",
    twitter: "Twitter / X",
    linkedin: "LinkedIn",
    whatsapp: "WhatsApp",
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-950">
      <p className="border-b border-slate-100 px-3 py-2 text-xs font-medium text-slate-500 dark:border-slate-800">
        {labels[platform]} preview
      </p>
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt="" className="aspect-[1.91/1] w-full object-cover" />
      ) : (
        <div className="flex aspect-[1.91/1] items-center justify-center bg-slate-100 text-xs text-slate-400 dark:bg-slate-900">
          1200 × 630 recommended
        </div>
      )}
      <div className="space-y-1 p-3">
        <p className="line-clamp-1 text-xs uppercase text-slate-400">{url.replace(/^https?:\/\//, "")}</p>
        <p className="line-clamp-1 font-semibold text-slate-900 dark:text-white">{title || "Title preview"}</p>
        <p className="line-clamp-2 text-sm text-slate-600 dark:text-slate-400">
          {description || "Description preview"}
        </p>
      </div>
    </div>
  );
}

export function PanelShell({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      <div>
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      {children}
    </motion.div>
  );
}

export function ChecklistItem({ done, label }: { done: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      <span
        className={cn(
          "inline-flex h-5 w-5 items-center justify-center rounded-full text-xs",
          done ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-400"
        )}
        aria-hidden
      >
        {done ? "✓" : "·"}
      </span>
      <span className={done ? "text-slate-700 dark:text-slate-200" : "text-slate-500"}>{label}</span>
    </li>
  );
}
