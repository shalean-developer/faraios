"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Columns3,
  ExternalLink,
  Filter,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Tag,
  Upload,
  User,
  UserPlus,
  X,
} from "lucide-react";

import {
  convertLeadToCustomerAction,
  updateLeadNotesAction,
  updateLeadStatusAction,
} from "@/app/actions/leads";
import { LeadFormPopover } from "@/components/company/lead-form-popover";
import { Button } from "@/components/ui/button";
import { downloadLeadsCsv } from "@/lib/leads/csv";
import { companyCustomerPath } from "@/lib/paths/company";
import type { CompanyMember } from "@/lib/services/team";
import { cn } from "@/lib/utils";
import {
  riseCardClassName,
  risePageClassName,
  risePrimaryButtonClassName,
} from "@/lib/ui/rise-dashboard-styles";
import type { Lead, LeadStatus } from "@/types/growth-engine";

type DisplayStatus =
  | "New"
  | "Discussion"
  | "Negotiation"
  | "Qualified"
  | "Won"
  | "Lost";

const STATUS_FILTER_OPTIONS: { value: LeadStatus | "all"; label: string }[] = [
  { value: "all", label: "All statuses" },
  { value: "new", label: "New" },
  { value: "contacted", label: "Contacted" },
  { value: "converted", label: "Converted" },
  { value: "archived", label: "Archived" },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50];

function hashCode(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function getDisplayStatus(lead: Lead): DisplayStatus {
  if (lead.status === "new") return "New";
  if (lead.status === "converted") return "Won";
  if (lead.status === "archived") return "Lost";
  if (lead.email && lead.phone) return "Qualified";
  return hashCode(lead.id) % 2 === 0 ? "Discussion" : "Negotiation";
}

function displayStatusClass(status: DisplayStatus): string {
  switch (status) {
    case "New":
      return "bg-amber-50 text-amber-700 ring-amber-200/80";
    case "Discussion":
      return "bg-teal-50 text-teal-700 ring-teal-200/80";
    case "Negotiation":
      return "bg-violet-50 text-violet-700 ring-violet-200/80";
    case "Qualified":
      return "bg-sky-50 text-sky-700 ring-sky-200/80";
    case "Won":
      return "bg-emerald-50 text-emerald-700 ring-emerald-200/80";
    case "Lost":
      return "bg-red-50 text-red-700 ring-red-200/80";
    default:
      return "bg-slate-100 text-slate-600 ring-slate-200/80";
  }
}

function formatLeadDateTime(value: string): string {
  const date = new Date(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  const ampm = hours >= 12 ? "pm" : "am";
  const hour12 = hours % 12 || 12;
  return `${day}-${month}-${year} ${hour12}:${minutes}:${seconds} ${ampm}`;
}

function getLeadLabel(lead: Lead): string | null {
  const created = new Date(lead.created_at).getTime();
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  if (lead.status === "new" && created >= weekAgo) return "Call this week";
  if (lead.lead_type === "quote_request") return "Quote request";
  if (lead.utm_campaign) return lead.utm_campaign;
  return null;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function Avatar({
  name,
  className,
  colorClass = "bg-slate-200 text-slate-600",
}: {
  name: string;
  className?: string;
  colorClass?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
        colorClass,
        className
      )}
    >
      {getInitials(name)}
    </span>
  );
}

function ToolbarButton({
  children,
  onClick,
  active,
  className,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  active?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50",
        active && "border-[#5c86f2] bg-[#eef2ff] text-[#4a6fd8]",
        className
      )}
    >
      {children}
    </button>
  );
}

function LeadDetailPanel({
  lead,
  slug,
  notesDraft,
  onNotesChange,
  onSaveNotes,
  onStatusChange,
  onConvert,
  onClose,
  pending,
  error,
}: {
  lead: Lead;
  slug: string;
  notesDraft: string;
  onNotesChange: (value: string) => void;
  onSaveNotes: () => void;
  onStatusChange: (status: LeadStatus) => void;
  onConvert: () => void;
  onClose: () => void;
  pending: boolean;
  error: string | null;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end p-4 sm:p-6"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
        aria-label="Close lead details"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[min(90vh,calc(100dvh-2rem))] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <p className="text-sm font-semibold text-slate-900">Lead details</p>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-4 overflow-y-auto p-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{lead.name ?? "Lead"}</h2>
            <p className="mt-1 text-sm text-slate-500">{lead.email ?? "No email"}</p>
            {lead.phone ? <p className="text-sm text-slate-500">{lead.phone}</p> : null}
          </div>

          <div className="text-xs text-slate-500">
            <p>Source: {lead.source ?? "website"}</p>
            {lead.utm_source ? (
              <p>
                Campaign: {lead.utm_source}
                {lead.utm_campaign ? ` / ${lead.utm_campaign}` : ""}
              </p>
            ) : null}
            {lead.landing_page ? <p>Landing: {lead.landing_page}</p> : null}
          </div>

          <label className="block text-sm">
            <span className="font-medium text-slate-700">Notes</span>
            <textarea
              rows={4}
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={notesDraft}
              onChange={(e) => onNotesChange(e.target.value)}
            />
          </label>
          <Button
            variant="outline"
            className="w-full rounded-xl"
            disabled={pending}
            onClick={onSaveNotes}
          >
            Save notes
          </Button>

          <label className="block text-sm">
            <span className="font-medium text-slate-700">Status</span>
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={lead.status}
              onChange={(e) => onStatusChange(e.target.value as LeadStatus)}
              disabled={pending}
            >
              <option value="new">New</option>
              <option value="contacted">Contacted</option>
              <option value="converted">Converted</option>
              <option value="archived">Archived</option>
            </select>
          </label>

          {lead.status !== "converted" ? (
            <Button className="w-full rounded-xl" disabled={pending} onClick={onConvert}>
              <UserPlus className="mr-1.5 h-4 w-4" />
              Convert to customer
            </Button>
          ) : lead.customer_id ? (
            <Link
              href={companyCustomerPath(slug, lead.customer_id)}
              className="inline-flex w-full items-center justify-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-[#4a6fd8] hover:bg-[#eef2ff]"
            >
              View customer record
            </Link>
          ) : null}

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}

function LeadsKanban({
  leads,
  onOpenLead,
}: {
  leads: Lead[];
  onOpenLead: (lead: Lead) => void;
}) {
  const columns: { key: DisplayStatus; title: string }[] = [
    { key: "New", title: "New" },
    { key: "Discussion", title: "Discussion" },
    { key: "Negotiation", title: "Negotiation" },
    { key: "Qualified", title: "Qualified" },
    { key: "Won", title: "Won" },
    { key: "Lost", title: "Lost" },
  ];

  const grouped = useMemo(() => {
    const map = new Map<DisplayStatus, Lead[]>();
    for (const col of columns) map.set(col.key, []);
    for (const lead of leads) {
      const status = getDisplayStatus(lead);
      map.get(status)?.push(lead);
    }
    return map;
  }, [leads]);

  return (
    <div className="flex gap-4 overflow-x-auto p-4">
      {columns.map((col) => {
        const items = grouped.get(col.key) ?? [];
        return (
          <div
            key={col.key}
            className="flex w-64 shrink-0 flex-col rounded-xl border border-slate-200 bg-slate-50"
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-3 py-2.5">
              <span className="text-sm font-semibold text-slate-700">{col.title}</span>
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-slate-500">
                {items.length}
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-2 p-2">
              {items.length === 0 ? (
                <p className="px-2 py-4 text-center text-xs text-slate-400">No leads</p>
              ) : (
                items.map((lead) => (
                  <button
                    key={lead.id}
                    type="button"
                    onClick={() => onOpenLead(lead)}
                    className="rounded-lg border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-[#5c86f2]/40 hover:shadow"
                  >
                    <p className="text-sm font-medium text-[#4a6fd8]">{lead.name ?? "Unknown"}</p>
                    <p className="mt-1 text-xs text-slate-500">
                      {lead.phone ?? lead.email ?? "No contact"}
                    </p>
                    {getLeadLabel(lead) ? (
                      <span className="mt-2 inline-block rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-medium text-violet-700">
                        {getLeadLabel(lead)}
                      </span>
                    ) : null}
                  </button>
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function CompanyLeadsClient({
  slug,
  companyId,
  leads: initialLeads,
  members,
}: {
  slug: string;
  companyId: string;
  leads: Lead[];
  members: CompanyMember[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialLeads);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<LeadStatus | "all">("all");
  const [showFilters, setShowFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [density, setDensity] = useState<"compact" | "comfortable">("comfortable");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [showLeadForm, setShowLeadForm] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  const [showLabelsPanel, setShowLabelsPanel] = useState(false);
  const [view, setView] = useState<"list" | "kanban">("list");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setRows(initialLeads);
  }, [initialLeads]);

  const memberList = useMemo(() => {
    return members.map((m) => ({
      id: m.user_id,
      name: m.full_name?.trim() || m.email,
    }));
  }, [members]);

  const getOwner = (leadId: string) => {
    if (memberList.length === 0) return { name: "Unassigned", id: null };
    const index = hashCode(leadId) % memberList.length;
    return memberList[index];
  };

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

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pageRows = filteredRows.slice(pageStart, pageStart + pageSize);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const openLead = (lead: Lead) => {
    setSelectedLead(lead);
    setNotesDraft(lead.message ?? "");
    setError(null);
  };

  const closeLead = () => {
    setSelectedLead(null);
    setError(null);
  };

  const openCreateForm = () => {
    setEditingLead(null);
    setShowLeadForm(true);
  };

  const openEditForm = (lead: Lead) => {
    setEditingLead(lead);
    setShowLeadForm(true);
  };

  const closeLeadForm = () => {
    setShowLeadForm(false);
    setEditingLead(null);
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
      setSelectedLead((prev) => (prev?.id === leadId ? { ...prev, status } : prev));
      router.refresh();
    });
  };

  const archiveLead = (leadId: string) => {
    if (!confirm("Archive this lead?")) return;
    updateStatus(leadId, "archived");
  };

  const saveNotes = () => {
    if (!selectedLead) return;
    startTransition(async () => {
      const result = await updateLeadNotesAction({
        companyId,
        companySlug: slug,
        leadId: selectedLead.id,
        message: notesDraft,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setRows((prev) =>
        prev.map((row) =>
          row.id === selectedLead.id ? { ...row, message: notesDraft.trim() || null } : row
        )
      );
      setSelectedLead((prev) =>
        prev ? { ...prev, message: notesDraft.trim() || null } : prev
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
      setSelectedLead((prev) =>
        prev?.id === lead.id
          ? { ...prev, status: "converted", customer_id: result.customerId }
          : prev
      );
      router.refresh();
    });
  };

  const onExport = () => {
    downloadLeadsCsv(filteredRows, `${slug}-leads.csv`);
  };

  const onPrint = () => {
    window.print();
  };

  const onRefresh = () => {
    router.refresh();
  };

  const rowPadding = density === "compact" ? "py-2" : "py-3.5";

  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const nums: (number | "...")[] = [];
    for (let i = 1; i <= 5; i += 1) nums.push(i);
    nums.push("...");
    nums.push(totalPages);
    return nums;
  }, [totalPages]);

  return (
    <div className={risePageClassName}>
    <div className={cn(riseCardClassName, "flex min-h-full flex-col print:bg-white")}>
      <div className="flex flex-col gap-4 border-b border-slate-200 px-4 py-4 sm:px-6 print:hidden">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-6">
            {(["list", "kanban"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setView(tab)}
                className={cn(
                  "border-b-2 pb-2 text-sm font-medium transition",
                  view === tab
                    ? "border-[#5c86f2] text-[#4a6fd8]"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                )}
              >
                {tab === "list" ? "Leads" : "Kanban"}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-lg border-slate-200 text-sm font-medium text-slate-700"
              onClick={() => setShowLabelsPanel((v) => !v)}
            >
              <Tag className="mr-1.5 h-4 w-4" />
              Manage labels
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-9 rounded-lg border-slate-200 bg-slate-50 text-sm font-medium text-slate-700"
              onClick={() => alert("CSV import for leads is coming soon.")}
            >
              <Upload className="mr-1.5 h-4 w-4" />
              Import leads
            </Button>
            <Button
              type="button"
              className={risePrimaryButtonClassName}
              onClick={openCreateForm}
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add lead
            </Button>
          </div>
        </div>

        {showLabelsPanel ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Labels are automatically assigned based on lead activity. Custom label management
            will be available in a future update.
          </div>
        ) : null}
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="flex flex-wrap items-center gap-2 overflow-x-auto border-b border-slate-200 px-4 py-2.5 sm:px-6 print:hidden">
          <ToolbarButton>
            <Columns3 className="h-3.5 w-3.5" />
          </ToolbarButton>
          <div className="relative">
            <ToolbarButton active={showFilters} onClick={() => setShowFilters((v) => !v)}>
              <Filter className="h-3.5 w-3.5" />
              Filters
            </ToolbarButton>
            {showFilters ? (
              <div className="absolute left-0 top-full z-20 mt-1 w-48 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
                {STATUS_FILTER_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setStatusFilter(option.value);
                      setPage(1);
                    }}
                    className={cn(
                      "flex w-full rounded-md px-2 py-1.5 text-left text-sm transition hover:bg-slate-50",
                      statusFilter === option.value && "bg-[#eef2ff] text-[#4a6fd8]"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <ToolbarButton>
            <Plus className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton active={density === "compact"} onClick={() => setDensity("compact")}>
            50%
          </ToolbarButton>
          <ToolbarButton
            active={density === "comfortable"}
            onClick={() => setDensity("comfortable")}
          >
            90%
          </ToolbarButton>
          <ToolbarButton>
            <Phone className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton>
            <User className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={onRefresh}>
            <RefreshCw className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton onClick={onExport} className="px-3">
            Excel
          </ToolbarButton>
          <ToolbarButton onClick={onPrint} className="px-3">
            <Printer className="h-3.5 w-3.5" />
            Print
          </ToolbarButton>
          <div className="ml-auto flex w-full min-w-0 items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 sm:w-auto sm:min-w-[180px]">
            <Search className="h-3.5 w-3.5 text-slate-400" />
            <input
              type="search"
              placeholder="Search"
              className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>
        </div>

        {view === "list" ? (
          <>
          <div className="md:hidden">
            {pageRows.length === 0 ? (
              <p className="px-4 py-16 text-center text-sm text-slate-500 sm:px-6">
                No leads match your filters. Leads from your website and booking forms appear here
                automatically.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {pageRows.map((lead) => {
                  const label = getLeadLabel(lead);
                  const displayStatus = getDisplayStatus(lead);
                  const owner = getOwner(lead.id);

                  return (
                    <li key={lead.id} className="px-4 py-4 sm:px-6">
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => openLead(lead)}
                          className="min-w-0 flex-1 text-left"
                        >
                          <p className="truncate font-medium text-[#4a6fd8]">
                            {lead.name ?? "Unknown"}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {lead.email ?? lead.phone ?? "No contact info"}
                          </p>
                        </button>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
                            displayStatusClass(displayStatus)
                          )}
                        >
                          {displayStatus}
                        </span>
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                        {lead.phone ? <span>{lead.phone}</span> : null}
                        <span>{owner.name}</span>
                        {label ? (
                          <span className="rounded-full bg-violet-50 px-2 py-0.5 text-violet-700">
                            {label}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="text-xs text-slate-400">
                          {formatLeadDateTime(lead.created_at)}
                        </span>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => openLead(lead)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            aria-label="View lead"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditForm(lead)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                            aria-label="Edit lead"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="hidden flex-1 overflow-x-auto md:block">
            <table className="w-full min-w-[960px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-500">
                  <th className="px-4 py-3 font-medium sm:px-6">Name</th>
                  <th className="px-4 py-3 font-medium">Primary contact</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Owner</th>
                  <th className="px-4 py-3 font-medium">Labels</th>
                  <th className="px-4 py-3 font-medium">Created at</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium sm:pr-6" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pageRows.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-16 text-center text-slate-500">
                      No leads match your filters. Leads from your website and booking forms
                      appear here automatically.
                    </td>
                  </tr>
                ) : (
                  pageRows.map((lead) => {
                    const owner = getOwner(lead.id);
                    const label = getLeadLabel(lead);
                    const displayStatus = getDisplayStatus(lead);
                    const contactName = lead.name ?? "Unknown";

                    return (
                      <tr key={lead.id} className="transition hover:bg-slate-50/80">
                        <td className={cn("px-4 sm:px-6", rowPadding)}>
                          <button
                            type="button"
                            onClick={() => openLead(lead)}
                            className="font-medium text-[#4a6fd8] hover:underline"
                          >
                            {lead.name ?? "Unknown"}
                          </button>
                        </td>
                        <td className={cn("px-4", rowPadding)}>
                          <div className="flex items-center gap-2">
                            <Avatar name={contactName} className="h-7 w-7" />
                            <span className="text-slate-700">{contactName}</span>
                          </div>
                        </td>
                        <td className={cn("px-4 text-slate-600", rowPadding)}>
                          {lead.phone ? (
                            <div className="space-y-0.5">
                              <p>{lead.phone}</p>
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className={cn("px-4", rowPadding)}>
                          <div className="flex items-center gap-2">
                            <Avatar
                              name={owner.name}
                              className="h-6 w-6"
                              colorClass="bg-[#dbeafe] text-[#4a6fd8]"
                            />
                            <span className="text-slate-700">{owner.name}</span>
                          </div>
                        </td>
                        <td className={cn("px-4", rowPadding)}>
                          {label ? (
                            <span className="inline-flex rounded-full bg-violet-50 px-2.5 py-0.5 text-xs font-medium text-violet-700">
                              {label}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className={cn("px-4 text-slate-500", rowPadding)}>
                          {formatLeadDateTime(lead.created_at)}
                        </td>
                        <td className={cn("px-4", rowPadding)}>
                          <span
                            className={cn(
                              "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
                              displayStatusClass(displayStatus)
                            )}
                          >
                            {displayStatus}
                          </span>
                        </td>
                        <td className={cn("px-4 sm:pr-6", rowPadding)}>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => openLead(lead)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                              aria-label="View lead"
                            >
                              <ExternalLink className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openEditForm(lead)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                              aria-label="Edit lead"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => archiveLead(lead.id)}
                              className="inline-flex h-7 w-7 items-center justify-center rounded text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                              aria-label="Archive lead"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 print:hidden">
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-sm"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
              <span>
                {filteredRows.length === 0
                  ? "0-0 / 0"
                  : `${pageStart + 1}-${Math.min(pageStart + pageSize, filteredRows.length)} / ${filteredRows.length}`}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                aria-label="Previous page"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {pageNumbers.map((num, i) =>
                num === "..." ? (
                  <span key={`ellipsis-${i}`} className="px-1 text-slate-400">
                    …
                  </span>
                ) : (
                  <button
                    key={num}
                    type="button"
                    onClick={() => setPage(num)}
                    className={cn(
                      "inline-flex h-8 min-w-8 items-center justify-center rounded-md px-2 text-sm transition",
                      currentPage === num
                        ? "bg-[#5c86f2] text-white"
                        : "border border-slate-200 text-slate-600 hover:bg-slate-50"
                    )}
                  >
                    {num}
                  </button>
                )
              )}
              <button
                type="button"
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
                aria-label="Next page"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
          </>
        ) : (
          <LeadsKanban leads={filteredRows} onOpenLead={openLead} />
        )}
      </div>

      <button
        type="button"
        className="fixed bottom-6 right-6 z-40 flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white text-[#5c86f2] shadow-lg transition hover:shadow-xl print:hidden"
        aria-label="Open chat"
      >
        <MessageCircle className="h-5 w-5" />
      </button>

      {selectedLead ? (
        <LeadDetailPanel
          lead={selectedLead}
          slug={slug}
          notesDraft={notesDraft}
          onNotesChange={setNotesDraft}
          onSaveNotes={saveNotes}
          onStatusChange={(status) => updateStatus(selectedLead.id, status)}
          onConvert={() => convertToCustomer(selectedLead)}
          onClose={closeLead}
          pending={pending}
          error={error}
        />
      ) : null}

      <LeadFormPopover
        open={showLeadForm}
        onClose={closeLeadForm}
        slug={slug}
        companyId={companyId}
        lead={editingLead}
      />
    </div>
    </div>
  );
}
