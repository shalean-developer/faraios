"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

export function PortalPayButton({
  token,
  invoiceId,
  customerEmail,
}: {
  token: string;
  invoiceId: string;
  customerEmail: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [instructions, setInstructions] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const pay = (provider: "paystack" | "eft", paymentType: "full" | "deposit") => {
    startTransition(async () => {
      const res = await fetch(`/api/public/portal/${token}/payments/initialize`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId, provider, paymentType, customerEmail }),
      });
      const body = (await res.json()) as {
        ok?: boolean;
        error?: string;
        authorizationUrl?: string;
        instructions?: string;
      };
      if (!res.ok || !body.ok) {
        setError(body.error ?? "Payment could not be started.");
        return;
      }
      if (body.authorizationUrl) {
        window.location.href = body.authorizationUrl;
        return;
      }
      if (body.instructions) setInstructions(body.instructions);
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          className="rounded-lg"
          disabled={pending || !customerEmail}
          onClick={() => pay("paystack", "full")}
        >
          Pay online
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="rounded-lg"
          disabled={pending}
          onClick={() => pay("eft", "full")}
        >
          EFT / bank transfer
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="rounded-lg"
          disabled={pending || !customerEmail}
          onClick={() => pay("paystack", "deposit")}
        >
          Pay deposit
        </Button>
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
      {instructions ? (
        <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-xs text-slate-700">
          {instructions}
        </pre>
      ) : null}
    </div>
  );
}
