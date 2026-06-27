import { cn } from "@/lib/utils";

export const risePageClassName =
  "bg-[#f0f2f5] px-4 py-4 sm:px-5 sm:py-5 dark:bg-slate-950";
export const riseCardClassName =
  "rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";
export const riseStretchCardClassName = cn(riseCardClassName, "flex h-full min-h-0 flex-col");
export const riseOutlineButtonClassName =
  "inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800";
export const risePrimaryButtonClassName =
  "inline-flex h-9 items-center gap-2 rounded-md bg-[#5a8dee] px-3 text-sm font-medium text-white transition hover:bg-[#4a6fd8]";

export type RiseFooterTone = "positive" | "warning" | "neutral";

export const riseFooterToneClass: Record<RiseFooterTone, string> = {
  positive: "text-emerald-600",
  warning: "text-orange-600",
  neutral: "text-slate-500",
};

export const riseTableClassName =
  "overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900";
export const riseTableHeadRowClassName =
  "border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-400";
export const riseTableHeadCellClassName = "px-4 py-3";
export const riseStatCardClassName = cn(riseCardClassName, "p-4 sm:p-5");
export const riseInputClassName =
  "rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:border-slate-300 focus:ring-2 focus:ring-slate-200 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500 dark:focus:border-slate-600 dark:focus:ring-slate-700";
export const riseSelectClassName = riseInputClassName;
