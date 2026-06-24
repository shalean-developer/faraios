"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, CreditCard, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  formatZar,
  normalizePlanSlug,
  planLabelForSlug,
  pricingPlans,
  type PricingPlanSlug,
} from "@/lib/data/pricing";
import { companyDashboardPath, companyHostingPath } from "@/lib/paths/company";
import { cn } from "@/lib/utils";
import type { CompanyWithIndustry } from "@/types/database";

type Props = {
  slug: string;
  company: CompanyWithIndustry;
  paymentSuccess?: boolean;
};

function subscriptionBadge(status?: string | null) {
  const map: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-800 ring-emerald-100",
    trialing: "bg-sky-50 text-sky-800 ring-sky-100",
    past_due: "bg-amber-50 text-amber-800 ring-amber-100",
    cancelled: "bg-slate-50 text-slate-600 ring-slate-100",
  };
  return map[status ?? ""] ?? "bg-slate-50 text-slate-600 ring-slate-100";
}

export function CompanySubscriptionClient({
  slug,
  company,
  paymentSuccess,
}: Props) {
  const currentPlan = normalizePlanSlug(company.plan);
  const [selectedPlan, setSelectedPlan] = useState<PricingPlanSlug>(currentPlan);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isActive = company.subscription_status === "active";

  const onPay = async () => {
    const email = company.primary_contact_email?.trim();
    if (!email) {
      setError("Add a billing email in Business settings first.");
      return;
    }

    setError(null);
    setPending(true);
    try {
      const res = await fetch("/api/paystack/initialize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyId: company.id,
          plan: selectedPlan,
          email,
        }),
      });
      const data = (await res.json()) as {
        ok: boolean;
        authorizationUrl?: string;
        error?: string;
      };
      if (!res.ok || !data.ok || !data.authorizationUrl) {
        setError(data.error ?? "Failed to initialize payment.");
        return;
      }
      window.location.href = data.authorizationUrl;
    } catch {
      setError("Could not start payment.");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-8">
      {paymentSuccess ? (
        <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
          <p>Payment received. Your workspace subscription will update shortly.</p>
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
              Workspace plan
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">
              {planLabelForSlug(currentPlan)} plan
            </h2>
            <p className="mt-2 text-sm text-slate-600">
              FaraiOS platform subscription — dashboard, bookings, CRM, and growth tools.
            </p>
          </div>
          <span
            className={cn(
              "inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1 ring-inset",
              subscriptionBadge(company.subscription_status)
            )}
          >
            {(company.subscription_status ?? "inactive").replace(/_/g, " ")}
          </span>
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-4">
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Next billing date
            </dt>
            <dd className="mt-1 text-sm font-semibold text-slate-900">
              {company.next_billing_date
                ? new Date(company.next_billing_date).toLocaleDateString("en-ZA")
                : "Not scheduled"}
            </dd>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <dt className="text-xs font-medium uppercase tracking-wider text-slate-500">
              Billing email
            </dt>
            <dd className="mt-1 text-sm font-semibold text-slate-900">
              {company.primary_contact_email ?? "Not set"}
            </dd>
          </div>
        </dl>
      </section>

      <section>
        <h3 className="text-lg font-bold text-slate-900">Choose a plan</h3>
        <p className="mt-1 text-sm text-slate-600">
          Monthly workspace subscription billed via Paystack. Setup fees are handled during onboarding.
        </p>
        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {pricingPlans.map((plan) => (
            <button
              key={plan.id}
              type="button"
              onClick={() => setSelectedPlan(plan.slug)}
              className={cn(
                "rounded-2xl border p-5 text-left transition",
                selectedPlan === plan.slug
                  ? "border-violet-500 bg-violet-50/40 ring-2 ring-violet-200"
                  : "border-slate-200 bg-white hover:border-slate-300"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold text-slate-900">{plan.name}</p>
                {plan.is_popular ? (
                  <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-violet-700">
                    Popular
                  </span>
                ) : null}
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900">
                {formatZar(plan.monthly_price)}
                <span className="text-sm font-normal text-slate-500">/mo</span>
              </p>
              <ul className="mt-4 space-y-1 text-sm text-slate-600">
                {plan.features.slice(0, 4).map((feature) => (
                  <li key={feature}>• {feature}</li>
                ))}
              </ul>
            </button>
          ))}
        </div>

        {error ? (
          <p className="mt-4 flex items-center gap-2 text-sm text-red-600">
            <XCircle className="h-4 w-4" />
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap gap-3">
          <Button
            type="button"
            className="rounded-xl"
            disabled={pending}
            onClick={onPay}
          >
            <CreditCard className="mr-2 h-4 w-4" />
            {pending
              ? "Redirecting…"
              : isActive && selectedPlan === currentPlan
                ? "Renew subscription"
                : "Pay with Paystack"}
          </Button>
          <Link
            href={companyDashboardPath(slug)}
            className="inline-flex items-center rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Back to dashboard
          </Link>
        </div>
      </section>

      <section className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 p-5 text-sm text-slate-600">
        <p className="font-semibold text-slate-900">Website hosting is separate</p>
        <p className="mt-1">
          Custom domain hosting and deployments are billed on the{" "}
          <Link href={companyHostingPath(slug)} className="font-medium text-violet-700 hover:text-violet-900">
            hosting plan
          </Link>
          . This page covers your FaraiOS workspace subscription only.
        </p>
      </section>
    </div>
  );
}
