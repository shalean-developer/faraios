"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";

import {
  cancelDraftInvoiceAction,
  issueInvoiceAction,
  updateDraftInvoiceAction,
} from "@/app/actions/invoices";
import { InvoiceEditPanel } from "@/components/company/invoice-edit-panel";
import { Button } from "@/components/ui/button";
import { canEditInvoice } from "@/lib/financial/document-edit";
import type { InvoiceStatus, DepositType } from "@/lib/financial/status";
import type { Invoice, InvoiceLineItem } from "@/types/financial";

export function InvoiceDetailActions({
  slug,
  companyId,
  invoiceId,
  status,
}: {
  slug: string;
  companyId: string;
  invoiceId: string;
  status: InvoiceStatus;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (status !== "draft") return null;

  const onIssue = () => {
    setError(null);
    startTransition(async () => {
      const result = await issueInvoiceAction({ companyId, companySlug: slug, invoiceId });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  };

  const onCancel = () => {
    if (!window.confirm("Cancel this draft invoice?")) return;
    setError(null);
    startTransition(async () => {
      const result = await cancelDraftInvoiceAction({
        companyId,
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

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap gap-2">
        <Button className="rounded-xl" disabled={pending} onClick={onIssue}>
          Issue invoice
        </Button>
        <Button
          variant="outline"
          className="rounded-xl text-red-600 hover:text-red-700"
          disabled={pending}
          onClick={onCancel}
        >
          Cancel draft
        </Button>
      </div>
      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}
    </div>
  );
}

export function CompanyInvoiceDetailClient({
  slug,
  companyId,
  invoice,
  lineItems,
}: {
  slug: string;
  companyId: string;
  invoice: Invoice;
  lineItems: InvoiceLineItem[];
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const editable = canEditInvoice(invoice.status as InvoiceStatus);

  if (!editable) return null;

  return (
    <div className="mb-6">
      {!editing ? (
        <Button variant="outline" className="rounded-xl" onClick={() => setEditing(true)}>
          <Pencil className="mr-1.5 h-4 w-4" />
          Edit draft
        </Button>
      ) : null}

      {editing ? (
        <div className="mt-4">
          <InvoiceEditPanel
            slug={slug}
            companyId={companyId}
            invoiceId={invoice.id}
            lineItems={lineItems}
            notes={invoice.notes}
            dueDate={invoice.due_date}
            discountCents={invoice.discount_cents}
            taxCents={invoice.tax_cents}
            depositType={invoice.deposit_type as DepositType}
            depositValue={invoice.deposit_value}
            saveAction={updateDraftInvoiceAction}
            onSaved={() => {
              setEditing(false);
              router.refresh();
            }}
            onCancel={() => setEditing(false)}
          />
        </div>
      ) : null}
    </div>
  );
}
