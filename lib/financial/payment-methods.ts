import type { CompanyPaymentSettings } from "@/types/financial";

export type PaymentMethodSettingKey =
  | "paystack_enabled"
  | "payfast_enabled"
  | "yoco_enabled"
  | "ozow_enabled"
  | "peach_enabled"
  | "stripe_enabled"
  | "eft_enabled"
  | "cash_enabled";

export type PaymentMethodCatalogItem = {
  id: string;
  settingKey: PaymentMethodSettingKey;
  label: string;
  description: string;
  category: "Online" | "Manual";
  /** Provider is wired for customer checkout today. */
  live: boolean;
  accent: string;
};

export const PAYMENT_METHOD_CATALOG: PaymentMethodCatalogItem[] = [
  {
    id: "paystack",
    settingKey: "paystack_enabled",
    label: "Paystack",
    description: "Cards and online checkout via Paystack.",
    category: "Online",
    live: true,
    accent: "bg-emerald-100 text-emerald-700",
  },
  {
    id: "payfast",
    settingKey: "payfast_enabled",
    label: "PayFast",
    description: "South African gateway for cards, EFT, and instant EFT.",
    category: "Online",
    live: false,
    accent: "bg-red-100 text-red-700",
  },
  {
    id: "yoco",
    settingKey: "yoco_enabled",
    label: "Yoco",
    description: "In-person and online card payments with Yoco.",
    category: "Online",
    live: false,
    accent: "bg-sky-100 text-sky-700",
  },
  {
    id: "ozow",
    settingKey: "ozow_enabled",
    label: "Ozow",
    description: "Instant EFT payments from South African banks.",
    category: "Online",
    live: false,
    accent: "bg-orange-100 text-orange-700",
  },
  {
    id: "peach",
    settingKey: "peach_enabled",
    label: "Peach Payments",
    description: "Enterprise card processing and payment links.",
    category: "Online",
    live: false,
    accent: "bg-violet-100 text-violet-700",
  },
  {
    id: "stripe",
    settingKey: "stripe_enabled",
    label: "Stripe",
    description: "Global cards, wallets, and subscription billing.",
    category: "Online",
    live: false,
    accent: "bg-indigo-100 text-indigo-700",
  },
  {
    id: "eft",
    settingKey: "eft_enabled",
    label: "Bank transfer (EFT)",
    description: "Share bank details and confirm when payment arrives.",
    category: "Manual",
    live: true,
    accent: "bg-blue-100 text-blue-700",
  },
  {
    id: "cash",
    settingKey: "cash_enabled",
    label: "Cash",
    description: "Record in-person cash payments against invoices.",
    category: "Manual",
    live: false,
    accent: "bg-amber-100 text-amber-700",
  },
];

export type PaymentMethodToggleState = Record<PaymentMethodSettingKey, boolean>;

export function paymentMethodStateFromSettings(
  settings: CompanyPaymentSettings
): PaymentMethodToggleState {
  return {
    paystack_enabled: settings.paystack_enabled,
    payfast_enabled: settings.payfast_enabled,
    yoco_enabled: settings.yoco_enabled,
    ozow_enabled: settings.ozow_enabled,
    peach_enabled: settings.peach_enabled,
    stripe_enabled: settings.stripe_enabled,
    eft_enabled: settings.eft_enabled,
    cash_enabled: settings.cash_enabled,
  };
}

export function countEnabledPaymentMethods(state: PaymentMethodToggleState): number {
  return PAYMENT_METHOD_CATALOG.filter((method) => state[method.settingKey]).length;
}

export function isEftConfigured(settings: CompanyPaymentSettings): boolean {
  return Boolean(
    settings.eft_bank_name?.trim() &&
      settings.eft_account_name?.trim() &&
      settings.eft_account_number?.trim()
  );
}
