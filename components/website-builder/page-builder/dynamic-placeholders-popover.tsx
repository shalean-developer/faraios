"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  placeholders: Record<string, string>;
  className?: string;
};

export function DynamicPlaceholdersPopover({ placeholders, className }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative shrink-0", className)}>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition",
          open
            ? "border-[#4a6fd8] bg-[#eef2ff] text-[#4a6fd8]"
            : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
        )}
        aria-expanded={open}
        aria-haspopup="dialog"
      >
        Dynamic placeholders
        <ChevronDown className={cn("h-3.5 w-3.5 transition", open && "rotate-180")} />
      </button>

      {open ? (
        <div
          role="dialog"
          aria-label="Dynamic placeholders"
          className="absolute right-0 top-full z-50 mt-1.5 w-72 max-w-[calc(100vw-2rem)] rounded-lg border border-slate-200 bg-white py-2 shadow-lg"
        >
          <p className="border-b border-slate-100 px-3 pb-2 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
            Use in text fields
          </p>
          <ul className="max-h-64 overflow-y-auto px-3 pt-2 text-xs text-slate-600">
            {Object.entries(placeholders).map(([key, value]) => (
              <li key={key} className="flex flex-wrap gap-x-1.5 py-1">
                <code className="shrink-0 text-[#4a6fd8]">{`{{${key}}}`}</code>
                <span className="text-slate-400">→</span>
                <span className="min-w-0 break-words">{value || "—"}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
