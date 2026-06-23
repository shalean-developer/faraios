"use client";

import { useState, useTransition } from "react";

import {
  convertQuoteToBookingAction,
  convertQuoteToInvoiceAction,
} from "@/app/actions/quotes";
import { Button } from "@/components/ui/button";
import type { Quote } from "@/types/financial";

export function CompanyQuoteDetailClient({
  slug,
  companyId,
  quote,
}: {
  slug: string;
  companyId: string;
  quote: Quote;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const convertBooking = () => {
    startTransition(async () => {
      const result = await convertQuoteToBookingAction({
        companyId,
        companySlug: slug,
        quoteId: quote.id,
      });
      if (!result.ok) setError(result.error);
      else window.location.reload();
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
      else window.location.reload();
    });
  };

  if (quote.status !== "accepted") {
    return error ? <p className="text-sm text-red-600">{error}</p> : null;
  }

  return (
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
      {error ? <p className="w-full text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
