"use client";

import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";

import {
  DEFAULT_CALENDAR_LABELS,
  LABEL_COLOR_SWATCHES,
  readCalendarLabels,
  writeCalendarLabels,
  type CalendarLabel,
} from "@/lib/calendar/event-labels";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  slug: string;
  onLabelsChange: (labels: CalendarLabel[]) => void;
  title?: string;
  defaultLabels?: CalendarLabel[];
  readLabels?: (slug: string) => CalendarLabel[];
  writeLabels?: (slug: string, labels: CalendarLabel[]) => void;
};

export function ManageLabelsModal({
  open,
  onClose,
  slug,
  onLabelsChange,
  title = "Manage labels",
  defaultLabels = DEFAULT_CALENDAR_LABELS,
  readLabels = readCalendarLabels,
  writeLabels = writeCalendarLabels,
}: Props) {
  const [labels, setLabels] = useState<CalendarLabel[]>(defaultLabels);
  const [draftName, setDraftName] = useState("");
  const [selectedColor, setSelectedColor] = useState<string>(LABEL_COLOR_SWATCHES[2]!);

  useEffect(() => {
    if (!open) return;

    queueMicrotask(() => {
      setLabels(readLabels(slug));
      setDraftName("");
      setSelectedColor(LABEL_COLOR_SWATCHES[2]!);
    });
  }, [open, slug, readLabels]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;

  const persistLabels = (next: CalendarLabel[]) => {
    setLabels(next);
    writeLabels(slug, next);
    onLabelsChange(next);
  };

  const saveLabel = () => {
    const name = draftName.trim();
    if (!name) return;

    const duplicate = labels.some(
      (label) => label.name.toLowerCase() === name.toLowerCase()
    );
    if (duplicate) return;

    persistLabels([
      ...labels,
      {
        id: crypto.randomUUID(),
        name,
        color: selectedColor,
      },
    ]);
    setDraftName("");
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center overflow-y-auto p-4 sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/35"
        aria-label="Close manage labels"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="manage-labels-title"
        className="relative z-10 w-full max-w-[520px] overflow-hidden rounded-md border border-slate-200 bg-white shadow-[0_12px_40px_rgba(15,23,42,0.18)]"
      >
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <h2 id="manage-labels-title" className="text-base font-normal text-slate-700">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>

        <div className="space-y-4 px-4 py-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {LABEL_COLOR_SWATCHES.map((color) => {
              const selected = selectedColor === color;
              return (
                <button
                  key={color}
                  type="button"
                  aria-label={`Select color ${color}`}
                  onClick={() => setSelectedColor(color)}
                  className={cn(
                    "h-5 w-5 rounded-sm border transition",
                    selected
                      ? "border-slate-400 ring-2 ring-[#608af5]/30"
                      : "border-transparent hover:border-slate-300"
                  )}
                  style={{ backgroundColor: color }}
                />
              );
            })}
            <span
              className="ml-1 inline-flex h-5 min-w-[2.75rem] rounded-full px-2"
              style={{ backgroundColor: selectedColor }}
              aria-hidden
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  saveLabel();
                }
              }}
              placeholder="Label"
              className="h-10 min-w-0 flex-1 rounded-md border border-slate-200 bg-[#f8fafc] px-3 text-sm text-slate-700 outline-none focus:border-[#608af5] focus:bg-white focus:ring-2 focus:ring-[#608af5]/15"
            />
            <button
              type="button"
              onClick={saveLabel}
              disabled={!draftName.trim()}
              className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check className="h-4 w-4" strokeWidth={1.75} />
              Save
            </button>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <div className="flex flex-wrap gap-2">
              {labels.map((label) => (
                <span
                  key={label.id}
                  className="inline-flex items-center rounded px-2.5 py-1 text-sm font-medium text-white"
                  style={{ backgroundColor: label.color }}
                >
                  {label.name}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t border-slate-100 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <X className="h-4 w-4" strokeWidth={1.75} />
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
