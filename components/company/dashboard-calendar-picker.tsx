"use client";

import { CalendarDays } from "lucide-react";
import { useMemo, useState } from "react";

import { cn } from "@/lib/utils";

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"] as const;

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function buildMonthGrid(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [];

  for (let i = 0; i < startOffset; i += 1) {
    cells.push(null);
  }
  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push(new Date(year, month, day));
  }
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }
  return cells;
}

type Props = {
  value: Date;
  onChange: (date: Date) => void;
  className?: string;
};

export function DashboardCalendarPicker({ value, onChange, className }: Props) {
  const [open, setOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(() => ({
    year: value.getFullYear(),
    month: value.getMonth(),
  }));

  const cells = useMemo(
    () => buildMonthGrid(viewMonth.year, viewMonth.month),
    [viewMonth.month, viewMonth.year]
  );

  const monthLabel = new Date(viewMonth.year, viewMonth.month, 1).toLocaleDateString(
    "en-ZA",
    { month: "long", year: "numeric" }
  );

  const displayValue = value.toLocaleDateString("en-ZA", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const goMonth = (delta: number) => {
    setViewMonth((current) => {
      const next = new Date(current.year, current.month + delta, 1);
      return { year: next.getFullYear(), month: next.getMonth() };
    });
  };

  const selectDate = (date: Date) => {
    onChange(date);
    setOpen(false);
    setViewMonth({ year: date.getFullYear(), month: date.getMonth() });
  };

  const todayKey = toDateKey(new Date());
  const selectedKey = toDateKey(value);

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((open) => !open)}
        className="flex h-9 min-w-[10.5rem] items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-left text-sm text-slate-700 transition-colors hover:border-slate-300 hover:bg-slate-50"
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-slate-500" />
        <span className="truncate">{displayValue}</span>
      </button>

      {open ? (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 cursor-default"
            aria-label="Close calendar"
            onClick={() => setOpen(false)}
          />
          <div
            role="dialog"
            aria-label="Choose a date"
            className="absolute right-0 z-50 mt-2 w-[18rem] rounded-xl border border-slate-200 bg-white p-3 shadow-lg"
          >
            <div className="mb-3 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => goMonth(-1)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                aria-label="Previous month"
              >
                ‹
              </button>
              <p className="text-sm font-semibold text-slate-900">{monthLabel}</p>
              <button
                type="button"
                onClick={() => goMonth(1)}
                className="flex h-7 w-7 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                aria-label="Next month"
              >
                ›
              </button>
            </div>

            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-medium text-slate-400">
              {WEEKDAY_LABELS.map((label) => (
                <span key={label} className="py-1">
                  {label}
                </span>
              ))}
            </div>

            <div className="mt-1 grid grid-cols-7 gap-1">
              {cells.map((date, index) => {
                if (!date) {
                  return <span key={`empty-${index}`} className="h-8" />;
                }
                const key = toDateKey(date);
                const isSelected = key === selectedKey;
                const isToday = key === todayKey;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => selectDate(date)}
                    className={cn(
                      "flex h-8 w-8 items-center justify-center rounded-md text-sm transition-colors",
                      isSelected
                        ? "bg-slate-900 font-semibold text-white"
                        : isToday
                          ? "bg-slate-100 font-medium text-slate-900"
                          : "text-slate-700 hover:bg-slate-100"
                    )}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            <div className="mt-3 border-t border-slate-100 pt-3">
              <button
                type="button"
                onClick={() => selectDate(new Date())}
                className="text-xs font-medium text-slate-600 hover:text-slate-900"
              >
                Today
              </button>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
