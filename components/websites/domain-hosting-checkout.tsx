"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";

import { createHostingOrderAction } from "@/app/actions/hosting-automation";
import { rememberHostingPaymentReference } from "@/components/hosting/hosting-payment-recovery";
import { formatHostingAmount } from "@/components/hosting/hosting-shared-ui";
import { Button } from "@/components/ui/button";
import { companyWebsiteBuilderSectionPath } from "@/lib/paths/company";
import { cn } from "@/lib/utils";
import type { HostingPlanRow } from "@/types/hosting-automation";

type Props = {
  slug: string;
  companyId: string;
  domain: string;
  plans: HostingPlanRow[];
  billingEmail?: string | null;
  embedded?: boolean;
  returnPath?: string;
  onCancel?: () => void;
};

export function DomainHostingCheckout({
  slug,
  companyId,
  domain,
  plans,
  billingEmail,
  embedded = false,
  returnPath,
  onCancel,
}: Props) {
  const [selectedPlanId, setSelectedPlanId] = useState(
    plans.find((plan) => plan.is_popular)?.id ?? plans[0]?.id ?? ""
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId);

  const onPurchase = () => {
    if (!selectedPlan) {
      setError("No hosting plan is available. Contact support.");
      return;
    }

    const email = billingEmail?.trim();
    if (!email) {
      setError("Add a billing email to your company profile before purchasing hosting.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const orderResult = await createHostingOrderAction({
        companyId,
        companySlug: slug,
        planId: selectedPlan.id,
        domainName: domain,
        domainType: "existing",
        billingCycle: "monthly",
      });

      if (!orderResult.ok) {
        setError(orderResult.error);
        return;
      }

      if (!orderResult.orderId || !orderResult.invoiceId) {
        setError("Order created but payment details are missing.");
        return;
      }

      const checkoutReturnPath =
        returnPath ??
        `${companyWebsiteBuilderSectionPath(slug, "domains")}?payment=success&domain=${encodeURIComponent(domain)}`;

      const res = await fetch("/api/paystack/hosting/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId,
          plan: selectedPlan.slug,
          email,
          orderId: orderResult.orderId,
          invoiceId: orderResult.invoiceId,
          returnPath: checkoutReturnPath,
        }),
      });

      const data = (await res.json()) as {
        ok: boolean;
        authorizationUrl?: string;
        reference?: string;
        error?: string;
      };

      if (!res.ok || !data.ok || !data.authorizationUrl) {
        setError(data.error ?? "Failed to initialize payment.");
        return;
      }

      if (data.reference) {
        rememberHostingPaymentReference(companyId, data.reference);
      }

      window.location.assign(data.authorizationUrl);
    });
  };

  if (!plans.length) {
    return (
      <p className="text-sm text-amber-800">
        Hosting plans are not configured yet. Please contact FaraiOS support.
      </p>
    );
  }

  return (
    <div
      className={cn(
        embedded
          ? "rounded-xl border border-amber-200 bg-amber-50/80 p-4"
          : "rounded-2xl border border-amber-200 bg-amber-50/80 p-5 shadow-sm"
      )}
    >
      <h3 className="text-sm font-semibold text-amber-950">Hosting required for {domain}</h3>
      <p className="mt-2 text-sm text-amber-900">
        FaraiOS hosting registers your domain in Plesk, syncs DNS, and wires your live site
        automatically after payment.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {plans.map((plan) => {
          const selected = plan.id === selectedPlanId;
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => setSelectedPlanId(plan.id)}
              className={cn(
                "rounded-xl border px-4 py-3 text-left transition",
                selected
                  ? "border-violet-500 bg-white ring-2 ring-violet-200"
                  : "border-amber-200 bg-white hover:border-violet-300"
              )}
            >
              <span className="block text-sm font-semibold text-slate-900">{plan.name}</span>
              <span className="mt-1 block text-xs text-slate-500">{plan.description}</span>
              <span className="mt-2 block text-sm font-medium text-violet-700">
                {formatHostingAmount(plan.monthly_price_cents)}/month
              </span>
            </button>
          );
        })}
      </div>

      {error ? <p className="mt-3 text-sm font-medium text-red-600">{error}</p> : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          className="rounded-xl"
          disabled={pending || !selectedPlan}
          onClick={onPurchase}
        >
          {pending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Starting checkout…
            </>
          ) : (
            `Buy hosting for ${domain}`
          )}
        </Button>
        {onCancel ? (
          <Button type="button" variant="outline" className="rounded-xl" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </div>
  );
}
