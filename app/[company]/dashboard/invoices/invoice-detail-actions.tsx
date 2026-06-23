"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import {
  cancelDraftInvoiceAction,
  issueInvoiceAction,
} from "@/app/actions/invoices";
import { Button } from "@/components/ui/button";
import type { InvoiceStatus } from "@/lib/financial/status";

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
