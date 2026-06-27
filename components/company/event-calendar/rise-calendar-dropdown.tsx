"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown, Search } from "lucide-react";

import { cn } from "@/lib/utils";

export type RiseCalendarDropdownOption<T extends string = string> = {
  value: T;
  label: string;
};

type Props<T extends string> = {
  value: T;
  onChange: (value: T) => void;
  options: RiseCalendarDropdownOption<T>[];
  placeholder: string;
  searchable?: boolean;
  className?: string;
  ariaLabel?: string;
};

export function RiseCalendarDropdown<T extends string>({
  value,
  onChange,
  options,
  placeholder,
  searchable = false,
  className,
  ariaLabel,
}: Props<T>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  const selected = options.find((option) => option.value === value);
  const triggerLabel =
    selected && selected.value !== ("all" as T) && selected.label !== placeholder
      ? selected.label
      : placeholder;

  const filteredOptions = useMemo(() => {
    if (!searchable || !query.trim()) return options;
    const needle = query.trim().toLowerCase();
    return options.filter((option) => option.label.toLowerCase().includes(needle));
  }, [options, query, searchable]);

  const closeDropdown = () => {
    setOpen(false);
    setQuery("");
  };

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) {
        closeDropdown();
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDropdown();
    };

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        onClick={() => setOpen((current) => {
          if (current) setQuery("");
          return !current;
        })}
        className={cn(
          "inline-flex h-9 min-w-[9.5rem] items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-600 transition hover:border-slate-300",
          open && "border-slate-300 ring-2 ring-[#608af5]/15"
        )}
      >
        <span className="truncate">{triggerLabel}</span>
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-slate-400 transition", open && "rotate-180")}
          strokeWidth={1.75}
        />
      </button>

      {open ? (
        <div
          id={listboxId}
          role="listbox"
          aria-label={ariaLabel}
          className="absolute left-0 top-[calc(100%+4px)] z-50 min-w-full overflow-hidden rounded-md border border-slate-200 bg-white shadow-[0_4px_12px_rgba(15,23,42,0.12)]"
        >
          {searchable ? (
            <div className="border-b border-slate-100 p-2">
              <div className="relative">
                <input
                  type="search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder=""
                  className="h-9 w-full rounded-md border border-slate-200 bg-white pr-9 pl-3 text-sm text-slate-700 outline-none focus:border-[#608af5] focus:ring-2 focus:ring-[#608af5]/15"
                  autoFocus
                />
                <Search
                  className="pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 text-slate-400"
                  strokeWidth={1.75}
                />
              </div>
            </div>
          ) : null}

          <div className="max-h-64 overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <p className="px-3 py-2 text-sm text-slate-500">No matches</p>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = option.value === value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onChange(option.value);
                      closeDropdown();
                    }}
                    className={cn(
                      "flex w-full items-center px-3 py-2 text-left text-sm transition",
                      isSelected
                        ? "bg-[#608af5] text-white"
                        : "text-slate-600 hover:bg-[#608af5] hover:text-white"
                    )}
                  >
                    {option.label}
                  </button>
                );
              })
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
