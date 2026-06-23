import { initializeEftPayment } from "@/lib/payments/providers/eft";
import { initializePaystackCustomerPayment } from "@/lib/payments/providers/paystack-customer";
import type {
  InitializePaymentInput,
  InitializePaymentResult,
  PaymentProviderHandler,
} from "@/lib/payments/providers/types";
import type { PaymentProvider } from "@/lib/financial/status";

const handlers: Record<PaymentProvider, PaymentProviderHandler | undefined> = {
  paystack: {
    provider: "paystack",
    initialize: initializePaystackCustomerPayment,
  },
  eft: {
    provider: "eft",
    initialize: initializeEftPayment,
  },
  stripe: undefined,
  ozow: undefined,
  peach: undefined,
  yoco: undefined,
};

export function getPaymentProvider(provider: PaymentProvider): PaymentProviderHandler | null {
  return handlers[provider] ?? null;
}

export async function initializeCustomerPayment(
  provider: PaymentProvider,
  input: InitializePaymentInput
): Promise<InitializePaymentResult> {
  const handler = getPaymentProvider(provider);
  if (!handler) {
    return { ok: false, error: `Payment provider "${provider}" is not yet supported.` };
  }
  return handler.initialize(input);
}

export const ACTIVE_CUSTOMER_PROVIDERS: PaymentProvider[] = ["paystack", "eft"];
