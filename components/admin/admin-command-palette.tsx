"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Building2,
  Globe2,
  LayoutGrid,
  LifeBuoy,
  Search,
  UserRound,
} from "lucide-react";

import { searchAdminGlobalAction } from "@/app/actions/admin-global-search";
import {
  ADMIN_GLOBAL_SEARCH_CATEGORY_LABELS,
  getAdminNavigationSearchResults,
} from "@/lib/constants/admin-global-search";
import {
  ADMIN_COMMAND_PALETTE_EVENT,
  ADMIN_SEARCH_FOCUS_EVENT,
} from "@/lib/constants/workspace-events";
import type {
  AdminGlobalSearchCategory,
  AdminGlobalSearchResult,
} from "@/types/admin-global-search";
import { cn } from "@/lib/utils";

const CATEGORY_ICONS: Record<AdminGlobalSearchCategory, typeof LayoutGrid> = {
  navigation: LayoutGrid,
  business: Building2,
  user: UserRound,
  ticket: LifeBuoy,
  domain: Globe2,
};

function groupResults(results: AdminGlobalSearchResult[]) {
  const groups = new Map<AdminGlobalSearchCategory, AdminGlobalSearchResult[]>();
  for (const result of results) {
    const list = groups.get(result.category) ?? [];
    list.push(result);
    groups.set(result.category, list);
  }
  return groups;
}

export function AdminCommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [asyncResults, setAsyncResults] = useState<AdminGlobalSearchResult[] | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const flatResults = useMemo(() => {
    if (open && query.trim().length >= 2 && asyncResults !== null) {
      return asyncResults;
    }
    return getAdminNavigationSearchResults(query);
  }, [open, query, asyncResults]);

  const openPalette = useCallback(() => {
    setQuery("");
    setAsyncResults(null);
    setActiveIndex(0);
    setOpen(true);
  }, []);

  const closePalette = useCallback(() => {
    setOpen(false);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key;
      if (!key) return;

      const target = event.target as HTMLElement | null;
      const isEditable =
        target?.tagName === "INPUT" ||
        target?.tagName === "TEXTAREA" ||
        target?.isContentEditable;

      if ((event.metaKey || event.ctrlKey) && key.toLowerCase() === "k") {
        event.preventDefault();
        if (open) {
          closePalette();
        } else {
          openPalette();
        }
        return;
      }

      if (open) return;

      if (key.toLowerCase() === "f" && !isEditable && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        window.dispatchEvent(new Event(ADMIN_SEARCH_FOCUS_EVENT));
      }
    };

    const onOpenEvent = () => openPalette();

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener(ADMIN_COMMAND_PALETTE_EVENT, onOpenEvent);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener(ADMIN_COMMAND_PALETTE_EVENT, onOpenEvent);
    };
  }, [open, openPalette, closePalette]);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open || query.trim().length < 2) return;

    const handle = window.setTimeout(() => {
      startTransition(async () => {
        const response = await searchAdminGlobalAction(query);
        setAsyncResults(response.results);
        setActiveIndex(0);
      });
    }, 180);

    return () => window.clearTimeout(handle);
  }, [open, query]);

  useEffect(() => {
    if (!open) return;
    const activeEl = listRef.current?.querySelector<HTMLElement>(
      `[data-result-index="${activeIndex}"]`
    );
    activeEl?.scrollIntoView({ block: "nearest" });
  }, [activeIndex, open]);

  const grouped = useMemo(() => groupResults(flatResults), [flatResults]);

  const handleSelect = (result: AdminGlobalSearchResult) => {
    closePalette();
    window.location.href = result.href;
  };

  if (!open) return null;

  let runningIndex = -1;

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center bg-slate-950/50 p-4 pt-[12vh]">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close command palette"
        onClick={closePalette}
      />
      <div
        className="relative z-10 w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-command-palette-title"
      >
        <div className="flex items-center gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <Search className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
          <input
            ref={inputRef}
            id="admin-command-palette-title"
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setAsyncResults(null);
              setActiveIndex(0);
            }}
            placeholder="Search navigation, businesses, users, tickets, domains…"
            className="min-w-0 flex-1 bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 dark:text-slate-100"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            aria-controls="admin-command-palette-results"
            aria-activedescendant={
              flatResults[activeIndex]
                ? `admin-command-result-${flatResults[activeIndex].id}`
                : undefined
            }
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                closePalette();
                return;
              }
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setActiveIndex((index) =>
                  flatResults.length ? (index + 1) % flatResults.length : 0
                );
                return;
              }
              if (event.key === "ArrowUp") {
                event.preventDefault();
                setActiveIndex((index) =>
                  flatResults.length
                    ? (index - 1 + flatResults.length) % flatResults.length
                    : 0
                );
                return;
              }
              if (event.key === "Enter" && flatResults[activeIndex]) {
                event.preventDefault();
                handleSelect(flatResults[activeIndex]);
              }
            }}
          />
          {isPending ? (
            <span className="text-[11px] text-slate-400" aria-live="polite">
              Searching…
            </span>
          ) : null}
        </div>

        <div
          id="admin-command-palette-results"
          ref={listRef}
          className="max-h-[min(420px,50vh)] overflow-y-auto p-2"
          role="listbox"
          aria-label="Search results"
        >
          {flatResults.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-slate-500">
              No results for &ldquo;{query.trim()}&rdquo;
            </p>
          ) : (
            Array.from(grouped.entries()).map(([category, items]) => (
              <div key={category} className="mb-2 last:mb-0">
                <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                  {ADMIN_GLOBAL_SEARCH_CATEGORY_LABELS[category]}
                </p>
                <ul className="space-y-0.5">
                  {items.map((result) => {
                    runningIndex += 1;
                    const index = runningIndex;
                    const Icon = CATEGORY_ICONS[result.category];
                    const isActive = index === activeIndex;
                    return (
                      <li key={result.id}>
                        <Link
                          id={`admin-command-result-${result.id}`}
                          href={result.href}
                          data-result-index={index}
                          role="option"
                          aria-selected={isActive}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                            isActive
                              ? "bg-[#5a8dee]/10 text-slate-900 dark:bg-[#5a8dee]/20 dark:text-slate-100"
                              : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                          )}
                          onMouseEnter={() => setActiveIndex(index)}
                          onClick={(event) => {
                            event.preventDefault();
                            handleSelect(result);
                          }}
                        >
                          <Icon className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium">{result.label}</span>
                            {result.description ? (
                              <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                                {result.description}
                              </span>
                            ) : null}
                          </span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-slate-200 px-4 py-2.5 text-[11px] text-slate-500 dark:border-slate-700 dark:text-slate-400">
          <span>
            <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-medium dark:border-slate-600 dark:bg-slate-800">
              ↑↓
            </kbd>{" "}
            Navigate
          </span>
          <span>
            <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-medium dark:border-slate-600 dark:bg-slate-800">
              Enter
            </kbd>{" "}
            Open
          </span>
          <span>
            <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-medium dark:border-slate-600 dark:bg-slate-800">
              Esc
            </kbd>{" "}
            Close
          </span>
          <span>
            <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-medium dark:border-slate-600 dark:bg-slate-800">
              F
            </kbd>{" "}
            Filter sidebar
          </span>
        </div>
      </div>
    </div>
  );
}
