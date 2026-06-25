"use client";

import { useEffect, useRef } from "react";

import {
  clearWorkspacePaymentReference,
  readWorkspacePaymentReference,
} from "@/lib/subscriptions/payment-reference-storage";
import { replaceClientLocation } from "@/lib/navigation/client-location";
import { companyBillingPath } from "@/lib/paths/company";
import type { PaymentConfirmationState } from "@/lib/services/workspace-subscription-verify";

type Props = {
  slug: string;
  companyId: string;
  paymentConfirmation: PaymentConfirmationState;
};

export function SubscriptionPaymentRecovery({
  slug,
  companyId,
  paymentConfirmation,
}: Props) {
  const recoveredRef = useRef(false);

  useEffect(() => {
    if (
      paymentConfirmation.status === "activated" ||
      paymentConfirmation.status === "already_active"
    ) {
      clearWorkspacePaymentReference(companyId);
      return;
    }

    if (paymentConfirmation.status !== "pending_webhook") {
      return;
    }

    if (recoveredRef.current) {
      return;
    }

    const storedReference = readWorkspacePaymentReference(companyId);
    if (!storedReference) {
      return;
    }

    recoveredRef.current = true;
    const target = `${companyBillingPath(slug)}?payment=success&reference=${encodeURIComponent(storedReference)}`;
    replaceClientLocation(target);
  }, [companyId, paymentConfirmation.status, slug]);

  return null;
}
