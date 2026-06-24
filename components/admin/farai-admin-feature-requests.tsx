"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Lightbulb, Plus, Search, ThumbsUp } from "lucide-react";

import {
  adminCreateFeatureRequest,
  adminUpdateFeatureRequest,
} from "@/app/actions/admin";
import { AdminActivityBellLink } from "@/components/admin/admin-activity-bell-link";
import { ADMIN_BUSINESSES_PATH } from "@/lib/constants/admin-nav";
import type {
  AdminFeatureRequestPriority,
  AdminFeatureRequestsData,
  AdminFeatureRequestRow,
  AdminFeatureRequestStatus,
} from "@/types/admin";

const STATUS_LABELS: Record<AdminFeatureRequestStatus, string> = {
  submitted: "Submitted",
  under_review: "Under Review",
  planned: "Planned",
  in_progress: "In Progress",
  shipped: "Shipped",
  declined: "Declined",
};

const STATUS_STYLES: Record<AdminFeatureRequestStatus, string> = {
  submitted: "bg-sky-50 text-sky-700",
  under_review: "bg-violet-50 text-violet-700",
  planned: "bg-indigo-50 text-indigo-700",
  in_progress: "bg-amber-50 text-amber-700",
  shipped: "bg-emerald-50 text-emerald-700",
  declined: "bg-gray-100 text-gray-600",
};

const STATUS_OPTIONS = Object.keys(STATUS_LABELS) as AdminFeatureRequestStatus[];
const PRIORITY_OPTIONS: AdminFeatureRequestPriority[] = ["low", "medium", "high"];

export function FaraiAdminFeatureRequests({ data }: { data: AdminFeatureRequestsData }) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | AdminFeatureRequestStatus>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return data.requests.filter((request) => {
      if (statusFilter !== "all" && request.status !== statusFilter) return false;
      if (!q) return true;
      return (
        request.title.toLowerCase().includes(q) ||
        request.description.toLowerCase().includes(q) ||
        (request.businessName?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [data.requests, search, statusFilter]);

  const handleCreate = () => {
    setError(null);
    startTransition(async () => {
      const result = await adminCreateFeatureRequest({
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
      setShowCreate(false);
      window.location.reload();
    });
  };

  const handleUpdate = (
    requestId: string,
    updates: {
      status?: AdminFeatureRequestStatus;
      priority?: AdminFeatureRequestPriority;
      adminNotes?: string | null;
    }
  ) => {
    setError(null);
    startTransition(async () => {
      const result = await adminUpdateFeatureRequest(requestId, updates);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      window.location.reload();
    });
  };

  return (
    <>
      <header className="flex h-16 shrink-0 items-center gap-4 border-b border-gray-100 bg-white px-6 shadow-sm">
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-extrabold tracking-tight text-gray-900">Feature Requests</h1>
          <p className="mt-0.5 text-xs text-gray-400">Track improvement requests and roadmap planning</p>
        </div>
        <div className="relative w-56 shrink-0">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search requests..."
            className="w-full rounded-xl border border-gray-100 bg-gray-50 py-2 pl-9 pr-4 text-xs font-medium text-gray-700 outline-none focus:border-indigo-300 focus:bg-white"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2 text-xs font-medium text-gray-700 outline-none focus:border-indigo-300"
        >
          <option value="all">All statuses</option>
          {STATUS_OPTIONS.map((status) => (
            <option key={status} value={status}>
              {STATUS_LABELS[status]}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setShowCreate((value) => !value)}
          className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-indigo-700"
        >
          <Plus className="h-3.5 w-3.5" />
          Log request
        </button>
        <AdminActivityBellLink />
      </header>

      <main className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-7xl space-y-5">
          {error ? (
            <p className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {[
              { label: "Submitted", value: data.stats.submitted },
              { label: "Under Review", value: data.stats.underReview },
              { label: "Planned", value: data.stats.planned },
              { label: "In Progress", value: data.stats.inProgress },
              { label: "Shipped", value: data.stats.shipped },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
                <Lightbulb className="mb-2 h-4 w-4 text-amber-500" />
                <p className="text-2xl font-extrabold text-gray-900">{stat.value}</p>
                <p className="text-xs font-semibold text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>

          {showCreate ? (
            <section className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-6 shadow-sm">
              <h2 className="text-sm font-bold text-gray-900">Log feature request</h2>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Feature title"
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-300"
                />
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="Category (optional)"
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-300"
                />
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the requested improvement..."
                  rows={3}
                  className="md:col-span-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-indigo-300"
                />
              </div>
              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={isPending}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
                >
                  {isPending ? "Saving…" : "Save request"}
                </button>
              </div>
            </section>
          ) : null}

          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
            <div className="border-b border-gray-50 px-6 py-4">
              <h2 className="text-sm font-bold text-gray-900">Roadmap backlog</h2>
            </div>
            {filtered.length === 0 ? (
              <div className="py-14 text-center text-sm text-gray-400">
                No feature requests yet. Log one to start building your roadmap.
              </div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {filtered.map((request) => (
                  <FeatureRequestItem
                    key={request.id}
                    request={request}
                    expanded={expandedId === request.id}
                    onToggle={() =>
                      setExpandedId((current) => (current === request.id ? null : request.id))
                    }
                    onUpdate={handleUpdate}
                    isPending={isPending}
                  />
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    </>
  );
}

function FeatureRequestItem({
  request,
  expanded,
  onToggle,
  onUpdate,
  isPending,
}: {
  request: AdminFeatureRequestRow;
  expanded: boolean;
  onToggle: () => void;
  onUpdate: (
    requestId: string,
    updates: {
      status?: AdminFeatureRequestStatus;
      priority?: AdminFeatureRequestPriority;
      adminNotes?: string | null;
    }
  ) => void;
  isPending: boolean;
}) {
  const [notes, setNotes] = useState(request.adminNotes ?? "");

  return (
    <li className="px-6 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <button type="button" onClick={onToggle} className="min-w-0 flex-1 text-left">
          <p className="text-sm font-semibold text-gray-900">{request.title}</p>
          <p className="mt-1 line-clamp-2 text-xs text-gray-500">{request.description}</p>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-gray-400">
            {request.businessName && request.companyId ? (
              <Link
                href={`${ADMIN_BUSINESSES_PATH}/${request.companyId}`}
                className="font-semibold text-indigo-600"
                onClick={(event) => event.stopPropagation()}
              >
                {request.businessName}
              </Link>
            ) : null}
            {request.submittedByName ? <span>{request.submittedByName}</span> : null}
            <span>{request.createdAt}</span>
          </div>
        </button>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-lg bg-gray-50 px-2 py-1 text-[10px] font-bold text-gray-700">
            <ThumbsUp className="h-3 w-3" />
            {request.voteCount}
          </span>
          <span className={`rounded-lg px-2 py-1 text-[10px] font-bold ${STATUS_STYLES[request.status]}`}>
            {STATUS_LABELS[request.status]}
          </span>
        </div>
      </div>

      {expanded ? (
        <div className="mt-4 grid gap-3 rounded-xl border border-gray-100 bg-gray-50/70 p-4 md:grid-cols-3">
          <label className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Status</span>
            <select
              value={request.status}
              onChange={(e) =>
                onUpdate(request.id, { status: e.target.value as AdminFeatureRequestStatus })
              }
              disabled={isPending}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium outline-none"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Priority</span>
            <select
              value={request.priority}
              onChange={(e) =>
                onUpdate(request.id, { priority: e.target.value as AdminFeatureRequestPriority })
              }
              disabled={isPending}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-medium capitalize outline-none"
            >
              {PRIORITY_OPTIONS.map((priority) => (
                <option key={priority} value={priority}>
                  {priority}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1 md:col-span-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Admin notes</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs outline-none"
            />
          </label>
          <div className="md:col-span-3 flex justify-end">
            <button
              type="button"
              onClick={() => onUpdate(request.id, { adminNotes: notes })}
              disabled={isPending}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white disabled:opacity-60"
            >
              Save notes
            </button>
          </div>
        </div>
      ) : null}
    </li>
  );
}
