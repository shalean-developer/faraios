"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Pencil } from "lucide-react";

import {
  convertQuoteToBookingAction,
  convertQuoteToInvoiceAction,
  updateQuoteAction,
} from "@/app/actions/quotes";
import { QuoteEditPanel } from "@/components/company/quote-edit-panel";
import { Button } from "@/components/ui/button";
import { canEditQuote } from "@/lib/financial/document-edit";
import type { Quote, QuoteLineItem } from "@/types/financial";

export function CompanyQuoteDetailClient({
  slug,
  companyId,
  quote,
  lineItems,
}: {
  slug: string;
  companyId: string;
  quote: Quote;
  lineItems: QuoteLineItem[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const editable = canEditQuote(quote.status);

  const convertBooking = () => {
    startTransition(async () => {
      const result = await convertQuoteToBookingAction({
        companyId,
        companySlug: slug,
        quoteId: quote.id,
      });
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  };

  const convertInvoice = () => {
    startTransition(async () => {
      const result = await convertQuoteToInvoiceAction({
        companyId,
        companySlug: slug,
        quoteId: quote.id,
      });
      if (!result.ok) setError(result.error);
      else router.refresh();
    });
  };

  return (
    <div className="space-y-4">
      {editable ? (
        <div className="flex flex-wrap gap-2">
          {!editing ? (
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => setEditing(true)}
            >
              <Pencil className="mr-1.5 h-4 w-4" />
              Edit quote
            </Button>
          ) : null}
        </div>
      ) : null}

      {editing ? (
        <QuoteEditPanel
          slug={slug}
          companyId={companyId}
          quoteId={quote.id}
          lineItems={lineItems}
          notes={quote.notes}
          validUntil={quote.valid_until}
          discountCents={quote.discount_cents}
          taxCents={quote.tax_cents}
          saveAction={updateQuoteAction}
          onSaved={() => {
            setEditing(false);
            router.refresh();
          }}
          onCancel={() => setEditing(false)}
        />
      ) : null}

      {quote.status === "accepted" ? (
        <div className="flex flex-wrap gap-3">
          <Button className="rounded-xl" disabled={pending} onClick={convertBooking}>
            Convert to booking
          </Button>
          <Button
            variant="outline"
            className="rounded-xl"
            disabled={pending}
            onClick={convertInvoice}
          >
            Generate invoice
          </Button>
        </div>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
