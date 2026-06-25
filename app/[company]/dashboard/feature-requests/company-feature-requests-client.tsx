"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { Lightbulb, Plus, ThumbsUp } from "lucide-react";

import {
  companySubmitFeatureRequest,
  companyToggleFeatureVote,
} from "@/app/actions/company-platform-ops";
import type { CompanyFeatureRequestRow } from "@/lib/services/company-platform-ops";
import type { CompanyWithIndustry } from "@/types/database";
import { cn } from "@/lib/utils";

export function CompanyFeatureRequestsClient({
  slug,
  company,
  requests: initialRequests,
}: {
  slug: string;
  company: CompanyWithIndustry;
  requests: CompanyFeatureRequestRow[];
}) {
  const router = useRouter();
  const [requests, setRequests] = useState(initialRequests);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setRequests(initialRequests);
  }, [initialRequests]);

  const handleSubmit = () => {
    setError(null);
    startTransition(async () => {
      const result = await companySubmitFeatureRequest({
        companyId: company.id,
        companySlug: slug,
        title,
        description,
        category: category || null,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setTitle("");
      setDescription("");
      setCategory("");
      setShowForm(false);
      router.refresh();
    });
  };

  const handleVote = (request: CompanyFeatureRequestRow) => {
    setError(null);
    const nextVoted = !request.hasVoted;
    startTransition(async () => {
      const result = await companyToggleFeatureVote({
        companyId: company.id,
        companySlug: slug,
        requestId: request.id,
        voted: nextVoted,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setRequests((rows) =>
        rows
          .map((row) =>
            row.id === request.id
              ? {
                  ...row,
                  hasVoted: nextVoted,
                  voteCount: Math.max(0, row.voteCount + (nextVoted ? 1 : -1)),
                }
              : row
          )
          .sort((a, b) => b.voteCount - a.voteCount)
      );
    });
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Feature requests</h1>
          <p className="mt-1 text-sm text-slate-500">
            Suggest improvements and vote on the FaraiOS roadmap.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((value) => !value)}
          className="inline-flex items-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-700"
        >
          <Plus className="h-4 w-4" />
          Suggest feature
        </button>
      </div>

      {error ? (
        <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {showForm ? (
        <section className="rounded-2xl border border-violet-100 bg-violet-50/40 p-5">
          <h2 className="text-sm font-bold text-slate-900">Submit a feature request</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Feature title"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-violet-400"
            />
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Category (optional)"
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-violet-400"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What problem would this solve?"
              rows={4}
              className="md:col-span-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-violet-400"
            />
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending}
              className="rounded-xl bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {isPending ? "Submitting…" : "Submit request"}
            </button>
          </div>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-bold text-slate-900">Platform roadmap</h2>
          <p className="mt-0.5 text-xs text-slate-500">Sorted by community votes</p>
        </div>
        {requests.length === 0 ? (
          <div className="py-16 text-center">
            <Lightbulb className="mx-auto mb-3 h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-500">No feature requests yet. Be the first to suggest one.</p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {requests.map((request) => (
              <li key={request.id} className="px-5 py-4">
                <div className="flex items-start gap-4">
                  <button
                    type="button"
                    onClick={() => handleVote(request)}
                    disabled={isPending}
                    className={cn(
                      "flex min-w-[3.5rem] flex-col items-center rounded-xl border px-2 py-2 transition",
                      request.hasVoted
                        ? "border-violet-200 bg-violet-50 text-violet-700"
                        : "border-slate-200 bg-slate-50 text-slate-600 hover:border-violet-200 hover:bg-violet-50"
                    )}
                  >
                    <ThumbsUp className="h-4 w-4" />
                    <span className="mt-1 text-xs font-bold">{request.voteCount}</span>
                  </button>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-semibold text-slate-900">{request.title}</p>
                      {request.isOwn ? (
                        <span className="rounded-md bg-violet-100 px-2 py-0.5 text-[10px] font-bold text-violet-700">
                          Yours
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-sm text-slate-600">{request.description}</p>
                    <p className="mt-2 text-xs text-slate-400">
                      {request.status} · submitted {request.createdAt}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
