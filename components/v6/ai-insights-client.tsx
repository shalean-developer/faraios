"use client";

import { type FormEvent, useState } from "react";

import { aiSearchAction } from "@/app/actions/v6-engine";
import { Button } from "@/components/ui/button";
import type { AiInsight } from "@/types/v6-engine";
import { cn } from "@/lib/utils";

export function AiInsightsClient({
  companyId,
  insights,
}: {
  companyId: string;
  insights: AiInsight[];
}) {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AiInsight[]>([]);
  const [searching, setSearching] = useState(false);

  const onSearch = async (e: FormEvent) => {
    e.preventDefault();
    setSearching(true);
    const result = await aiSearchAction({ companyId, query });
    setSearching(false);
    if (result.ok) setSearchResults(result.results);
  };

  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-4 text-lg font-bold text-slate-900">Suggested actions</h2>
        <ul className="space-y-3">
          {insights.length === 0 ? (
            <li className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
              Add more business data to generate insights.
            </li>
          ) : (
            insights.map((item, i) => (
              <li
                key={i}
                className={cn(
                  "rounded-xl border bg-white p-4 shadow-sm",
                  item.priority === "high"
                    ? "border-red-200"
                    : item.priority === "medium"
                      ? "border-amber-200"
                      : "border-slate-200"
                )}
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
                  {item.type}
                </p>
                <p className="mt-1 font-semibold text-slate-900">{item.title}</p>
                <p className="mt-1 text-sm text-slate-600">{item.body}</p>
              </li>
            ))
          )}
        </ul>
      </section>

      <section>
        <h2 className="mb-4 text-lg font-bold text-slate-900">Smart Search</h2>
        <p className="mb-4 text-sm text-slate-600">
          Search your workspace with natural phrases — results come from your live business data.
        </p>
        <form onSubmit={onSearch} className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Try "Show overdue invoices" or "Find customers with open bookings"'
            className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm"
          />
          <Button type="submit" disabled={searching}>
            {searching ? "Searching…" : "Search"}
          </Button>
        </form>
        {searchResults.length > 0 ? (
          <ul className="mt-4 space-y-2">
            {searchResults.map((r, i) => (
              <li
                key={i}
                className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm"
              >
                <p className="font-medium text-slate-900">{r.title}</p>
                <p className="text-slate-600">{r.body}</p>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}
