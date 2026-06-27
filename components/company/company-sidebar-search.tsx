"use client";

import { Search } from "lucide-react";
import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";
import { WORKSPACE_SEARCH_FOCUS_EVENT } from "@/lib/constants/workspace-events";

export function CompanySidebarSearch({
  value,
  onChange,
  collapsed = false,
  focusEventName = WORKSPACE_SEARCH_FOCUS_EVENT,
}: {
  value: string;
  onChange: (value: string) => void;
  collapsed?: boolean;
  focusEventName?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.key || event.key.toLowerCase() !== "f") return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      event.preventDefault();
      inputRef.current?.focus();
    };

    const onSearchFocus = () => {
      inputRef.current?.focus();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(focusEventName, onSearchFocus);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(focusEventName, onSearchFocus);
    };
  }, [focusEventName]);

  if (collapsed) {
    return (
      <div className="flex justify-center px-2 py-2">
        <button
          type="button"
          onClick={() => inputRef.current?.focus()}
          className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700"
          title="Find (F)"
          aria-label="Find in navigation"
        >
          <Search className="h-4 w-4" />
        </button>
        <input
          ref={inputRef}
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="sr-only"
          tabIndex={-1}
          aria-hidden
          suppressHydrationWarning
        />
      </div>
    );
  }

  return (
    <div className="px-3 pb-2">
      <label className="relative block">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
        <input
          ref={inputRef}
          type="search"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="Find..."
          suppressHydrationWarning
          className={cn(
            "w-full rounded-md border border-slate-200 bg-white py-1.5 pl-8 pr-10 text-sm text-slate-800",
            "placeholder:text-slate-400 focus:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-200"
          )}
        />
        <kbd className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-500 sm:inline">
          F
        </kbd>
      </label>
    </div>
  );
}
