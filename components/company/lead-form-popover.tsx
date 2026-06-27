"use client";

import { type FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";

import { createLeadAction, updateLeadNotesAction } from "@/app/actions/leads";
import { Button } from "@/components/ui/button";
import type { Lead } from "@/types/growth-engine";

type FormState = {
  name: string;
  email: string;
  phone: string;
  message: string;
};

const emptyForm: FormState = { name: "", email: "", phone: "", message: "" };

function leadToForm(lead: Lead): FormState {
  return {
    name: lead.name ?? "",
    email: lead.email ?? "",
    phone: lead.phone ?? "",
    message: lead.message ?? "",
  };
}

export function LeadFormPopover({
  open,
  onClose,
  slug,
  companyId,
  lead = null,
}: {
  open: boolean;
  onClose: () => void;
  slug: string;
  companyId: string;
  lead?: Lead | null;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const isEditing = lead != null;
  const title = isEditing ? "Edit lead" : "Add lead";

  useEffect(() => {
    if (!open) return;
    setForm(lead ? leadToForm(lead) : emptyForm);
    setError(null);
  }, [open, lead]);

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
      if (isEditing && lead) {
        const result = await updateLeadNotesAction({
          companyId,
          companySlug: slug,
          leadId: lead.id,
          message: form.message,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
      } else {
        const result = await createLeadAction({
          companyId,
          companySlug: slug,
          name: form.name,
          email: form.email,
          phone: form.phone,
          message: form.message,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
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
        aria-label="Close lead form"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="lead-form-popover-title"
        className="relative z-10 flex max-h-[min(90vh,calc(100dvh-2rem))] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-3">
          <p
            id="lead-form-popover-title"
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
              disabled={isEditing}
            />
            <input
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              type="email"
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Email"
              disabled={isEditing}
            />
            <input
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm"
              placeholder="Phone"
              disabled={isEditing}
            />
            <textarea
              value={form.message}
              onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
              className="min-h-[88px] rounded-xl border border-slate-200 px-3 py-2 text-sm sm:col-span-2"
              placeholder="Notes"
            />
          </div>

          {error ? (
            <p className="mt-3 text-sm font-medium text-red-600">{error}</p>
          ) : null}

          <div className="mt-4 flex gap-2">
            <Button type="submit" className="rounded-xl" disabled={pending}>
              {pending ? "Saving..." : isEditing ? "Update lead" : "Add lead"}
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
