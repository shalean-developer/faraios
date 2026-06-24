"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";

import { updatePaymentSettingsAction } from "@/app/actions/payment-settings";
import { Button } from "@/components/ui/button";
import type { DepositType } from "@/lib/financial/status";
import type { CompanyPaymentSettings } from "@/types/financial";
import type { CompanyWithIndustry } from "@/types/database";

export function CompanyPaymentSettingsClient({
  slug,
  company,
  settings,
}: {
  slug: string;
  company: CompanyWithIndustry;
  settings: CompanyPaymentSettings;
}) {
  const router = useRouter();
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
  const [paystackEnabled, setPaystackEnabled] = useState(settings.paystack_enabled);
  const [eftEnabled, setEftEnabled] = useState(settings.eft_enabled);

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
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
        paystackEnabled,
        eftEnabled,
      });

      if (!result.ok) {
        setError(result.error);
        return;
      }

      setSuccess("Payment settings saved.");
      router.refresh();
    });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
          Revenue
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          Payment settings
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Default deposit rules, EFT bank details, and enabled payment methods for invoices.
        </p>
      </header>

      {error ? (
        <p className="mb-4 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {success ? (
        <p className="mb-4 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {success}
        </p>
      ) : null}

      <form
        onSubmit={onSubmit}
        className="space-y-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      >
        <section className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Default deposit</h2>
            <p className="mt-1 text-sm text-slate-500">
              Applied when creating invoices from bookings or quotes unless overridden.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Deposit type</span>
              <select
                value={defaultDepositType}
                onChange={(e) => setDefaultDepositType(e.target.value as DepositType)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
              >
                <option value="full">Full amount</option>
                <option value="percentage">Percentage</option>
                <option value="fixed">Fixed amount (cents)</option>
              </select>
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-slate-700">Deposit value</span>
              <input
                type="number"
                min={0}
                value={defaultDepositValue}
                onChange={(e) => setDefaultDepositValue(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2"
              />
              <span className="mt-1 block text-xs text-slate-400">
                {defaultDepositType === "percentage"
                  ? "Percent of invoice total (e.g. 50)"
                  : defaultDepositType === "fixed"
                    ? "Amount in cents"
                    : "Use 100 for full payment"}
              </span>
            </label>
          </div>
        </section>

        <section className="space-y-4 border-t border-slate-100 pt-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Payment methods</h2>
            <p className="mt-1 text-sm text-slate-500">
              Choose which methods customers can use when paying invoices.
            </p>
          </div>
          <div className="flex flex-wrap gap-6 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={paystackEnabled}
                onChange={(e) => setPaystackEnabled(e.target.checked)}
              />
              Paystack (card & online)
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={eftEnabled}
                onChange={(e) => setEftEnabled(e.target.checked)}
              />
              EFT / bank transfer
            </label>
          </div>
        </section>

        <section className="space-y-4 border-t border-slate-100 pt-6">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">EFT bank details</h2>
            <p className="mt-1 text-sm text-slate-500">
              Shown on invoices and in the customer portal when EFT is enabled.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
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

        <Button type="submit" className="rounded-xl" disabled={pending}>
          {pending ? "Saving..." : "Save payment settings"}
        </Button>
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
      <span className="mb-1 block text-sm font-medium text-slate-700">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
      />
      {hint ? <span className="mt-1 block text-xs text-slate-400">{hint}</span> : null}
    </label>
  );
}
