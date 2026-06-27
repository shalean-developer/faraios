"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  Columns3,
  Eye,
  Filter,
  MoreHorizontal,
  Pencil,
  Plus,
  Printer,
  RefreshCw,
  Search,
  Tag,
} from "lucide-react";

import { CompanyQuoteCreateForm } from "@/app/[company]/dashboard/bookings/company-quotes-section";
import { sendQuoteAction } from "@/app/actions/quotes";
import { QUOTE_STATUSES, type QuoteStatus } from "@/lib/financial/status";
import { formatRevenue } from "@/lib/operations/metrics";
import {
  companyBookingsPath,
  companyCustomerPath,
  companyInvoicesPath,
  companyQuotePath,
} from "@/lib/paths/company";
import { cn } from "@/lib/utils";
import type { CompanyWithIndustry, Customer } from "@/types/database";
import type { QuoteWithCustomer } from "@/types/financial";

const riseCardClassName = "rounded-xl border border-slate-200 bg-white shadow-sm";
const riseOutlineButtonClassName =
  "inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50";

type StatusFilter = "all" | QuoteStatus;
type QuickFilter = "all" | "draft" | "sent";

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

function formatRiseDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function quoteStatusDisplay(status: QuoteStatus): { label: string; className: string } {
  switch (status) {
    case "draft":
      return { label: "Draft", className: "bg-amber-50 text-amber-700 ring-amber-200/80" };
    case "sent":
      return { label: "Sent", className: "bg-teal-50 text-teal-700 ring-teal-200/80" };
    case "viewed":
      return { label: "Viewed", className: "bg-sky-50 text-sky-700 ring-sky-200/80" };
    case "accepted":
      return { label: "Accepted", className: "bg-emerald-50 text-emerald-700 ring-emerald-200/80" };
    case "converted":
      return { label: "Converted", className: "bg-emerald-50 text-emerald-700 ring-emerald-200/80" };
    case "rejected":
      return { label: "Rejected", className: "bg-red-50 text-red-700 ring-red-200/80" };
    case "expired":
      return { label: "Expired", className: "bg-red-50 text-red-700 ring-red-200/80" };
  }
}

function summarizeQuotes(quotes: QuoteWithCustomer[]) {
  let draftCount = 0;
  let sentCount = 0;
  let acceptedCount = 0;
  let pipelineCents = 0;

  for (const quote of quotes) {
    if (quote.status === "draft") draftCount += 1;
    if (quote.status === "sent" || quote.status === "viewed") sentCount += 1;
    if (quote.status === "accepted" || quote.status === "converted") acceptedCount += 1;
    if (quote.status !== "rejected" && quote.status !== "expired") {
      pipelineCents += quote.total_cents;
    }
  }

  return {
    total: quotes.length,
    draftCount,
    sentCount,
    acceptedCount,
    pipelineCents,
  };
}

function downloadQuotesCsv(quotes: QuoteWithCustomer[], filename: string) {
  const header = ["Quote", "Client", "Quote date", "Valid until", "Amount", "Status"];
  const rows = quotes.map((quote) => [
    quote.quote_number,
    quote.customers?.name ?? "",
    formatRiseDate(quote.created_at),
    formatRiseDate(quote.valid_until),
    (quote.total_cents / 100).toFixed(2),
    quote.status,
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
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

export function CompanyQuotesClient({
  slug,
  company,
  quotes: initialQuotes,
  customers,
}: {
  slug: string;
  company: CompanyWithIndustry;
  quotes: QuoteWithCustomer[];
  customers: Customer[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialQuotes);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [quickFilter, setQuickFilter] = useState<QuickFilter>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [showLabelsPanel, setShowLabelsPanel] = useState(false);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<(typeof PAGE_SIZE_OPTIONS)[number]>(25);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement | null>(null);

  const summary = useMemo(() => summarizeQuotes(rows), [rows]);

  useEffect(() => {
    setRows(initialQuotes);
  }, [initialQuotes]);

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

    return rows.filter((quote) => {
      if (quickFilter === "draft" && quote.status !== "draft") return false;
      if (
        quickFilter === "sent" &&
        quote.status !== "sent" &&
        quote.status !== "viewed"
      ) {
        return false;
      }
      if (statusFilter !== "all" && quote.status !== statusFilter) return false;
      if (!query) return true;

      return (
        quote.quote_number.toLowerCase().includes(query) ||
        (quote.customers?.name ?? "").toLowerCase().includes(query) ||
        (quote.customers?.email ?? "").toLowerCase().includes(query) ||
        quote.status.replace(/_/g, " ").toLowerCase().includes(query)
      );
    });
  }, [rows, search, statusFilter, quickFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / pageSize));
  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRows.slice(start, start + pageSize);
  }, [filteredRows, page, pageSize]);

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const onSend = (quoteId: string) => {
    setOpenMenuId(null);
    setError(null);
    startTransition(async () => {
      const result = await sendQuoteAction({
        companyId: company.id,
        companySlug: slug,
        quoteId,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setRows((prev) =>
        prev.map((quote) =>
          quote.id === quoteId ? { ...quote, status: "sent" as const } : quote
        )
      );
      router.refresh();
    });
  };

  const onExport = () => {
    downloadQuotesCsv(filteredRows, `${slug}-quotes.csv`);
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
          <h1 className="text-lg font-medium text-slate-800">Quotes</h1>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className={riseOutlineButtonClassName}
              onClick={() => setShowLabelsPanel((value) => !value)}
            >
              <Tag className="h-4 w-4 text-slate-500" strokeWidth={1.75} />
              Manage labels
            </button>
            <Link
              href={`${companyBookingsPath(slug)}/quote-requests`}
              className={riseOutlineButtonClassName}
            >
              Quote requests
            </Link>
            <button
              type="button"
              className={riseOutlineButtonClassName}
              aria-expanded={showQuoteForm}
              onClick={() => setShowQuoteForm((open) => !open)}
            >
              <Plus className="h-4 w-4 text-[#5a8dee]" strokeWidth={1.75} />
              Add quote
            </button>
          </div>
        </div>

        {showLabelsPanel ? (
          <div className="border-b border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Quote labels will be available in a future update. Use filters below to organize
            your pipeline.
          </div>
        ) : null}

        {showQuoteForm ? (
          <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-4 sm:px-5">
            <CompanyQuoteCreateForm
              slug={slug}
              companyId={company.id}
              customers={customers}
              embedded
              onSuccess={() => {
                setShowQuoteForm(false);
                router.refresh();
              }}
            />
          </div>
        ) : null}

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
                    {QUOTE_STATUSES.map((status) => (
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
                active={quickFilter === "all"}
                onClick={() => {
                  setQuickFilter("all");
                  setPage(1);
                }}
              >
                All
              </ToolbarButton>
              <ToolbarButton
                active={quickFilter === "draft"}
                onClick={() => {
                  setQuickFilter("draft");
                  setPage(1);
                }}
              >
                Draft
              </ToolbarButton>
              <ToolbarButton
                active={quickFilter === "sent"}
                onClick={() => {
                  setQuickFilter("sent");
                  setPage(1);
                }}
              >
                Sent
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
                { label: "Total quotes", value: String(summary.total) },
                { label: "Draft", value: String(summary.draftCount) },
                { label: "Sent / viewed", value: String(summary.sentCount) },
                { label: "Pipeline value", value: formatRevenue(summary.pipelineCents) },
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
              <table className="w-full min-w-[960px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-500">
                    <th className="px-4 py-3 font-medium sm:px-5">Quote</th>
                    <th className="px-4 py-3 font-medium">Client</th>
                    <th className="px-4 py-3 font-medium">Quote date</th>
                    <th className="px-4 py-3 font-medium">Valid until</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium sm:pr-5" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {pageRows.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center text-slate-500">
                        {rows.length === 0
                          ? "No quotes yet. Use Add quote to create your first estimate."
                          : "No quotes match your filters."}
                      </td>
                    </tr>
                  ) : (
                    pageRows.map((quote) => {
                      const statusMeta = quoteStatusDisplay(quote.status);

                      return (
                        <tr key={quote.id} className="transition hover:bg-slate-50/80">
                          <td className="px-4 py-3 sm:px-5">
                            <Link
                              href={companyQuotePath(slug, quote.id)}
                              className="font-medium text-[#4a6fd8] hover:underline"
                            >
                              {quote.quote_number}
                            </Link>
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              href={companyCustomerPath(slug, quote.customer_id)}
                              className="text-slate-800 hover:text-[#4a6fd8]"
                            >
                              {quote.customers?.name ?? "—"}
                            </Link>
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {formatRiseDate(quote.created_at)}
                          </td>
                          <td className="px-4 py-3 text-slate-600">
                            {formatRiseDate(quote.valid_until)}
                          </td>
                          <td className="px-4 py-3 text-slate-800">
                            {formatRevenue(quote.total_cents)}
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
                          <td className="px-4 py-3 sm:pr-5">
                            <div className="flex items-center justify-end gap-1">
                              <Link
                                href={companyQuotePath(slug, quote.id)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
                                aria-label="View quote"
                              >
                                <Eye className="h-4 w-4" />
                              </Link>
                              <Link
                                href={companyQuotePath(slug, quote.id)}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
                                aria-label="Edit quote"
                              >
                                <Pencil className="h-4 w-4" />
                              </Link>
                              <div className="relative">
                                <button
                                  type="button"
                                  className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100"
                                  aria-label="Quote actions"
                                  onClick={() =>
                                    setOpenMenuId((current) =>
                                      current === quote.id ? null : quote.id
                                    )
                                  }
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </button>
                                {openMenuId === quote.id ? (
                                  <div
                                    ref={menuRef}
                                    className="absolute right-0 top-full z-20 mt-1 w-40 rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
                                  >
                                    <Link
                                      href={companyQuotePath(slug, quote.id)}
                                      className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                      onClick={() => setOpenMenuId(null)}
                                    >
                                      View quote
                                    </Link>
                                    {quote.status === "draft" ? (
                                      <button
                                        type="button"
                                        className="block w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                                        disabled={pending}
                                        onClick={() => onSend(quote.id)}
                                      >
                                        Send quote
                                      </button>
                                    ) : null}
                                    {quote.converted_invoice_id ? (
                                      <Link
                                        href={companyInvoicesPath(slug)}
                                        className="block px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                                        onClick={() => setOpenMenuId(null)}
                                      >
                                        View invoice
                                      </Link>
                                    ) : null}
                                  </div>
                                ) : null}
                              </div>
                            </div>
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
                Showing {pageRows.length} of {filteredRows.length} quote
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
      </div>
    </div>
  );
}
