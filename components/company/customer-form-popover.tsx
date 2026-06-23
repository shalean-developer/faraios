"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

import { createCustomer, updateCustomer } from "@/app/actions/customers";
import { Button } from "@/components/ui/button";
import type { Customer } from "@/types/database";

type FormState = {
  name: string;
  email: string;
  phone: string;
  notes: string;
};

const emptyForm: FormState = { name: "", email: "", phone: "", notes: "" };

function customerToForm(customer: Customer): FormState {
  return {
    name: customer.name,
    email: customer.email ?? "",
    phone: customer.phone ?? "",
    notes: customer.notes ?? "",
  };
}

export function CustomerFormPopover({
  open,
  onClose,
  slug,
  companyId,
  customer = null,
}: {
  open: boolean;
  onClose: () => void;
  slug: string;
  companyId: string;
  customer?: Customer | null;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isEditing = customer != null;
  const title = isEditing ? "Edit customer" : "Add customer";

  useEffect(() => {
    if (!open) return;
    setForm(customer ? customerToForm(customer) : emptyForm);
    setError(null);
  }, [open, customer]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);

    try {
      const payload = {
        companyId,
        companySlug: slug,
        name: form.name,
        email: form.email,
        phone: form.phone,
        notes: form.notes,
      };

      const result = isEditing
        ? await updateCustomer(customer.id, payload)
        : await createCustomer(payload);

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
        aria-label="Close customer form"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="customer-form-popover-title"
        className="relative z-10 flex max-h-[min(90vh,calc(100dvh-2rem))] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
          <p
            id="customer-form-popover-title"
            className="text-sm font-semibold text-slate-900"
          >
            {title}
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
        <form onSubmit={onSubmit} className="min-h-0 overflow-y-auto p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm sm:col-span-2"
              placeholder="Name"
              required
            />
            <input
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              type="email"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Email"
            />
            <input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Phone"
            />
            <textarea
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="min-h-[88px] rounded-xl border border-slate-200 px-3 py-2 text-sm sm:col-span-2"
              placeholder="Notes"
            />
          </div>

          {error ? (
            <p className="mt-3 text-sm font-medium text-red-600">{error}</p>
          ) : null}

          <div className="mt-4 flex gap-2">
            <Button type="submit" className="rounded-xl" disabled={pending}>
              {pending ? "Saving..." : isEditing ? "Update customer" : "Add customer"}
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
