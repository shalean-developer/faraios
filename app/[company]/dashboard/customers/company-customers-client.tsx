"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { Download, Pencil, Trash2, Upload } from "lucide-react";

import { deleteCustomer, importCustomers } from "@/app/actions/customers";
import { CustomerFormPopover } from "@/components/company/customer-form-popover";
import { Button } from "@/components/ui/button";
import { downloadCustomersCsv } from "@/lib/customers/csv";
import { formatRevenue } from "@/lib/operations/metrics";
import {
  companyCustomerPath,
  companyCustomerSegmentsPath,
} from "@/lib/paths/company";
import type { CustomerListStats } from "@/lib/services/customers";
import type { CompanyWithIndustry, Customer } from "@/types/database";

export function CompanyCustomersClient({
  slug,
  company,
  customers: initialCustomers,
  stats,
}: {
  slug: string;
  company: CompanyWithIndustry;
  customers: Customer[];
  stats: Record<string, CustomerListStats>;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initialCustomers);
  const [search, setSearch] = useState("");
  const [showCustomerForm, setShowCustomerForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importMessage, setImportMessage] = useState<string | null>(null);
  const [importPending, setImportPending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRows(initialCustomers);
  }, [initialCustomers]);

  const filteredRows = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;

    return rows.filter((row) => {
      return (
        row.name.toLowerCase().includes(query) ||
        (row.email ?? "").toLowerCase().includes(query) ||
        (row.phone ?? "").toLowerCase().includes(query) ||
        (row.notes ?? "").toLowerCase().includes(query)
      );
    });
  }, [rows, search]);

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

    const message =
      linked > 0
        ? `This customer has linked bookings, quotes, or invoices and cannot be deleted.`
        : "Delete this customer?";

    if (!confirm(message)) return;

    const result = await deleteCustomer(customer.id, company.id, slug);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setRows((prev) => prev.filter((row) => row.id !== customer.id));
  };

  const onExport = () => {
    downloadCustomersCsv(filteredRows, `${slug}-customers.csv`);
  };

  const onImportClick = () => {
    setImportMessage(null);
    setError(null);
    fileInputRef.current?.click();
  };

  const onImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
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

      const parts = [`Imported ${result.imported} customer${result.imported === 1 ? "" : "s"}.`];
      if (result.skipped > 0) {
        parts.push(`Skipped ${result.skipped} duplicate${result.skipped === 1 ? "" : "s"}.`);
      }
      if (result.errors.length > 0) {
        parts.push(`${result.errors.length} row${result.errors.length === 1 ? "" : "s"} failed.`);
      }
      setImportMessage(parts.join(" "));

      if (result.errors.length > 0) {
        setError(result.errors.slice(0, 3).join(" "));
      }

      router.refresh();
    } finally {
      setImportPending(false);
    }
  };

  return (
    <div className="px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
            Operations
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">Customers</h1>
          <p className="mt-2 text-sm text-slate-500">
            Customers from booking requests and manual records appear here automatically.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={onExport}
            disabled={filteredRows.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-xl"
            onClick={onImportClick}
            disabled={importPending}
          >
            <Upload className="mr-2 h-4 w-4" />
            {importPending ? "Importing..." : "Import CSV"}
          </Button>
          <Button
            type="button"
            className="shrink-0 rounded-xl"
            variant={showCustomerForm && !editingCustomer ? "outline" : "default"}
            aria-expanded={showCustomerForm && !editingCustomer}
            aria-haspopup="dialog"
            onClick={() =>
              showCustomerForm && !editingCustomer
                ? closeCustomerForm()
                : openCreateForm()
            }
          >
            Add customer
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={onImportFile}
          />
        </div>
      </header>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm sm:max-w-xs"
          placeholder="Search customers..."
        />
        <Link
          href={companyCustomerSegmentsPath(slug)}
          className="text-sm font-medium text-violet-700 hover:text-violet-900"
        >
          Customer segments →
        </Link>
      </div>

      <CustomerFormPopover
        open={showCustomerForm}
        onClose={closeCustomerForm}
        slug={slug}
        companyId={company.id}
        customer={editingCustomer}
      />

      {importMessage ? (
        <p className="mb-3 text-sm font-medium text-emerald-700">{importMessage}</p>
      ) : null}

      {error ? (
        <p className="mb-3 text-sm font-medium text-red-600">{error}</p>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Contact</th>
              <th className="hidden px-4 py-3 lg:table-cell">Added</th>
              <th className="hidden px-4 py-3 xl:table-cell">Activity</th>
              <th className="px-4 py-3">Notes</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-500">
                  {rows.length === 0
                    ? "No customers yet."
                    : "No customers match your search."}
                </td>
              </tr>
            ) : (
              filteredRows.map((row) => {
                const rowStats = stats[row.id];

                return (
                  <tr key={row.id}>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      <Link
                        href={companyCustomerPath(slug, row.id)}
                        className="text-violet-700 hover:text-violet-900"
                      >
                        {row.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <div>{row.email ?? "—"}</div>
                      {row.phone ? (
                        <div className="text-xs text-slate-400">{row.phone}</div>
                      ) : null}
                    </td>
                    <td className="hidden px-4 py-3 text-slate-600 lg:table-cell">
                      {new Date(row.created_at).toLocaleDateString("en-ZA")}
                    </td>
                    <td className="hidden px-4 py-3 text-slate-600 xl:table-cell">
                      <div>{rowStats?.bookingCount ?? 0} bookings</div>
                      {(rowStats?.quoteCount ?? 0) > 0 ? (
                        <div className="text-xs text-slate-400">
                          {rowStats?.quoteCount} quote
                          {(rowStats?.quoteCount ?? 0) === 1 ? "" : "s"}
                        </div>
                      ) : null}
                      {(rowStats?.revenueCents ?? 0) > 0 ? (
                        <div className="text-xs text-slate-400">
                          {formatRevenue(rowStats?.revenueCents ?? 0)} paid
                        </div>
                      ) : null}
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-slate-600">
                      {row.notes ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => openEditForm(row)}
                          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-violet-700"
                          aria-label="Edit customer"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(row)}
                          className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                          aria-label="Delete customer"
                        >
                          <Trash2 className="h-4 w-4" />
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
    </div>
  );
}
