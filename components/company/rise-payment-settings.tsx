"use client";

import Link from "next/link";
import { type FormEvent, useMemo, useState, useTransition } from "react";
import {
  Banknote,
  Check,
  ChevronLeft,
  CreditCard,
  Landmark,
  Percent,
  Save,
  Wallet,
  type LucideIcon,
} from "lucide-react";

import { updatePaymentSettingsAction } from "@/app/actions/payment-settings";
import {
  countEnabledPaymentMethods,
  isEftConfigured,
  PAYMENT_METHOD_CATALOG,
  paymentMethodStateFromSettings,
  type PaymentMethodSettingKey,
  type PaymentMethodToggleState,
} from "@/lib/financial/payment-methods";
import type { DepositType } from "@/lib/financial/status";
import { companyRevenuePath } from "@/lib/paths/company";
import { cn } from "@/lib/utils";
import type { CompanyPaymentSettings } from "@/types/financial";
import type { CompanyWithIndustry } from "@/types/database";

const riseCardClassName = "rounded-xl border border-slate-200 bg-white shadow-sm";
const riseOutlineButtonClassName =
  "inline-flex h-9 items-center gap-2 rounded-md border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50";
const risePrimaryButtonClassName =
  "inline-flex h-9 items-center gap-2 rounded-md bg-[#5a8dee] px-4 text-sm font-medium text-white transition hover:bg-[#4a7de0] disabled:opacity-60";
const riseInputClassName =
  "w-full rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-800 outline-none transition focus:border-[#5a8dee] focus:ring-2 focus:ring-[#5a8dee]/20";

function WidgetHeader({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#eef2ff] text-[#5a8dee]">
          <Icon className="h-4 w-4" strokeWidth={1.75} />
        </span>
        <div className="min-w-0">
          <h2 className="text-sm font-medium text-slate-800">{title}</h2>
          {description ? (
            <p className="mt-1 text-xs text-slate-500">{description}</p>
          ) : null}
        </div>
      </div>
      {action}
    </div>
  );
}

function SummaryCard({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "positive" | "warning" | "neutral";
}) {
  const hintClass =
    tone === "positive"
      ? "text-emerald-600"
      : tone === "warning"
        ? "text-orange-600"
        : "text-slate-500";

  return (
    <div className={cn(riseCardClassName, "p-4")}>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
      <p className={cn("mt-1 text-xs font-medium", hintClass)}>{hint}</p>
    </div>
  );
}

function PaymentMethodToggle({
  label,
  description,
  category,
  accent,
  live,
  enabled,
  onChange,
}: {
  label: string;
  description: string;
  category: string;
  accent: string;
  live: boolean;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border p-4 transition",
        enabled ? "border-[#5a8dee]/40 bg-[#f8faff]" : "border-slate-200 bg-white"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-semibold", accent)}>
              {label}
            </span>
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-500">
              {category}
            </span>
            {live ? (
              <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                Live
              </span>
            ) : (
              <span className="rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-700">
                Coming soon
              </span>
            )}
          </div>
          <p className="mt-2 text-sm text-slate-600">{description}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={() => onChange(!enabled)}
          suppressHydrationWarning
          className={cn(
            "relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition",
            enabled ? "bg-[#5a8dee]" : "bg-slate-200"
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition",
              enabled ? "left-5" : "left-0.5"
            )}
          />
        </button>
      </div>
    </div>
  );
}

function depositLabel(type: DepositType, value: number): string {
  if (type === "percentage") return `${value}% deposit`;
  if (type === "fixed") return `Fixed ${value} cents`;
  return "Full payment";
}

export function RisePaymentSettings({
  slug,
  company,
  settings,
}: {
  slug: string;
  company: CompanyWithIndustry;
  settings: CompanyPaymentSettings;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [defaultDepositType, setDefaultDepositType] = useState<DepositType>(
    settings.default_deposit_type
  );
  const [defaultDepositValue, setDefaultDepositValue] = useState(
    String(settings.default_deposit_value)
  );
  const [eftBankName, setEftBankName] = useState(settings.eft_bank_name ?? "");
  const [eftAccountName, setEftAccountName] = useState(settings.eft_account_name ?? "");
  const [eftAccountNumber, setEftAccountNumber] = useState(
    settings.eft_account_number ?? ""
  );
  const [eftBranchCode, setEftBranchCode] = useState(settings.eft_branch_code ?? "");
  const [eftReferencePrefix, setEftReferencePrefix] = useState(
    settings.eft_reference_prefix ?? ""
  );
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethodToggleState>(() =>
    paymentMethodStateFromSettings(settings)
  );

  const enabledCount = useMemo(
    () => countEnabledPaymentMethods(paymentMethods),
    [paymentMethods]
  );

  const eftConfigured = useMemo(
    () =>
      isEftConfigured({
        ...settings,
        eft_bank_name: eftBankName,
        eft_account_name: eftAccountName,
        eft_account_number: eftAccountNumber,
      }),
    [settings, eftBankName, eftAccountName, eftAccountNumber]
  );

  const toggleMethod = (key: PaymentMethodSettingKey, enabled: boolean) => {
    setPaymentMethods((current) => ({ ...current, [key]: enabled }));
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const depositValue = Number.parseInt(defaultDepositValue, 10);
    if (Number.isNaN(depositValue) || depositValue < 0) {
      setError("Enter a valid deposit value.");
      return;
    }

    startTransition(async () => {
      const result = await updatePaymentSettingsAction({
        companyId: company.id,
        companySlug: slug,
        defaultDepositType,
        defaultDepositValue: depositValue,
        eftBankName,
        eftAccountName,
        eftAccountNumber,
        eftBranchCode,
        eftReferencePrefix,
        paymentMethods,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setSuccess("Payment settings saved.");
    });
  };

  return (
    <div className="bg-[#f0f2f5] px-4 py-4 sm:px-5 sm:py-5">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link
            href={companyRevenuePath(slug)}
            className={riseOutlineButtonClassName}
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.75} />
            Revenue
          </Link>
          <div>
            <h1 className="text-lg font-medium text-slate-800">Payment settings</h1>
            <p className="text-xs text-slate-500">
              Deposits, payment methods, and bank details for invoices.
            </p>
          </div>
        </div>
        <button
          type="submit"
          form="payment-settings-form"
          disabled={pending}
          className={risePrimaryButtonClassName}
        >
          <Save className="h-4 w-4" strokeWidth={1.75} />
          {pending ? "Saving..." : "Save settings"}
        </button>
      </div>

      {error ? (
        <p className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          <Check className="h-4 w-4" strokeWidth={2} />
          {success}
        </p>
      ) : null}

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Enabled methods"
          value={String(enabledCount)}
          hint={`${PAYMENT_METHOD_CATALOG.length} available`}
          tone={enabledCount > 0 ? "positive" : "warning"}
        />
        <SummaryCard
          label="Default deposit"
          value={depositLabel(defaultDepositType, Number(defaultDepositValue) || 0)}
          hint="Applied to new invoices"
        />
        <SummaryCard
          label="Bank transfer"
          value={eftConfigured ? "Configured" : "Incomplete"}
          hint={
            paymentMethods.eft_enabled
              ? eftConfigured
                ? "Shown on invoices"
                : "Add bank details below"
              : "EFT is disabled"
          }
          tone={paymentMethods.eft_enabled && !eftConfigured ? "warning" : "neutral"}
        />
      </div>

      <form id="payment-settings-form" onSubmit={onSubmit} className="space-y-4">
        <section className={riseCardClassName}>
          <WidgetHeader
            icon={Percent}
            title="Default deposit"
            description="Applied when creating invoices from bookings or quotes unless overridden."
          />
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-slate-700">Deposit type</span>
              <select
                value={defaultDepositType}
                onChange={(event) =>
                  setDefaultDepositType(event.target.value as DepositType)
                }
                className={riseInputClassName}
              >
                <option value="full">Full amount</option>
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed amount (cents)</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1.5 block font-medium text-slate-700">Deposit value</span>
              <input
                type="number"
                min={0}
                value={defaultDepositValue}
                onChange={(event) => setDefaultDepositValue(event.target.value)}
                suppressHydrationWarning
                className={riseInputClassName}
              />
              <span className="mt-1.5 block text-xs text-slate-400">
                {defaultDepositType === "percentage"
                  ? "Percent of invoice total (e.g. 50)"
                  : defaultDepositType === "fixed"
                    ? "Amount in cents"
                    : "Use 100 for full payment"}
              </span>
            </label>
          </div>
        </section>

        <section className={riseCardClassName}>
          <WidgetHeader
            icon={CreditCard}
            title="Payment methods"
            description="Choose how customers can pay invoices. Live methods are available today; others can be enabled ahead of launch."
          />
          <div className="grid gap-3 p-4 md:grid-cols-2">
            {PAYMENT_METHOD_CATALOG.map((method) => (
              <PaymentMethodToggle
                key={method.id}
                label={method.label}
                description={method.description}
                category={method.category}
                accent={method.accent}
                live={method.live}
                enabled={paymentMethods[method.settingKey]}
                onChange={(enabled) => toggleMethod(method.settingKey, enabled)}
              />
            ))}
          </div>
        </section>

        <section className={riseCardClassName}>
          <WidgetHeader
            icon={Landmark}
            title="EFT bank details"
            description="Shown on invoices and in the customer portal when bank transfer is enabled."
            action={
              paymentMethods.eft_enabled ? (
                <span className="rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700">
                  Required for EFT
                </span>
              ) : (
                <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-500">
                  EFT disabled
                </span>
              )
            }
          />
          <div className="grid gap-4 p-4 sm:grid-cols-2">
            <Field label="Bank name" value={eftBankName} onChange={setEftBankName} />
            <Field label="Account name" value={eftAccountName} onChange={setEftAccountName} />
            <Field
              label="Account number"
              value={eftAccountNumber}
              onChange={setEftAccountNumber}
            />
            <Field label="Branch code" value={eftBranchCode} onChange={setEftBranchCode} />
            <Field
              label="Reference prefix"
              value={eftReferencePrefix}
              onChange={setEftReferencePrefix}
              className="sm:col-span-2"
              hint="Optional prefix for payment references (e.g. INV)"
            />
          </div>
        </section>

        <section className={cn(riseCardClassName, "p-4")}>
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
              <Wallet className="h-4 w-4" strokeWidth={1.75} />
            </span>
            <div className="text-sm text-slate-600">
              <p className="font-medium text-slate-800">Manual payments</p>
              <p className="mt-1">
                <Banknote className="mr-1 inline h-4 w-4 align-text-bottom text-slate-400" />
                Cash and confirmed EFT payments can be recorded from the Payments page after
                customers pay outside online checkout.
              </p>
            </div>
          </div>
        </section>
      </form>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  className,
  hint,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  hint?: string;
}) {
  return (
    <label className={className}>
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        suppressHydrationWarning
        className={riseInputClassName}
      />
      {hint ? <span className="mt-1.5 block text-xs text-slate-400">{hint}</span> : null}
    </label>
  );
}
