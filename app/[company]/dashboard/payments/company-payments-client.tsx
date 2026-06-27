"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Plus,
  Printer,
  Search,
  X,
} from "lucide-react";

import { RiseCalendarDropdown } from "@/components/company/event-calendar/rise-calendar-dropdown";
import { downloadPaymentsCsv } from "@/lib/financial/payments-csv";
import { PAYMENT_PROVIDERS, type PaymentProvider } from "@/lib/financial/status";
import { formatRevenue } from "@/lib/operations/metrics";
import { companyInvoicePath, companyInvoicesPath } from "@/lib/paths/company";
import { cn } from "@/lib/utils";
import type { CompanyWithIndustry, Project } from "@/types/database";
import type { PaymentWithRelations } from "@/types/financial";

const riseCardClassName = "rounded-xl border border-slate-200 bg-white shadow-sm";
const riseOutlineButtonClassName =
  "inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50";

type PaymentTab = "list" | "chart";
type PeriodMode = "monthly" | "yearly" | "custom" | "dynamic";
type SortField = "date" | "amount";
type SortDir = "asc" | "desc";

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

const PAYMENT_METHOD_LABELS: Record<PaymentProvider, string> = {
  paystack: "Paystack",
  payfast: "PayFast",
  eft: "Bank transfer",
  cash: "Cash",
  stripe: "Stripe",
  ozow: "Ozow",
  peach: "Peach Payments",
  yoco: "Yoco",
};

function formatRiseDate(value: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
}

function paymentDate(payment: PaymentWithRelations): Date {
  return new Date(payment.paid_at ?? payment.created_at);
}

function paymentMethodLabel(provider: PaymentProvider): string {
  return PAYMENT_METHOD_LABELS[provider] ?? provider;
}

function PaymentChartTooltip({
  active,
  payload,
  currency,
}: {
  active?: boolean;
  payload?: { value?: number }[];
  currency: string;
}) {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value ?? 0;
  return (
    <div className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm">
      <p className="font-medium text-slate-800">
        {formatRevenue(Math.round(value * 100), currency)}
      </p>
    </div>
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

function PeriodToggle({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-md px-3 py-1.5 text-sm transition",
        active
          ? "bg-[#5a8dee] font-medium text-white"
          : "text-slate-600 hover:bg-slate-100"
      )}
    >
      {label}
    </button>
  );
}

export function CompanyPaymentsClient({
  slug,
  payments: initialPayments,
  projects = [],
}: {
  slug: string;
  company: CompanyWithIndustry;
  payments: PaymentWithRelations[];
  projects?: Project[];
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialPayments);
  const [activeTab, setActiveTab] = useState<PaymentTab>("list");
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [currencyFilter, setCurrencyFilter] = useState<string>("all");
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const [periodMode, setPeriodMode] = useState<PeriodMode>("monthly");
  const [focusMonth, setFocusMonth] = useState(() => new Date().getMonth());
  const [focusYear, setFocusYear] = useState(() => new Date().getFullYear());
  const [chartYear, setChartYear] = useState(() => new Date().getFullYear());
  const [chartCurrency, setChartCurrency] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  useEffect(() => {
    setRows(initialPayments);
  }, [initialPayments]);

  const receivedRows = useMemo(
    () => rows.filter((payment) => payment.status === "paid"),
    [rows]
  );

  const currencyOptions = useMemo(() => {
    const currencies = [...new Set(receivedRows.map((p) => p.currency || "ZAR"))].sort();
    return [
      { value: "all", label: "- Currency -" },
      ...currencies.map((currency) => ({ value: currency, label: currency })),
    ];
  }, [receivedRows]);

  const methodOptions = useMemo(
    () => [
      { value: "all", label: "- Payment method -" },
      ...PAYMENT_PROVIDERS.map((provider) => ({
        value: provider,
        label: paymentMethodLabel(provider),
      })),
    ],
    []
  );

  const projectOptions = useMemo(
    () => [
      { value: "all", label: "- Project -" },
      ...projects.map((project) => ({ value: project.id, label: project.name })),
    ],
    [projects]
  );

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();

    return receivedRows.filter((payment) => {
      if (methodFilter !== "all" && payment.provider !== methodFilter) return false;
      if (currencyFilter !== "all" && (payment.currency || "ZAR") !== currencyFilter) {
        return false;
      }
      if (projectFilter !== "all" && payment.booking_id !== projectFilter) return false;

      const date = paymentDate(payment);
      if (periodMode === "monthly") {
        if (date.getMonth() !== focusMonth || date.getFullYear() !== focusYear) return false;
      } else if (periodMode === "yearly") {
        if (date.getFullYear() !== focusYear) return false;
      } else if (periodMode === "custom" || periodMode === "dynamic") {
        if (date.getFullYear() !== focusYear) return false;
      }

      if (!query) return true;

      return (
        (payment.invoices?.invoice_number ?? "").toLowerCase().includes(query) ||
        paymentMethodLabel(payment.provider).toLowerCase().includes(query) ||
        (payment.notes ?? "").toLowerCase().includes(query) ||
        formatRevenue(payment.amount_cents, payment.currency || "ZAR")
          .toLowerCase()
          .includes(query)
      );
    });
  }, [
    receivedRows,
    search,
    methodFilter,
    currencyFilter,
    projectFilter,
    periodMode,
    focusMonth,
    focusYear,
  ]);

  const sortedRows = useMemo(() => {
    const sorted = [...filteredRows];
    sorted.sort((a, b) => {
      let cmp = 0;
      if (sortField === "date") {
        cmp = paymentDate(a).getTime() - paymentDate(b).getTime();
      } else {
        cmp = a.amount_cents - b.amount_cents;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [filteredRows, sortField, sortDir]);

  const chartData = useMemo(() => {
    const totals = Array.from({ length: 12 }, () => 0);

    for (const payment of receivedRows) {
      if (chartCurrency !== "all" && (payment.currency || "ZAR") !== chartCurrency) continue;
      const date = paymentDate(payment);
      if (date.getFullYear() !== chartYear) continue;
      totals[date.getMonth()] += payment.amount_cents;
    }

    return MONTH_LABELS.map((month, index) => ({
      month,
      amount: totals[index] / 100,
    }));
  }, [receivedRows, chartYear, chartCurrency]);

  const chartCurrencyOptions = useMemo(
    () => [
      { value: "all", label: "Currency" },
      ...currencyOptions.filter((option) => option.value !== "all"),
    ],
    [currencyOptions]
  );

  const periodLabel = useMemo(() => {
    if (periodMode === "monthly") {
      return new Date(focusYear, focusMonth, 1).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });
    }
    return String(focusYear);
  }, [periodMode, focusMonth, focusYear]);

  const goPreviousPeriod = () => {
    if (periodMode === "monthly") {
      if (focusMonth === 0) {
        setFocusMonth(11);
        setFocusYear((year) => year - 1);
      } else {
        setFocusMonth((month) => month - 1);
      }
      return;
    }
    setFocusYear((year) => year - 1);
  };

  const goNextPeriod = () => {
    if (periodMode === "monthly") {
      if (focusMonth === 11) {
        setFocusMonth(0);
        setFocusYear((year) => year + 1);
      } else {
        setFocusMonth((month) => month + 1);
      }
      return;
    }
    setFocusYear((year) => year + 1);
  };

  const resetPeriod = () => {
    const now = new Date();
    setFocusMonth(now.getMonth());
    setFocusYear(now.getFullYear());
    setMethodFilter("all");
    setCurrencyFilter("all");
    setProjectFilter("all");
    setSearch("");
  };

  const applyPeriod = () => {
    router.refresh();
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
      return;
    }
    setSortField(field);
    setSortDir("asc");
  };

  const onExport = () => {
    downloadPaymentsCsv(sortedRows, `${slug}-payments.csv`);
  };

  const onPrint = () => {
    window.print();
  };

  return (
    <div className="px-4 py-4 sm:px-5 sm:py-5">
      <div className={riseCardClassName}>
        <div className="flex flex-col gap-4 border-b border-slate-100 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-lg font-medium text-slate-800">Payment Received</h1>
            <div className="mt-3 flex gap-6">
              {(
                [
                  { id: "list", label: "List" },
                  { id: "chart", label: "Chart" },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
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
          </div>

          <Link href={companyInvoicesPath(slug)} className={riseOutlineButtonClassName}>
            <Plus className="h-4 w-4 text-[#5a8dee]" strokeWidth={1.75} />
            Add payment
          </Link>
        </div>

        {activeTab === "list" ? (
          <>
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-2.5 sm:px-5">
              <ToolbarButton onClick={onExport} className="px-3">
                Excel
              </ToolbarButton>
              <ToolbarButton onClick={onPrint} className="px-3">
                <Printer className="h-3.5 w-3.5" />
                Print
              </ToolbarButton>
              <div className="ml-auto flex min-w-[180px] items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1.5">
                <Search className="h-3.5 w-3.5 text-slate-400" strokeWidth={1.75} />
                <input
                  type="search"
                  placeholder="Search"
                  className="w-full bg-transparent text-sm text-slate-700 outline-none placeholder:text-slate-400"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-2.5 sm:px-5">
              <RiseCalendarDropdown
                value={methodFilter}
                onChange={setMethodFilter}
                options={methodOptions}
                placeholder="- Payment method -"
                ariaLabel="Payment method"
              />
              <RiseCalendarDropdown
                value={currencyFilter}
                onChange={setCurrencyFilter}
                options={currencyOptions}
                placeholder="- Currency -"
                ariaLabel="Currency"
              />
              <RiseCalendarDropdown
                value={projectFilter}
                onChange={setProjectFilter}
                options={projectOptions}
                placeholder="- Project -"
                searchable
                ariaLabel="Project"
              />
            </div>

            <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <div className="inline-flex flex-wrap gap-1 rounded-md border border-slate-200 bg-white p-1">
                <PeriodToggle
                  label="Monthly"
                  active={periodMode === "monthly"}
                  onClick={() => setPeriodMode("monthly")}
                />
                <PeriodToggle
                  label="Yearly"
                  active={periodMode === "yearly"}
                  onClick={() => setPeriodMode("yearly")}
                />
                <PeriodToggle
                  label="Custom"
                  active={periodMode === "custom"}
                  onClick={() => setPeriodMode("custom")}
                />
                <PeriodToggle
                  label="Dynamic"
                  active={periodMode === "dynamic"}
                  onClick={() => setPeriodMode("dynamic")}
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={goPreviousPeriod}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
                  aria-label="Previous period"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="min-w-[120px] text-center text-sm font-medium text-slate-700">
                  {periodLabel}
                </span>
                <button
                  type="button"
                  onClick={goNextPeriod}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
                  aria-label="Next period"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={applyPeriod}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                  aria-label="Apply period"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={resetPeriod}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
                  aria-label="Clear filters"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-500">
                    <th className="px-4 py-3 font-medium sm:px-5">Invoice ID</th>
                    <th className="px-4 py-3 font-medium">
                      <button
                        type="button"
                        onClick={() => toggleSort("date")}
                        className="inline-flex items-center gap-1 hover:text-slate-700"
                      >
                        Payment date
                        <ChevronDown
                          className={cn(
                            "h-3 w-3 transition",
                            sortField === "date" && sortDir === "asc" && "rotate-180"
                          )}
                        />
                      </button>
                    </th>
                    <th className="px-4 py-3 font-medium">Payment method</th>
                    <th className="px-4 py-3 font-medium">Note</th>
                    <th className="px-4 py-3 font-medium sm:pr-5">
                      <button
                        type="button"
                        onClick={() => toggleSort("amount")}
                        className="inline-flex items-center gap-1 hover:text-slate-700"
                      >
                        Amount
                        <ChevronDown
                          className={cn(
                            "h-3 w-3 transition",
                            sortField === "amount" && sortDir === "asc" && "rotate-180"
                          )}
                        />
                      </button>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sortedRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-16 text-center text-slate-500">
                        {receivedRows.length === 0
                          ? "No payments received yet. Payments appear when customers pay invoices."
                          : "No payments match your filters."}
                      </td>
                    </tr>
                  ) : (
                    sortedRows.map((payment) => (
                      <tr key={payment.id} className="transition hover:bg-slate-50/80">
                        <td className="px-4 py-3 sm:px-5">
                          <Link
                            href={companyInvoicePath(slug, payment.invoice_id)}
                            className="font-medium text-[#4a6fd8] hover:underline"
                          >
                            {payment.invoices?.invoice_number ?? "—"}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {formatRiseDate(payment.paid_at ?? payment.created_at)}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {paymentMethodLabel(payment.provider)}
                        </td>
                        <td className="max-w-xs truncate px-4 py-3 text-slate-600">
                          {payment.notes?.trim() || "—"}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800 sm:pr-5">
                          {formatRevenue(payment.amount_cents, payment.currency || "ZAR")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="px-4 py-5 sm:px-5">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <RiseCalendarDropdown
                value={chartCurrency}
                onChange={setChartCurrency}
                options={chartCurrencyOptions}
                placeholder="Currency"
                ariaLabel="Chart currency"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setChartYear((year) => year - 1)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
                  aria-label="Previous year"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="min-w-[56px] text-center text-sm font-medium text-slate-700">
                  {chartYear}
                </span>
                <button
                  type="button"
                  onClick={() => setChartYear((year) => year + 1)}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 text-slate-500 hover:bg-slate-50"
                  aria-label="Next year"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="h-[360px] w-full">
              {chartData.every((point) => point.amount === 0) ? (
                <p className="py-16 text-center text-sm text-slate-500">
                  No payment data for {chartYear}.
                </p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12, fill: "#64748b" }}
                      axisLine={{ stroke: "#e2e8f0" }}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "#64748b" }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(value: number) =>
                        new Intl.NumberFormat("en-US", {
                          notation: "compact",
                          maximumFractionDigits: 0,
                        }).format(value)
                      }
                    />
                    <Tooltip
                      content={
                        <PaymentChartTooltip
                          currency={chartCurrency === "all" ? "ZAR" : chartCurrency}
                        />
                      }
                    />
                    <Bar dataKey="amount" fill="#93c5fd" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="mt-4 flex justify-center">
              <span className="inline-flex items-center gap-2 text-xs text-slate-500">
                <span className="h-3 w-3 rounded-sm bg-[#93c5fd]" />
                Payments received
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
