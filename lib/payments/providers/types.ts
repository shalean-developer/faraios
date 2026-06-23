import type { PaymentProvider, PaymentType } from "@/lib/financial/status";

export type InitializePaymentInput = {
  companyId: string;
  customerId: string;
  invoiceId: string;
  paymentId: string;
  amountCents: number;
  currency: string;
  customerEmail: string;
  paymentType: PaymentType;
  callbackUrl: string;
};

export type InitializePaymentResult =
  | { ok: true; authorizationUrl?: string; reference: string; instructions?: string }
  | { ok: false; error: string };

export type PaymentProviderHandler = {
  provider: PaymentProvider;
  initialize(input: InitializePaymentInput): Promise<InitializePaymentResult>;
};
