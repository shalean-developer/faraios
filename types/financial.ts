import type {
  DepositType,
  InvoiceStatus,
  PaymentProvider,
  PaymentStatus,
  PaymentType,
  QuoteStatus,
} from "@/lib/financial/status";

export type LineItemInput = {
  serviceId?: string | null;
  description: string;
  quantity: number;
  unitPriceCents: number;
};

export type QuoteLineItem = {
  id: string;
  quote_id: string;
  service_id: string | null;
  description: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
  sort_order: number;
  created_at: string;
};

export type Quote = {
  id: string;
  company_id: string;
  customer_id: string;
  booking_id: string | null;
  quote_number: string;
  status: QuoteStatus;
  subtotal_cents: number;
  discount_cents: number;
  tax_cents: number;
  total_cents: number;
  notes: string | null;
  valid_until: string | null;
  created_by: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  accepted_at: string | null;
  rejected_at: string | null;
  converted_booking_id: string | null;
  converted_invoice_id: string | null;
  created_at: string;
  updated_at: string;
};

export type QuoteWithCustomer = Quote & {
  customers?: { name: string; email: string | null; phone: string | null } | null;
};

export type InvoiceLineItem = {
  id: string;
  invoice_id: string;
  service_id: string | null;
  description: string;
  quantity: number;
  unit_price_cents: number;
  total_cents: number;
  sort_order: number;
  created_at: string;
};

export type Invoice = {
  id: string;
  company_id: string;
  customer_id: string;
  booking_id: string | null;
  quote_id: string | null;
  invoice_number: string;
  status: InvoiceStatus;
  subtotal_cents: number;
  discount_cents: number;
  tax_cents: number;
  total_cents: number;
  amount_paid_cents: number;
  balance_due_cents: number;
  deposit_type: DepositType;
  deposit_value: number;
  due_date: string | null;
  notes: string | null;
  issued_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

export type InvoiceWithCustomer = Invoice & {
  customers?: { name: string; email: string | null; phone: string | null } | null;
};

export type CustomerPayment = {
  id: string;
  company_id: string;
  customer_id: string;
  invoice_id: string;
  booking_id: string | null;
  amount_cents: number;
  currency: string;
  provider: PaymentProvider;
  provider_reference: string | null;
  status: PaymentStatus;
  payment_type: PaymentType;
  notes: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CompanyPaymentSettings = {
  company_id: string;
  default_deposit_type: DepositType;
  default_deposit_value: number;
  eft_bank_name: string | null;
  eft_account_name: string | null;
  eft_account_number: string | null;
  eft_branch_code: string | null;
  eft_reference_prefix: string | null;
  paystack_enabled: boolean;
  eft_enabled: boolean;
  created_at: string;
  updated_at: string;
};

export type RevenueMetrics = {
  revenueTodayCents: number;
  revenueMonthCents: number;
  revenueYearCents: number;
  outstandingInvoicesCents: number;
  overdueInvoicesCents: number;
  totalPaidCents: number;
  averageBookingValueCents: number;
  quotesSent: number;
  quotesAccepted: number;
  quotesRejected: number;
  quoteConversionRate: number;
  paymentsSuccessful: number;
  paymentsFailed: number;
  paymentsRefunded: number;
};
