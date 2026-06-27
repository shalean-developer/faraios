"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Columns3,
  Filter,
  MoreHorizontal,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Tag,
} from "lucide-react";

import {
  cancelDraftInvoiceAction,
  issueInvoiceAction,
} from "@/app/actions/invoices";
import { InvoiceFormPopover } from "@/components/company/invoice-form-popover";
import { downloadInvoicesCsv } from "@/lib/financial/invoices-csv";
import { INVOICE_STATUSES, type InvoiceStatus } from "@/lib/financial/status";
import { formatRevenue } from "@/lib/operations/metrics";
import {
  companyCustomerPath,
  companyInvoicePath,
  companyPaymentsPath,
} from "@/lib/paths/company";
import type { InvoiceListSummary } from "@/lib/services/invoices";
import { cn } from "@/lib/utils";
import type { CompanyService, CompanyWithIndustry, Customer } from "@/types/database";
import type { InvoiceWithCustomer } from "@/types/financial";

const riseCardClassName = "rounded-xl border border-slate-200 bg-white shadow-sm";
const riseOutlineButtonClassName =
  "inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50";

type StatusFilter = "all" | InvoiceStatus;
type InvoiceTab = "invoices" | "recurring";
type ListMode = "invoices" | "credit_notes";

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

function formatRiseDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function invoiceStatusDisplay(status: InvoiceStatus): { label: string; className: string } {
  switch (status) {
    case "paid":
      return {
        label: "Fully paid",
        className: "bg-sky-50 text-sky-700 ring-sky-200/80",
      };
    case "overdue":
      return {
        label: "Overdue",
        className: "bg-red-50 text-red-700 ring-red-200/80",
      };
    case "partially_paid":
      return {
        label: "Partially paid",
        className: "bg-amber-50 text-amber-700 ring-amber-200/80",
      };
    case "issued":
      return {
        label: "Not paid",
        className: "bg-amber-50 text-amber-700 ring-amber-200/80",
      };
    case "draft":
      return {
        label: "Draft",
        className: "bg-slate-100 text-slate-600 ring-slate-200/80",
      };
    case "cancelled":
      return {
        label: "Cancelled",
        className: "bg-slate-100 text-slate-600 ring-slate-200/80",
      };
    case "refunded":
      return {
        label: "Refunded",
        className: "bg-slate-100 text-slate-600 ring-slate-200/80",
      };
  }
}

function projectLabel(invoice: InvoiceWithCustomer): string {
  if (invoice.notes?.trim()) {
    const line = invoice.notes.trim().split("\n")[0] ?? "";
    return line.length > 42 ? `${line.slice(0, 42)}…` : line;
  }
  if (invoice.booking_id) return "Linked booking";
  if (invoice.quote_id) return "From quote";
  return "—";
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

export function CompanyInvoicesClient({
  slug,
  company,
  invoices: initialInvoices,
  summary,
  customers,
  services,
}: {
  slug: string;
  company: CompanyWithIndustry;
  invoices: InvoiceWithCustomer[];
  summary: InvoiceListSummary;
  customers: Customer[];
  services: CompanyService[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialInvoices);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [activeTab, setActiveTab] = useState<InvoiceTab>("invoices");
  const [listMode, setListMode] = useState<ListMode>("invoices");
  const [showFilters, setShowFilters] = useState(false);
  const [showLabelsPanel, setShowLabelsPanel] = useState(false);
  const [showInvoiceForm, setShowInvoiceForm] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(25);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setRows(initialInvoices);
  }, [initialInvoices]);

  useEffect(() => {
    if (!openMenuId) return;
    const onPointerDown = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [openMenuId]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return rows.filter((invoice) => {
      if (listMode === "credit_notes" && invoice.total_cents >= 0) return false;
      if (listMode === "invoices" && invoice.total_cents < 0) return false;
      if (statusFilter !== "all" && invoice.status !== statusFilter) return false;
      if (!query) return true;

      return (
        invoice.invoice_number.toLowerCase().includes(query) ||
        (invoice.customers?.name ?? "").toLowerCase().includes(query) ||
        (invoice.customers?.email ?? "").toLowerCase().includes(query) ||
        projectLabel(invoice).toLowerCase().includes(query) ||
        invoice.status.replace(/_/g, " ").toLowerCase().includes(query)
      );
    });
  }, [rows, search, statusFilter, listMode]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const onIssue = (invoiceId: string) => {
    setOpenMenuId(null);
    setError(null);
    startTransition(async () => {
      const result = await issueInvoiceAction({
        companyId: company.id,
        companySlug: slug,
        invoiceId,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  const onCancelDraft = (invoiceId: string) => {
    setOpenMenuId(null);
    if (!window.confirm("Cancel this draft invoice?")) return;
    setError(null);
    startTransition(async () => {
      const result = await cancelDraftInvoiceAction({
        companyId: company.id,
        companySlug: slug,
        invoiceId,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  const onExport = () => {
    downloadInvoicesCsv(filteredRows, `${slug}-invoices.csv`);
  };

  const onPrint = () => {
    window.print();
  };

  const onRefresh = () => {
    router.refresh();
  };

  return (
    <div className="px-4 py-4 sm:px-5 sm:py-5">
      <div className={riseCardClassName}>
        <div className="flex flex-col gap-4 border-b border-slate-100 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-6">
            {(
              [
                { id: "invoices", label: "Invoices" },
                { id: "recurring", label: "Recurring invoices" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setActiveTab(tab.id);
                  setPage(1);
                }}
                className={cn(
                  "border-b-2 pb-2 text-sm font-medium transition",
                  activeTab === tab.id
                    ? "border-[#5a8dee] text-[#4a6fd8]"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === "invoices" ? (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={riseOutlineButtonClassName}
                onClick={() => setShowLabelsPanel((value) => !value)}
              >
                <Tag className="h-4 w-4 text-slate-500" strokeWidth={1.75} />
                Manage labels
              </button>
              <Link href={companyPaymentsPath(slug)} className={riseOutlineButtonClassName}>
                Add payment
              </Link>
              <button
                type="button"
                className={riseOutlineButtonClassName}
                aria-expanded={showInvoiceForm}
                aria-haspopup="dialog"
                onClick={() => setShowInvoiceForm((open) => !open)}
              >
                <Plus className="h-4 w-4 text-[#5a8dee]" strokeWidth={1.75} />
                Add invoice
              </button>
            </div>
          ) : null}
        </div>

        {showLabelsPanel ? (
          <div className="border-b border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Invoice labels will be available in a future update. Use status filters below to
            organize your list.
          </div>
        ) : null}

        {activeTab === "recurring" ? (
          <div className="px-4 py-16 text-center text-sm text-slate-500 sm:px-6">
            Recurring invoices are coming soon. Create one-off invoices from the Invoices tab.
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-2.5 sm:px-5">
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
                    <button
                      type="button"
                      onClick={() => {
                        setStatusFilter("all");
                        setPage(1);
                      }}
                      className={cn(
                        "flex w-full rounded-md px-2 py-1.5 text-left text-sm transition hover:bg-slate-50",
                        statusFilter === "all" && "bg-[#eef2ff] text-[#4a6fd8]"
                      )}
                    >
                      All statuses
                    </button>
                    {INVOICE_STATUSES.map((status) => (
                      <button
                        key={status}
                        type="button"
                        onClick={() => {
                          setStatusFilter(status);
                          setPage(1);
                        }}
                        className={cn(
                          "flex w-full rounded-md px-2 py-1.5 text-left text-sm capitalize transition hover:bg-slate-50",
                          statusFilter === status && "bg-[#eef2ff] text-[#4a6fd8]"
                        )}
                      >
                        {status.replace(/_/g, " ")}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <ToolbarButton>
                <Plus className="h-3.5 w-3.5" />
              </ToolbarButton>
              <ToolbarButton
                active={listMode === "credit_notes"}
                onClick={() => {
                  setListMode("credit_notes");
                  setPage(1);
                }}
              >
                Credit notes
              </ToolbarButton>
              <ToolbarButton
                active={listMode === "invoices"}
                onClick={() => {
                  setListMode("invoices");
                  setPage(1);
                }}
              >
                Invoices
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
              <div className="ml-auto flex min-w-[180px] items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1.5">
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

            <div className="grid gap-3 border-b border-slate-100 bg-slate-50/60 px-4 py-3 sm:grid-cols-4 sm:px-5">
              {[
                { label: "Total invoices", value: String(summary.total) },
                { label: "Outstanding", value: formatRevenue(summary.outstandingCents) },
                { label: "Overdue", value: formatRevenue(summary.overdueCents) },
                { label: "Collected", value: formatRevenue(summary.paidCents) },
              ].map((card) => (
                <div key={card.label} className="text-sm">
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                    {card.label}
                  </p>
                  <p className="mt-0.5 font-semibold text-slate-800">{card.value}</p>
                </div>
              ))}
            </div>

            {error ? (
              <p className="px-4 py-3 text-sm font-medium text-red-600 sm:px-5">{error}</p>
            ) : null}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-500">
                    <th className="px-4 py-3 font-medium sm:px-5">Invoice ID</th>
                    <th className="px-4 py-3 font-medium">Client</th>
                    <th className="px-4 py-3 font-medium">Project</th>
                    <th className="px-4 py-3 font-medium">Bill date</th>
                    <th className="px-4 py-3 font-medium">Due date</th>
                    <th className="px-4 py-3 font-medium">Total invoiced</th>
                    <th className="px-4 py-3 font-medium">Payment received</th>
                    <th className="px-4 py-3 font-medium">Due</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium sm:pr-5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pageRows.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="px-6 py-16 text-center text-slate-500">
                        {rows.length === 0
                          ? "No invoices yet. Use Add invoice to create your first invoice."
                          : listMode === "credit_notes"
                            ? "No credit notes found."
                            : "No invoices match your filters."}
                      </td>
                    </tr>
                  ) : (
                    pageRows.map((invoice) => {
                      const statusMeta = invoiceStatusDisplay(invoice.status);
                      const isCredit = invoice.total_cents < 0;

                      return (
                        <tr key={invoice.id} className="transition hover:bg-slate-50/80">
                          <td className="px-4 py-3 sm:px-5">
                            <Link
                              href={companyInvoicePath(slug, invoice.id)}
                              className={cn(
                                "font-medium hover:underline",
                                isCredit ? "text-red-600" : "text-[#4a6fd8]"
                              )}
                            >
                              {invoice.invoice_number}
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              href={companyCustomerPath(slug, invoice.customer_id)}
                              className="text-slate-800 hover:text-[#4a6fd8]"
                            >
                              {invoice.customers?.name ?? "—"}
                            </Link>
                          </td>
                          <td className="max-w-[180px] truncate px-4 py-3 text-slate-600">
                            {projectLabel(invoice)}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {formatRiseDate(invoice.issued_at ?? invoice.created_at)}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {formatRiseDate(invoice.due_date)}
                          </td>
                          <td className="px-4 py-3 text-slate-800">
                            {formatRevenue(invoice.total_cents)}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {formatRevenue(invoice.amount_paid_cents)}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {formatRevenue(invoice.balance_due_cents)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset",
                                statusMeta.className
                              )}
                            >
                              {statusMeta.label}
                            </span>
                          </td>
                          <td className="relative px-4 py-3 sm:pr-5">
                            <button
                              type="button"
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
                              aria-label="Invoice actions"
                              onClick={() =>
                                setOpenMenuId((current) =>
                                  current === invoice.id ? null : invoice.id
                                )
                              }
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                            {openMenuId === invoice.id ? (
                              <div
                                ref={menuRef}
                                className="absolute right-4 top-full z-20 mt-1 w-40 rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
                              >
                                <Link
                                  href={companyInvoicePath(slug, invoice.id)}
                                  className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                  onClick={() => setOpenMenuId(null)}
                                >
                                  View invoice
                                </Link>
                                {invoice.status === "draft" ? (
                                  <>
                                    <button
                                      type="button"
                                      className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                                      disabled={pending}
                                      onClick={() => onIssue(invoice.id)}
                                    >
                                      Issue invoice
                                    </button>
                                    <button
                                      type="button"
                                      className="block w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                                      disabled={pending}
                                      onClick={() => onCancelDraft(invoice.id)}
                                    >
                                      Cancel draft
                                    </button>
                                  </>
                                ) : null}
                              </div>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p>
                Showing {pageRows.length} of {filteredRows.length} invoice
                {filteredRows.length === 1 ? "" : "s"}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex items-center gap-2 text-xs">
                  Rows
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value) as (typeof PAGE_SIZE_OPTIONS)[number]);
                      setPage(1);
                    }}
                    className="rounded-md border border-slate-200 px-2 py-1 text-sm"
                  >
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className="rounded-md border border-slate-200 px-2 py-1 text-xs disabled:opacity-40"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <span className="text-xs">
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  className="rounded-md border border-slate-200 px-2 py-1 text-xs disabled:opacity-40"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <InvoiceFormPopover
        open={showInvoiceForm}
        onClose={() => setShowInvoiceForm(false)}
        slug={slug}
        companyId={company.id}
        customers={customers}
        services={services}
      />
    </div>
  );
}
