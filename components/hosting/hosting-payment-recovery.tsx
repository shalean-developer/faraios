"use client";

import { useEffect, useRef } from "react";

import { companyBillingPath } from "@/lib/paths/company";
import { replaceClientLocation } from "@/lib/navigation/client-location";
import {
  clearWorkspacePaymentReference,
  readWorkspacePaymentReference,
} from "@/lib/subscriptions/payment-reference-storage";
import type { HostingPaymentConfirmationState } from "@/lib/services/hosting-subscription-verify";

const STORAGE_PREFIX = "faraios.hosting-payment.";

export function rememberHostingPaymentReference(companyId: string, reference: string) {
  if (!reference) return;
  try {
    sessionStorage.setItem(`${STORAGE_PREFIX}${companyId}`, reference);
  } catch {
    // ignore
  }
}

type Props = {
  slug: string;
  companyId: string;
  paymentConfirmation: HostingPaymentConfirmationState;
};

export function HostingPaymentRecovery({
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
      try {
        sessionStorage.removeItem(`${STORAGE_PREFIX}${companyId}`);
      } catch {
        // ignore
      }
      clearWorkspacePaymentReference(companyId);
      return;
    }

    if (paymentConfirmation.status !== "pending_webhook") {
      return;
    }

    if (recoveredRef.current) {
      return;
    }

    let storedReference: string | null = null;
    try {
      storedReference = sessionStorage.getItem(`${STORAGE_PREFIX}${companyId}`);
    } catch {
      storedReference = null;
    }
    if (!storedReference) {
      storedReference = readWorkspacePaymentReference(companyId);
    }
    if (!storedReference) {
      return;
    }

    recoveredRef.current = true;
    const target = `${companyBillingPath(slug, {
      tab: "hosting",
      payment: "success",
      reference: storedReference,
    })}`;
    replaceClientLocation(target);
  }, [companyId, paymentConfirmation.status, slug]);

  return null;
}
