"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { WorkspaceCheckoutSummary } from "@/components/billing/workspace-checkout-summary";
import { companySettingsPath } from "@/lib/paths/company";
import { startWorkspacePayment } from "@/lib/subscriptions/start-workspace-payment";
import { rememberWorkspacePaymentReference } from "@/lib/subscriptions/payment-reference-storage";
import type { SubscriptionCompanyFields } from "@/lib/subscriptions/types";
import { cn } from "@/lib/utils";

type Props = {
  slug: string;
  companyId: string;
  plan?: string | null;
  company?: SubscriptionCompanyFields;
  billingEmail?: string | null;
  setupFeeEnabled?: boolean;
  className?: string;
  children?: ReactNode;
  pendingLabel?: string;
  showCheckoutSummary?: boolean;
};

export function CompletePaymentButton({
  slug,
  companyId,
  plan,
  company,
  billingEmail,
  setupFeeEnabled = true,
  className,
  children = "Complete payment",
  pendingLabel = "Redirecting…",
  showCheckoutSummary = true,
}: Props) {
  const router = useRouter();
  const mountedRef = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [includeSetupFee, setIncludeSetupFee] = useState(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const onClick = async () => {
    setError(null);
    const email = billingEmail?.trim();
    if (!email) {
      setError("Add a billing email in Business settings first.");
      router.push(companySettingsPath(slug));
      return;
    }

    setPending(true);
    try {
      const result = await startWorkspacePayment({
        companyId,
        plan,
        email,
        includeSetupFee,
      });
      if (!result.ok) {
        if (mountedRef.current) {
          setError(result.error);
          setPending(false);
        }
        return;
      }
      if (result.reference) {
        rememberWorkspacePaymentReference(companyId, result.reference);
      }
      window.location.assign(result.authorizationUrl);
      return;
    } catch {
      if (mountedRef.current) {
        setError("Could not start payment.");
        setPending(false);
      }
    }
  };

  return (
    <div className="flex w-full max-w-md flex-col items-stretch gap-4">
      {showCheckoutSummary && company ? (
        <WorkspaceCheckoutSummary
          plan={plan}
          company={company}
          includeSetupFee={includeSetupFee}
          setupFeeEnabled={setupFeeEnabled}
          onIncludeSetupFeeChange={setIncludeSetupFee}
        />
      ) : null}
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          onClick={onClick}
          disabled={pending}
          className={cn(className, pending && "opacity-70")}
        >
          {pending ? pendingLabel : children}
        </button>
        {error ? (
          <p className="max-w-xs text-right text-xs text-red-700">
            {error}{" "}
            <Link
              href={companySettingsPath(slug)}
              className="font-medium underline hover:no-underline"
            >
              Business settings
            </Link>
          </p>
        ) : null}
      </div>
    </div>
  );
}
