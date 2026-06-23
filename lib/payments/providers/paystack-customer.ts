import { PAYSTACK_BASE_URL } from "@/lib/billing/paystack";
import type { InitializePaymentInput, InitializePaymentResult } from "@/lib/payments/providers/types";

export async function initializePaystackCustomerPayment(
  input: InitializePaymentInput
): Promise<InitializePaymentResult> {
  const secret = process.env.PAYSTACK_SECRET_KEY?.trim();
  if (!secret) return { ok: false, error: "Paystack is not configured." };

  const reference = `farai_inv_${input.paymentId.replace(/-/g, "").slice(0, 24)}`;

  const res = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: input.customerEmail,
      amount: input.amountCents,
      currency: input.currency,
      reference,
      callback_url: input.callbackUrl,
      metadata: {
        product_type: "customer_invoice",
        company_id: input.companyId,
        customer_id: input.customerId,
        invoice_id: input.invoiceId,
        payment_id: input.paymentId,
        payment_type: input.paymentType,
      },
    }),
  });

  const body = (await res.json()) as {
    status?: boolean;
    message?: string;
    data?: { authorization_url?: string; reference?: string };
  };

  if (!res.ok || !body.status || !body.data?.authorization_url) {
    return { ok: false, error: body.message ?? "Paystack initialization failed." };
  }

  return {
    ok: true,
    authorizationUrl: body.data.authorization_url,
    reference: body.data.reference ?? reference,
  };
}
