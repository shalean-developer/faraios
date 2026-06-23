"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, X } from "lucide-react";

import { createInvoiceAction } from "@/app/actions/invoices";
import { Button } from "@/components/ui/button";
import { formatPriceInput } from "@/lib/operations/metrics";
import type { Customer, CompanyService } from "@/types/database";

type LineItemRow = {
  id: string;
  serviceId: string;
  description: string;
  quantity: string;
  unitPrice: string;
};

function emptyLineItem(): LineItemRow {
  return {
    id: crypto.randomUUID(),
    serviceId: "",
    description: "",
    quantity: "1",
    unitPrice: "",
  };
}

export function InvoiceFormPopover({
  open,
  onClose,
  slug,
  companyId,
  customers,
  services,
}: {
  open: boolean;
  onClose: () => void;
  slug: string;
  companyId: string;
  customers: Customer[];
  services: CompanyService[];
}) {
  const router = useRouter();
  const [customerId, setCustomerId] = useState("");
  const [lineItems, setLineItems] = useState<LineItemRow[]>([emptyLineItem()]);
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [discount, setDiscount] = useState("");
  const [tax, setTax] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCustomerId("");
    setLineItems([emptyLineItem()]);
    setDueDate("");
    setNotes("");
    setDiscount("");
    setTax("");
    setError(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const estimatedTotalCents = useMemo(() => {
    const subtotal = lineItems.reduce((sum, row) => {
      const quantity = Number.parseFloat(row.quantity || "0");
      const unitPrice = Math.round(Number.parseFloat(row.unitPrice || "0") * 100);
      if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) return sum;
      return sum + Math.round(quantity * unitPrice);
    }, 0);
    const discountCents = Math.round(Number.parseFloat(discount || "0") * 100);
    const taxCents = Math.round(Number.parseFloat(tax || "0") * 100);
    return Math.max(0, subtotal - discountCents + taxCents);
  }, [lineItems, discount, tax]);

  const updateLineItem = (id: string, patch: Partial<LineItemRow>) => {
    setLineItems((rows) =>
      rows.map((row) => {
        if (row.id !== id) return row;
        const next = { ...row, ...patch };
        if (patch.serviceId != null && patch.serviceId !== row.serviceId) {
          const service = services.find((item) => item.id === patch.serviceId);
          if (service) {
            next.description = service.name;
            next.unitPrice = formatPriceInput(service.base_price_cents);
          }
        }
        return next;
      })
    );
  };

  const onSubmit = async (e: FormEvent, issue: boolean) => {
    e.preventDefault();
    setError(null);

    const parsedItems = lineItems
      .map((row) => ({
        serviceId: row.serviceId || null,
        description: row.description.trim(),
        quantity: Number.parseFloat(row.quantity || "0"),
        unitPriceCents: Math.round(Number.parseFloat(row.unitPrice || "0") * 100),
      }))
      .filter((row) => row.description && row.unitPriceCents > 0);

    if (!customerId) {
      setError("Select a customer.");
      return;
    }
    if (!parsedItems.length) {
      setError("Add at least one line item with a description and amount.");
      return;
    }

    setPending(true);
    try {
      const result = await createInvoiceAction({
        companyId,
        companySlug: slug,
        customerId,
        lineItems: parsedItems,
        notes: notes.trim() || undefined,
        dueDate: dueDate || undefined,
        discountCents: Math.round(Number.parseFloat(discount || "0") * 100) || undefined,
        taxCents: Math.round(Number.parseFloat(tax || "0") * 100) || undefined,
        issue,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      onClose();
      router.refresh();
    } finally {
      setPending(false);
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end p-4 sm:p-6"
      role="presentation"
    >
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
        aria-label="Close invoice form"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="invoice-form-popover-title"
        className="relative z-10 flex max-h-[min(90vh,calc(100dvh-2rem))] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
          <p id="invoice-form-popover-title" className="text-sm font-semibold text-slate-900">
            New invoice
          </p>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form className="min-h-0 overflow-y-auto p-4">
          <label className="block text-sm">
            <span className="font-medium text-slate-700">Customer</span>
            <select
              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              required
            >
              <option value="">Select customer</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </label>

          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-slate-700">Line items</p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-lg"
                onClick={() => setLineItems((rows) => [...rows, emptyLineItem()])}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                Add item
              </Button>
            </div>

            {lineItems.map((row) => (
              <div
                key={row.id}
                className="rounded-xl border border-slate-200 bg-slate-50/60 p-3"
              >
                <div className="grid gap-2 sm:grid-cols-2">
                  <select
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm sm:col-span-2"
                    value={row.serviceId}
                    onChange={(e) => updateLineItem(row.id, { serviceId: e.target.value })}
                  >
                    <option value="">Custom line item</option>
                    {services.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.name}
                      </option>
                    ))}
                  </select>
                  <input
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm sm:col-span-2"
                    placeholder="Description"
                    value={row.description}
                    onChange={(e) => updateLineItem(row.id, { description: e.target.value })}
                    required
                  />
                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    placeholder="Qty"
                    value={row.quantity}
                    onChange={(e) => updateLineItem(row.id, { quantity: e.target.value })}
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm"
                    placeholder="Unit price (ZAR)"
                    value={row.unitPrice}
                    onChange={(e) => updateLineItem(row.id, { unitPrice: e.target.value })}
                    required
                  />
                </div>
                {lineItems.length > 1 ? (
                  <button
                    type="button"
                    className="mt-2 inline-flex items-center text-xs font-medium text-red-600 hover:text-red-800"
                    onClick={() =>
                      setLineItems((rows) => rows.filter((item) => item.id !== row.id))
                    }
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Remove
                  </button>
                ) : null}
              </div>
            ))}
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Due date</span>
              <input
                type="date"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Discount (ZAR)</span>
              <input
                type="number"
                min="0"
                step="0.01"
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
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
                className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={tax}
                onChange={(e) => setTax(e.target.value)}
              />
            </label>
            <label className="block text-sm sm:col-span-2">
              <span className="font-medium text-slate-700">Notes</span>
              <textarea
                className="mt-1 min-h-[72px] w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </label>
          </div>

          <p className="mt-4 text-sm text-slate-600">
            Estimated total:{" "}
            <span className="font-semibold text-slate-900">
              R {(estimatedTotalCents / 100).toFixed(2)}
            </span>
          </p>

          {error ? <p className="mt-3 text-sm font-medium text-red-600">{error}</p> : null}

          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              type="button"
              className="rounded-xl"
              disabled={pending}
              onClick={(e) => onSubmit(e, true)}
            >
              {pending ? "Saving..." : "Create & issue"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              disabled={pending}
              onClick={(e) => onSubmit(e, false)}
            >
              Save as draft
            </Button>
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={onClose}
              disabled={pending}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
