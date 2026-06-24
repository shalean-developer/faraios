"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { UserPlus } from "lucide-react";

import {
  convertLeadToCustomerAction,
  updateLeadNotesAction,
  updateLeadStatusAction,
} from "@/app/actions/leads";
import { Button } from "@/components/ui/button";
import { companyCustomerPath } from "@/lib/paths/company";
import { cn } from "@/lib/utils";
import type { LeadListSummary } from "@/lib/services/leads";
import type { Lead, LeadStatus } from "@/types/growth-engine";

const STATUS_OPTIONS: { value: LeadStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "converted", label: "Converted" },
  { value: "archived", label: "Archived" },
];

function statusBadgeClass(status: LeadStatus): string {
  switch (status) {
    case "new":
      return "bg-violet-50 text-violet-700";
    case "contacted":
      return "bg-blue-50 text-blue-700";
    case "converted":
      return "bg-emerald-50 text-emerald-700";
    case "archived":
      return "bg-slate-100 text-slate-600";
    default:
      return "bg-slate-100 text-slate-600";
  }
}

function formatLeadDate(value: string): string {
  return new Date(value).toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function CompanyLeadsClient({
  slug,
  companyId,
  leads: initialLeads,
  summary,
}: {
  slug: string;
  companyId: string;
  leads: Lead[];
  summary: LeadListSummary;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialLeads);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selected = rows.find((row) => row.id === selectedId) ?? null;

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (!query) return true;
      return (
        (row.name ?? "").toLowerCase().includes(query) ||
        (row.email ?? "").toLowerCase().includes(query) ||
        (row.phone ?? "").toLowerCase().includes(query) ||
        (row.message ?? "").toLowerCase().includes(query) ||
        (row.source ?? "").toLowerCase().includes(query)
      );
    });
  }, [rows, search, statusFilter]);

  const openLead = (lead: Lead) => {
    setSelectedId(lead.id);
    setNotesDraft(lead.message ?? "");
    setError(null);
  };

  const updateStatus = (leadId: string, status: LeadStatus) => {
    startTransition(async () => {
      const result = await updateLeadStatusAction({
        companyId,
        companySlug: slug,
        leadId,
        status,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setRows((prev) => prev.map((row) => (row.id === leadId ? { ...row, status } : row)));
      router.refresh();
    });
  };

  const saveNotes = () => {
    if (!selected) return;
    startTransition(async () => {
      const result = await updateLeadNotesAction({
        companyId,
        companySlug: slug,
        leadId: selected.id,
        message: notesDraft,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setRows((prev) =>
        prev.map((row) =>
          row.id === selected.id ? { ...row, message: notesDraft.trim() || null } : row
        )
      );
    });
  };

  const convertToCustomer = (lead: Lead) => {
    startTransition(async () => {
      const result = await convertLeadToCustomerAction({
        companyId,
        companySlug: slug,
        leadId: lead.id,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setRows((prev) =>
        prev.map((row) =>
          row.id === lead.id
            ? { ...row, status: "converted", customer_id: result.customerId }
            : row
        )
      );
      router.refresh();
    });
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <div>
        <div className="mb-4 grid gap-3 sm:grid-cols-4">
          {[
            { label: "Total", value: summary.total },
            { label: "New", value: summary.newCount },
            { label: "Contacted", value: summary.contactedCount },
            { label: "Converted", value: summary.convertedCount },
          ].map((card) => (
            <div
              key={card.label}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                {card.label}
              </p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{card.value}</p>
            </div>
          ))}
        </div>

        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            type="search"
            placeholder="Search leads..."
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm sm:max-w-xs"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            {STATUS_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setStatusFilter(option.value)}
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold transition",
                  statusFilter === option.value
                    ? "bg-violet-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                <th className="px-4 py-3">Lead</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-500">
                    No leads match your filters. Leads from your website and booking forms
                    appear here automatically.
                  </td>
                </tr>
              ) : (
                filteredRows.map((lead) => (
                  <tr
                    key={lead.id}
                    className={cn(
                      "cursor-pointer transition hover:bg-slate-50",
                      selectedId === lead.id && "bg-violet-50/60"
                    )}
                    onClick={() => openLead(lead)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{lead.name ?? "Unknown"}</p>
                      <p className="text-xs text-slate-500">
                        {lead.email ?? lead.phone ?? "No contact info"}
                      </p>
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-600">
                      {lead.source ?? "website"}
                      {lead.lead_type !== "contact" ? ` · ${lead.lead_type.replace(/_/g, " ")}` : ""}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
                          statusBadgeClass(lead.status)
                        )}
                      >
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">{formatLeadDate(lead.created_at)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <aside className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {!selected ? (
          <p className="text-sm text-slate-500">
            Select a lead to view details, update status, add notes, or convert to a customer.
          </p>
        ) : (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {selected.name ?? "Lead"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">{selected.email ?? "No email"}</p>
              {selected.phone ? (
                <p className="text-sm text-slate-500">{selected.phone}</p>
              ) : null}
            </div>

            <div className="text-xs text-slate-500">
              <p>Source: {selected.source ?? "website"}</p>
              {selected.utm_source ? (
                <p>
                  Campaign: {selected.utm_source}
                  {selected.utm_campaign ? ` / ${selected.utm_campaign}` : ""}
                </p>
              ) : null}
              {selected.landing_page ? <p>Landing: {selected.landing_page}</p> : null}
            </div>

            <label className="block text-sm">
              <span className="font-medium text-slate-700">Notes</span>
              <textarea
                rows={4}
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
              />
            </label>
            <Button
              variant="outline"
              className="w-full rounded-xl"
              disabled={pending}
              onClick={saveNotes}
            >
              Save notes
            </Button>

            <label className="block text-sm">
              <span className="font-medium text-slate-700">Status</span>
              <select
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                value={selected.status}
                onChange={(e) => updateStatus(selected.id, e.target.value as LeadStatus)}
                disabled={pending}
              >
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="converted">Converted</option>
                <option value="archived">Archived</option>
              </select>
            </label>

            {selected.status !== "converted" ? (
              <Button
                className="w-full rounded-xl"
                disabled={pending}
                onClick={() => convertToCustomer(selected)}
              >
                <UserPlus className="mr-1.5 h-4 w-4" />
                Convert to customer
              </Button>
            ) : selected.customer_id ? (
              <Link
                href={companyCustomerPath(slug, selected.customer_id)}
                className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-violet-700 hover:bg-violet-50"
              >
                View customer record
              </Link>
            ) : null}

            {error ? <p className="text-sm text-red-600">{error}</p> : null}
          </div>
        )}
      </aside>
    </div>
  );
}
