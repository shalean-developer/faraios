"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Briefcase,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
  FileText,
  Filter,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Tag,
  Upload,
  UserRound,
  Users,
  X,
} from "lucide-react";

import { deleteCustomer, importCustomers } from "@/app/actions/customers";
import { CustomerFormPopover } from "@/components/company/customer-form-popover";
import { ManageLabelsModal } from "@/components/company/event-calendar/manage-labels-modal";
import { RiseCalendarDropdown } from "@/components/company/event-calendar/rise-calendar-dropdown";
import type { CalendarLabel } from "@/lib/calendar/event-labels";
import {
  DEFAULT_CLIENT_LABELS,
  getClientGroup,
  getClientLabelForCustomer,
  readClientLabels,
  writeClientLabels,
} from "@/lib/clients/client-labels";
import { downloadCustomersCsv } from "@/lib/customers/csv";
import { formatRevenue } from "@/lib/operations/metrics";
import { companyCustomerPath } from "@/lib/paths/company";
import type { CustomerFinancials, ClientsOverviewMetrics } from "@/lib/services/clients-overview";
import type { CustomerListStats } from "@/lib/services/customers";
import { cn } from "@/lib/utils";
import type { CompanyWithIndustry, Customer } from "@/types/database";

type Tab = "overview" | "clients" | "contacts";

const riseCardClassName = "rounded-xl border border-slate-200 bg-white shadow-sm";
const riseOutlineButtonClassName =
  "inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50";

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;
const QUICK_FILTERS = [
  { id: "open_projects", label: "Has open projects" },
  { id: "due", label: "Has due" },
] as const;

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full bg-slate-200 text-[10px] font-semibold text-slate-600",
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

function StatCard({
  icon: Icon,
  iconClassName,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  iconClassName: string;
  label: string;
  value: number;
}) {
  return (
    <div className={cn(riseCardClassName, "flex items-center gap-4 p-4")}>
      <div className={cn("flex h-11 w-11 items-center justify-center rounded-full", iconClassName)}>
        <Icon className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <div>
        <p className="text-3xl font-normal leading-none text-slate-800">{value}</p>
        <p className="mt-1 text-sm text-slate-500">{label}</p>
      </div>
    </div>
  );
}

function InvoiceProgressCard({
  label,
  count,
  pct,
  barClassName,
}: {
  label: string;
  count: number;
  pct: number;
  barClassName: string;
}) {
  return (
    <div className={cn(riseCardClassName, "p-4")}>
      <p className="text-sm text-slate-600">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="text-3xl font-normal text-slate-800">{count}</p>
        <p className="pb-1 text-sm text-slate-500">{pct}% of total clients</p>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
        <div className={cn("h-full rounded-full", barClassName)} style={{ width: `${Math.max(pct, 4)}%` }} />
      </div>
    </div>
  );
}

function MetricListCard({
  title,
  rows,
}: {
  title: string;
  rows: { label: string; value: number; color: string }[];
}) {
  return (
    <div className={cn(riseCardClassName, "p-4")}>
      <h3 className="text-sm font-medium text-slate-700">{title}</h3>
      <ul className="mt-3 space-y-2.5">
        {rows.map((row) => (
          <li key={row.label} className="flex items-center justify-between text-sm">
            <span className="text-slate-600">{row.label}</span>
            <span className="font-medium" style={{ color: row.color }}>
              {row.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ProgressMetricCard({
  label,
  count,
  pct,
  barClassName,
}: {
  label: string;
  count: number;
  pct: number;
  barClassName: string;
}) {
  return (
    <div className={cn(riseCardClassName, "p-4")}>
      <p className="text-sm text-slate-600">{label}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="text-3xl font-normal text-slate-800">{count}</p>
        <p className="pb-1 text-sm text-slate-500">{pct}% of total clients</p>
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
        <div className={cn("h-full rounded-full", barClassName)} style={{ width: `${Math.max(pct, 3)}%` }} />
      </div>
    </div>
  );
}

function OverviewTab({ metrics }: { metrics: ClientsOverviewMetrics }) {
  return (
    <div className="space-y-4 p-4 sm:p-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Briefcase}
          iconClassName="bg-[#eef2ff] text-[#5a8dee]"
          label="Total clients"
          value={metrics.totalClients}
        />
        <StatCard
          icon={Users}
          iconClassName="bg-[#fff7ed] text-[#f97316]"
          label="Total contacts"
          value={metrics.totalContacts}
        />
        <StatCard
          icon={CheckSquare}
          iconClassName="bg-[#eef2ff] text-[#5a8dee]"
          label="Contacts logged in today"
          value={metrics.contactsActiveToday}
        />
        <StatCard
          icon={CheckSquare}
          iconClassName="bg-[#eef2ff] text-[#5a8dee]"
          label="Contacts logged in last 7 days"
          value={metrics.contactsActiveLast7Days}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <InvoiceProgressCard
          label="Clients has unpaid invoices"
          count={metrics.clientsUnpaidInvoices}
          pct={metrics.clientsUnpaidPct}
          barClassName="bg-[#fb923c]"
        />
        <InvoiceProgressCard
          label="Clients has partially paid invoices"
          count={metrics.clientsPartiallyPaidInvoices}
          pct={metrics.clientsPartialPct}
          barClassName="bg-[#5a8dee]"
        />
        <InvoiceProgressCard
          label="Clients has overdue invoices"
          count={metrics.clientsOverdueInvoices}
          pct={metrics.clientsOverduePct}
          barClassName="bg-[#ef4444]"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <MetricListCard
          title="Projects"
          rows={[
            { label: "Open projects", value: metrics.projects.open, color: "#5a8dee" },
            { label: "Completed projects", value: metrics.projects.completed, color: "#22c55e" },
            { label: "Hold projects", value: metrics.projects.hold, color: "#eab308" },
            { label: "Canceled projects", value: metrics.projects.canceled, color: "#ef4444" },
          ]}
        />
        <MetricListCard
          title="Estimates"
          rows={[
            { label: "Open estimates", value: metrics.estimates.open, color: "#eab308" },
            { label: "Accepted estimates", value: metrics.estimates.accepted, color: "#22c55e" },
            { label: "New estimate requests", value: metrics.estimates.newRequests, color: "#5a8dee" },
            { label: "Estimate requests in progress", value: metrics.estimates.inProgress, color: "#5a8dee" },
          ]}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-4">
          <ProgressMetricCard
            label="Clients has open tickets"
            count={metrics.clientsOpenTickets}
            pct={metrics.clientsOpenTicketsPct}
            barClassName="bg-[#ef4444]"
          />
          <ProgressMetricCard
            label="Clients has new orders"
            count={metrics.clientsNewOrders}
            pct={metrics.clientsNewOrdersPct}
            barClassName="bg-[#fb923c]"
          />
        </div>
        <MetricListCard
          title="Proposals"
          rows={[
            { label: "Open proposals", value: metrics.proposals.open, color: "#eab308" },
            { label: "Accepted proposals", value: metrics.proposals.accepted, color: "#22c55e" },
            { label: "Rejected proposals", value: metrics.proposals.rejected, color: "#ef4444" },
          ]}
        />
      </div>
    </div>
  );
}

function PaginationFooter({
  pageSize,
  onPageSizeChange,
  page,
  totalPages,
  totalItems,
  pageStart,
  pageEnd,
  onPageChange,
}: {
  pageSize: number;
  onPageSizeChange: (size: number) => void;
  page: number;
  totalPages: number;
  totalItems: number;
  pageStart: number;
  pageEnd: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-t border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="flex items-center gap-2 text-sm text-slate-500">
        <select
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          className="h-8 rounded-md border border-slate-200 bg-white px-2 text-sm"
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <span>
          {totalItems === 0 ? "0" : `${pageStart + 1}-${pageEnd}`} / {totalItems}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        {Array.from({ length: Math.min(totalPages, 5) }, (_, index) => index + 1).map((num) => (
          <button
            key={num}
            type="button"
            onClick={() => onPageChange(num)}
            className={cn(
              "inline-flex h-8 min-w-8 items-center justify-center rounded-md border px-2 text-sm",
              page === num
                ? "border-[#5a8dee] bg-[#5a8dee] text-white"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            )}
          >
            {num}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function RiseClientsDashboard({
  slug,
  company,
  customers: initialCustomers,
  stats,
  overview,
  financials,
}: {
  slug: string;
  company: CompanyWithIndustry;
  customers: Customer[];
  stats: Record<string, CustomerListStats>;
  overview: ClientsOverviewMetrics;
  financials: Record<string, CustomerFinancials>;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("overview");
  const [rows, setRows] = useState(initialCustomers);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [activeQuickFilter, setActiveQuickFilter] = useState<string | null>(null);
  const [labelFilter, setLabelFilter] = useState<string>("all");
  const [labels, setLabels] = useState<CalendarLabel[]>(DEFAULT_CLIENT_LABELS);
  const [showManageLabels, setShowManageLabels] = useState(false);
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importPending, setImportPending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRows(initialCustomers);
  }, [initialCustomers]);

  useEffect(() => {
    setLabels(readClientLabels(slug));
  }, [slug]);

  const sortedRows = useMemo(
    () => [...rows].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()),
    [rows]
  );

  const idByCustomer = useMemo(() => {
    const map = new Map<string, number>();
    sortedRows.forEach((row, index) => map.set(row.id, index + 100));
    return map;
  }, [sortedRows]);

  const labelOptions = useMemo(
    () => [
      { value: "all", label: "- Quick filters -" },
      ...labels.map((label) => ({ value: label.id, label: label.name })),
    ],
    [labels]
  );

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      const rowStats = stats[row.id];
      if (activeQuickFilter === "open_projects" && (rowStats?.bookingCount ?? 0) === 0) {
        return false;
      }
      if (activeQuickFilter === "due" && (financials[row.id]?.dueCents ?? 0) <= 0) {
        return false;
      }
      if (labelFilter !== "all") {
        const label = labels.find((item) => item.id === labelFilter);
        if (label && getClientLabelForCustomer(row.id, labels)?.id !== label.id) {
          return false;
        }
      }
      if (!query) return true;
      return (
        row.name.toLowerCase().includes(query) ||
        (row.email ?? "").toLowerCase().includes(query) ||
        (row.phone ?? "").toLowerCase().includes(query) ||
        (row.notes ?? "").toLowerCase().includes(query)
      );
    });
  }, [rows, search, activeQuickFilter, labelFilter, labels, stats, financials]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageStart = (currentPage - 1) * pageSize;
  const pageRows = filteredRows.slice(pageStart, pageStart + pageSize);
  const pageEnd = Math.min(pageStart + pageRows.length, filteredRows.length);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const openCreateForm = () => {
    setEditingCustomer(null);
    setShowCustomerForm(true);
  };

  const openEditForm = (customer: Customer) => {
    setEditingCustomer(customer);
    setShowCustomerForm(true);
  };

  const closeCustomerForm = () => {
    setShowCustomerForm(false);
    setEditingCustomer(null);
  };

  const onDelete = async (customer: Customer) => {
    const rowStats = stats[customer.id];
    const linked =
      (rowStats?.bookingCount ?? 0) +
      (rowStats?.quoteCount ?? 0) +
      (rowStats?.invoiceCount ?? 0);

    if (linked > 0) {
      if (!confirm("This customer has linked bookings, quotes, or invoices and cannot be deleted.")) {
        return;
      }
      setError("This customer has linked records and cannot be deleted.");
      return;
    }

    if (!confirm("Delete this customer?")) return;

    const result = await deleteCustomer(customer.id, company.id, slug);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setRows((prev) => prev.filter((row) => row.id !== customer.id));
  };

  const onExport = () => {
    downloadCustomersCsv(filteredRows, `${slug}-clients.csv`);
  };

  const onImportClick = () => {
    setImportMessage(null);
    setError(null);
    fileInputRef.current?.click();
  };

  const onImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setImportPending(true);
    setImportMessage(null);
    setError(null);

    try {
      const csvText = await file.text();
      const result = await importCustomers(company.id, slug, csvText);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      const parts = [`Imported ${result.imported} client${result.imported === 1 ? "" : "s"}.`];
      if (result.skipped > 0) {
        parts.push(`Skipped ${result.skipped} duplicate${result.skipped === 1 ? "" : "s"}.`);
      }
      setImportMessage(parts.join(" "));
      router.refresh();
    } finally {
      setImportPending(false);
    }
  };

  const importLabel = tab === "contacts" ? "Import contacts" : "Import clients";

  return (
    <div className="px-4 py-4 sm:px-5 sm:py-5">
      <div className={riseCardClassName}>
        <div className="flex flex-col gap-4 border-b border-slate-100 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-6">
            {(
              [
                { id: "overview", label: "Overview" },
                { id: "clients", label: "Clients" },
                { id: "contacts", label: "Contacts" },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setTab(item.id);
                  setPage(1);
                }}
                className={cn(
                  "border-b-2 pb-2 text-sm font-medium transition",
                  tab === item.id
                    ? "border-slate-800 text-slate-800"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={riseOutlineButtonClassName}
              onClick={() => setShowManageLabels(true)}
            >
              <Tag className="h-4 w-4 text-slate-500" strokeWidth={1.75} />
              Manage labels
            </button>
            <button
              type="button"
              className={cn(riseOutlineButtonClassName, "bg-slate-50")}
              onClick={onImportClick}
              disabled={importPending}
            >
              <Upload className="h-4 w-4 text-slate-500" strokeWidth={1.75} />
              {importPending ? "Importing..." : importLabel}
            </button>
            <button type="button" className={riseOutlineButtonClassName} onClick={openCreateForm}>
              <Plus className="h-4 w-4 text-[#5a8dee]" strokeWidth={1.75} />
              Add client
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={onImportFile}
            />
          </div>
        </div>

        {tab === "overview" ? <OverviewTab metrics={overview} /> : null}

        {tab === "clients" || tab === "contacts" ? (
          <>
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-2.5 sm:px-5">
              <ToolbarButton>
                <Columns3 className="h-3.5 w-3.5" />
              </ToolbarButton>
              <ToolbarButton active={Boolean(activeQuickFilter)}>
                <Filter className="h-3.5 w-3.5" />
              </ToolbarButton>
              {QUICK_FILTERS.map((filter) => (
                <ToolbarButton
                  key={filter.id}
                  active={activeQuickFilter === filter.id}
                  onClick={() => {
                    setActiveQuickFilter((current) => (current === filter.id ? null : filter.id));
                    setPage(1);
                  }}
                >
                  {filter.label}
                </ToolbarButton>
              ))}
              <ToolbarButton onClick={() => router.refresh()}>
                <RefreshCw className="h-3.5 w-3.5" />
              </ToolbarButton>
              <ToolbarButton onClick={onExport} className="px-3">
                Excel
              </ToolbarButton>
              <ToolbarButton onClick={() => window.print()} className="px-3">
                <Printer className="h-3.5 w-3.5" />
                Print
              </ToolbarButton>
              {tab === "clients" ? (
                <RiseCalendarDropdown
                  value={labelFilter}
                  onChange={(value) => {
                    setLabelFilter(value);
                    setPage(1);
                  }}
                  options={labelOptions}
                  placeholder="- Quick filters -"
                  searchable
                  ariaLabel="Quick filters"
                  className="ml-1"
                />
              ) : (
                <RiseCalendarDropdown
                  value={labelFilter}
                  onChange={(value) => {
                    setLabelFilter(value);
                    setPage(1);
                  }}
                  options={labelOptions}
                  placeholder="- Quick filters -"
                  ariaLabel="Quick filters"
                  className="ml-1"
                />
              )}
              <div className="ml-auto flex min-w-[180px] items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1.5">
                <Search className="h-3.5 w-3.5 text-slate-400" strokeWidth={1.75} />
                <input
                  type="search"
                  placeholder="Search"
                  className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(1);
                  }}
                />
              </div>
              {tab === "clients" ? (
                <ToolbarButton className="ml-1">
                  <UserRound className="h-3.5 w-3.5" />
                  My Clients
                </ToolbarButton>
              ) : null}
            </div>

            {importMessage ? (
              <p className="px-5 pt-3 text-sm font-medium text-emerald-700">{importMessage}</p>
            ) : null}
            {error ? <p className="px-5 pt-3 text-sm font-medium text-red-600">{error}</p> : null}

            <div className="overflow-x-auto">
              {tab === "clients" ? (
                <table className="w-full min-w-[1100px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-500">
                      <th className="px-4 py-3 sm:px-5">ID</th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Primary contact</th>
                      <th className="px-4 py-3">Phone</th>
                      <th className="px-4 py-3">
                        <span className="inline-flex items-center gap-1">
                          Client groups
                          <ChevronDown className="h-3 w-3" />
                        </span>
                      </th>
                      <th className="px-4 py-3">Labels</th>
                      <th className="px-4 py-3">Projects</th>
                      <th className="px-4 py-3">Total invoiced</th>
                      <th className="px-4 py-3">Payment Received</th>
                      <th className="px-4 py-3">Due</th>
                      <th className="px-4 py-3 sm:pr-5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pageRows.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="px-6 py-16 text-center text-slate-500">
                          No clients match your filters.
                        </td>
                      </tr>
                    ) : (
                      pageRows.map((row) => {
                        const rowStats = stats[row.id];
                        const rowFinancials = financials[row.id];
                        const group = getClientGroup(row.id);
                        const label = getClientLabelForCustomer(row.id, labels);

                        return (
                          <tr key={row.id} className="transition hover:bg-slate-50/80">
                            <td className="px-4 py-3 text-slate-600 sm:px-5">
                              {idByCustomer.get(row.id) ?? "—"}
                            </td>
                            <td className="px-4 py-3">
                              <Link
                                href={companyCustomerPath(slug, row.id)}
                                className="font-medium text-[#4a6fd8] hover:underline"
                              >
                                {row.name}
                              </Link>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <Avatar name={row.name} className="h-7 w-7" />
                                <span className="text-slate-700">{row.name}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-600">{row.phone ?? "—"}</td>
                            <td className="px-4 py-3">
                              <span className="inline-flex items-center gap-2 text-slate-600">
                                <span
                                  className="h-2 w-2 rounded-full"
                                  style={{ backgroundColor: group.dot }}
                                />
                                {group.name}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {label ? (
                                <span
                                  className="inline-flex rounded px-2 py-0.5 text-xs font-medium text-white"
                                  style={{ backgroundColor: label.color }}
                                >
                                  {label.name}
                                </span>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {rowStats?.bookingCount ?? 0}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {formatRevenue(rowFinancials?.totalInvoicedCents ?? 0)}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {formatRevenue(rowFinancials?.paymentReceivedCents ?? 0)}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {formatRevenue(rowFinancials?.dueCents ?? 0)}
                            </td>
                            <td className="px-4 py-3 sm:pr-5">
                              <div className="flex items-center justify-end gap-1">
                                <Link
                                  href={companyCustomerPath(slug, row.id)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
                                  aria-label="View client"
                                >
                                  <FileText className="h-4 w-4" strokeWidth={1.75} />
                                </Link>
                                <button
                                  type="button"
                                  onClick={() => openEditForm(row)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
                                  aria-label="Edit client"
                                >
                                  <Pencil className="h-4 w-4" strokeWidth={1.75} />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDelete(row)}
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-red-50 hover:text-red-600"
                                  aria-label="Delete client"
                                >
                                  <X className="h-4 w-4" strokeWidth={1.75} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              ) : (
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-500">
                      <th className="px-4 py-3 sm:px-5">
                        <span className="inline-flex items-center gap-1">
                          Name
                          <ChevronDown className="h-3 w-3" />
                        </span>
                      </th>
                      <th className="px-4 py-3">Client name</th>
                      <th className="px-4 py-3">Job Title</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Phone</th>
                      <th className="px-4 py-3 sm:pr-5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {pageRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-16 text-center text-slate-500">
                          No contacts match your filters.
                        </td>
                      </tr>
                    ) : (
                      pageRows.map((row) => (
                        <tr key={row.id} className="transition hover:bg-slate-50/80">
                          <td className="px-4 py-3 sm:px-5">
                            <div className="flex items-center gap-2">
                              <Avatar name={row.name} className="h-8 w-8" />
                              <Link
                                href={companyCustomerPath(slug, row.id)}
                                className="font-medium text-[#4a6fd8] hover:underline"
                              >
                                {row.name}
                              </Link>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              href={companyCustomerPath(slug, row.id)}
                              className="text-[#4a6fd8] hover:underline"
                            >
                              {row.name}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {row.notes?.trim() ? row.notes.trim().slice(0, 48) : "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{row.email ?? "—"}</td>
                          <td className="px-4 py-3 text-slate-600">{row.phone ?? "—"}</td>
                          <td className="px-4 py-3 sm:pr-5">
                            <button
                              type="button"
                              onClick={() => onDelete(row)}
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-red-50 hover:text-red-600"
                              aria-label="Remove contact"
                            >
                              <X className="h-4 w-4" strokeWidth={1.75} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              )}
            </div>

            <PaginationFooter
              pageSize={pageSize}
              onPageSizeChange={(size) => {
                setPageSize(size);
                setPage(1);
              }}
              page={currentPage}
              totalPages={totalPages}
              totalItems={filteredRows.length}
              pageStart={pageStart}
              pageEnd={pageEnd}
              onPageChange={setPage}
            />
          </>
        ) : null}
      </div>

      <CustomerFormPopover
        open={showCustomerForm}
        onClose={closeCustomerForm}
        slug={slug}
        companyId={company.id}
        customer={editingCustomer}
      />

      <ManageLabelsModal
        open={showManageLabels}
        onClose={() => setShowManageLabels(false)}
        slug={slug}
        onLabelsChange={setLabels}
        defaultLabels={DEFAULT_CLIENT_LABELS}
        readLabels={readClientLabels}
        writeLabels={writeClientLabels}
      />
    </div>
  );
}
