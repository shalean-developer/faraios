"use client";

import { useState, useTransition } from "react";

import { Button } from "@/components/ui/button";

export function PortalQuoteActions({ token, quoteId }: { token: string; quoteId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const respond = (action: "accept" | "reject") => {
    startTransition(async () => {
      const res = await fetch(`/api/public/portal/${token}/quotes/${quoteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const body = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !body.ok) {
        setError(body.error ?? "Could not update quote.");
        return;
      }
      window.location.reload();
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" className="rounded-lg" disabled={pending} onClick={() => respond("accept")}>
        Accept
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="rounded-lg"
        disabled={pending}
        onClick={() => respond("reject")}
      >
        Reject
      </Button>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}
