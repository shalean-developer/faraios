import {
  activateHostingOrderPayment,
  verifyPaystackHostingOrderPayment,
} from "@/lib/billing/hosting-order-payment";
import { provisionHostingOrder } from "@/lib/services/hosting-automation";
import {
  confirmHostingPaymentFromReference,
  type ActivateHostingSubscriptionResult,
} from "@/lib/billing/hosting-subscription-payment";

export type ConfirmHostingPaymentResult =
  | { ok: true; alreadyActive?: boolean; orderFlow?: boolean }
  | { ok: false; error: string };

/** Confirm a Paystack hosting payment — order flow (Plesk provision) or legacy subscription. */
export async function confirmAnyHostingPaymentFromReference(input: {
  reference: string;
  companyId: string;
}): Promise<ConfirmHostingPaymentResult> {
  const orderResult = await activateHostingOrderPayment({
    reference: input.reference,
    companyId: input.companyId,
  });

  if (orderResult.ok) {
    return { ok: true, orderFlow: true };
  }

  const orderVerify = await verifyPaystackHostingOrderPayment(input.reference);
  if (orderVerify.ok) {
    if (orderVerify.companyId === input.companyId) {
      const provisioned = await provisionHostingOrder(orderVerify.orderId);
      if (provisioned.ok) {
        return { ok: true, orderFlow: true };
      }
    }
    return { ok: false, error: orderResult.error ?? "Could not complete hosting order." };
  }

  const legacyResult: ActivateHostingSubscriptionResult =
    await confirmHostingPaymentFromReference(input);

  if (!legacyResult.ok) {
    return { ok: false, error: legacyResult.error };
  }

  return {
    ok: true,
    alreadyActive: legacyResult.alreadyActive,
    orderFlow: false,
  };
}
