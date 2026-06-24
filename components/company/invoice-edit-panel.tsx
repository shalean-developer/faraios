"use client";

import { type FormEvent, useMemo, useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { formatPriceInput } from "@/lib/operations/metrics";
import type { InvoiceLineItem } from "@/types/financial";
import type { DepositType } from "@/lib/financial/status";

type LineItemRow = {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
};

function rowsFromLineItems(items: InvoiceLineItem[]): LineItemRow[] {
  return items.map((li) => ({
    id: li.id,
    description: li.description,
    quantity: String(li.quantity),
    unitPrice: formatPriceInput(li.unit_price_cents),
  }));
}

function emptyRow(): LineItemRow {
  return {
    id: crypto.randomUUID(),
    description: "",
    quantity: "1",
    unitPrice: "",
  };
}

export function InvoiceEditPanel({
  slug,
  companyId,
  invoiceId,
  lineItems,
  notes,
  dueDate,
  discountCents,
  taxCents,
  depositType,
  depositValue,
  onSaved,
  onCancel,
  saveAction,
}: {
  slug: string;
  companyId: string;
  invoiceId: string;
  lineItems: InvoiceLineItem[];
  notes: string | null;
  dueDate: string | null;
  discountCents: number;
  taxCents: number;
  depositType: DepositType;
  depositValue: number;
  onSaved: () => void;
  onCancel: () => void;
  saveAction: typeof import("@/app/actions/invoices").updateDraftInvoiceAction;
}) {
  const [rows, setRows] = useState<LineItemRow[]>(() => rowsFromLineItems(lineItems));
  const [notesValue, setNotesValue] = useState(notes ?? "");
  const [dueDateValue, setDueDateValue] = useState(dueDate?.slice(0, 10) ?? "");
  const [discount, setDiscount] = useState(formatPriceInput(discountCents));
  const [tax, setTax] = useState(formatPriceInput(taxCents));
  const [depositTypeValue, setDepositTypeValue] = useState<DepositType>(depositType);
  const [depositValueInput, setDepositValueInput] = useState(String(depositValue));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const estimatedTotal = useMemo(() => {
    const subtotal = rows.reduce((sum, row) => {
      const q = Number.parseFloat(row.quantity || "0");
      const unit = Math.round(Number.parseFloat(row.unitPrice || "0") * 100);
      if (!Number.isFinite(q) || !Number.isFinite(unit)) return sum;
      return sum + Math.round(q * unit);
    }, 0);
    const discountC = Math.round(Number.parseFloat(discount || "0") * 100);
    const taxC = Math.round(Number.parseFloat(tax || "0") * 100);
    return Math.max(0, subtotal - discountC + taxC);
  }, [rows, discount, tax]);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsedItems = rows
      .map((row) => ({
        description: row.description.trim(),
        quantity: Number.parseFloat(row.quantity || "0"),
        unitPriceCents: Math.round(Number.parseFloat(row.unitPrice || "0") * 100),
      }))
      .filter((row) => row.description && row.unitPriceCents > 0);

    if (parsedItems.length === 0) {
      setError("Add at least one line item with a description and price.");
      return;
    }

    startTransition(async () => {
      const result = await saveAction({
        companyId,
        companySlug: slug,
        invoiceId,
        lineItems: parsedItems,
        discountCents: Math.round(Number.parseFloat(discount || "0") * 100),
        taxCents: Math.round(Number.parseFloat(tax || "0") * 100),
        notes: notesValue,
        dueDate: dueDateValue || undefined,
        depositType: depositTypeValue,
        depositValue: Number.parseFloat(depositValueInput || "0"),
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onSaved();
    });
  };

  return (
    <form
      onSubmit={onSubmit}
      className="mb-8 rounded-2xl border border-violet-200 bg-violet-50/40 p-6"
    >
      <h2 className="text-base font-semibold text-slate-900">Edit draft invoice</h2>
      <p className="mt-1 text-sm text-slate-500">
        Update line items before issuing. Only draft invoices can be edited.
      </p>

      <div className="mt-4 space-y-3">
        {rows.map((row) => (
          <div key={row.id} className="grid gap-2 sm:grid-cols-12 sm:items-end">
            <label className="sm:col-span-5 block text-sm">
              <span className="font-medium text-slate-700">Description</span>
              <input
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                value={row.description}
                onChange={(e) =>
                  setRows((prev) =>
                    prev.map((r) =>
                      r.id === row.id ? { ...r, description: e.target.value } : r
                    )
                  )
                }
                required
              />
            </label>
            <label className="sm:col-span-2 block text-sm">
              <span className="font-medium text-slate-700">Qty</span>
              <input
                type="number"
                min="0"
                step="0.01"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                value={row.quantity}
                onChange={(e) =>
                  setRows((prev) =>
                    prev.map((r) =>
                      r.id === row.id ? { ...r, quantity: e.target.value } : r
                    )
                  )
                }
              />
            </label>
            <label className="sm:col-span-3 block text-sm">
              <span className="font-medium text-slate-700">Unit (ZAR)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
                value={row.unitPrice}
                onChange={(e) =>
                  setRows((prev) =>
                    prev.map((r) =>
                      r.id === row.id ? { ...r, unitPrice: e.target.value } : r
                    )
                  )
                }
              />
            </label>
            <div className="sm:col-span-2 flex justify-end pb-1">
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={rows.length <= 1}
                onClick={() => setRows((prev) => prev.filter((r) => r.id !== row.id))}
              >
                <Trash2 className="h-4 w-4 text-slate-400" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        className="mt-3 rounded-xl"
        onClick={() => setRows((prev) => [...prev, emptyRow()])}
      >
        <Plus className="mr-1 h-4 w-4" />
        Add line item
      </Button>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Due date</span>
          <input
            type="date"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            value={dueDateValue}
            onChange={(e) => setDueDateValue(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Deposit type</span>
          <select
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            value={depositTypeValue}
            onChange={(e) => setDepositTypeValue(e.target.value as DepositType)}
          >
            <option value="full">Full payment</option>
            <option value="percentage">Percentage deposit</option>
            <option value="fixed">Fixed deposit</option>
          </select>
        </label>
        {depositTypeValue !== "full" ? (
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Deposit value</span>
            <input
              type="number"
              min="0"
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
              value={depositValueInput}
              onChange={(e) => setDepositValueInput(e.target.value)}
            />
          </label>
        ) : null}
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Discount (ZAR)</span>
          <input
            type="number"
            min="0"
            step="0.01"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            value={discount}
            onChange={(e) => setDiscount(e.target.value)}
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-slate-700">Tax (ZAR)</span>
          <input
            type="number"
            min="0"
            step="0.01"
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            value={tax}
            onChange={(e) => setTax(e.target.value)}
          />
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="font-medium text-slate-700">Notes</span>
          <textarea
            rows={2}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2"
            value={notesValue}
            onChange={(e) => setNotesValue(e.target.value)}
          />
        </label>
      </div>

      <p className="mt-4 text-sm text-slate-600">
        Estimated total:{" "}
        <span className="font-semibold text-slate-900">
          R {(estimatedTotal / 100).toFixed(2)}
        </span>
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button type="submit" className="rounded-xl" disabled={pending}>
          Save changes
        </Button>
        <Button type="button" variant="outline" className="rounded-xl" onClick={onCancel}>
          Cancel
        </Button>
      </div>
      {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
    </form>
  );
}
