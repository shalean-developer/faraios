"use client";



import { useState, useTransition } from "react";

import Link from "next/link";

import { Loader2 } from "lucide-react";

import { createHostingOrderAction } from "@/app/actions/hosting-automation";

import { rememberHostingPaymentReference } from "@/components/hosting/hosting-payment-recovery";
import { formatHostingAmount } from "@/components/hosting/hosting-shared-ui";

import { Button } from "@/components/ui/button";

import { companyHostingInvoicesPath } from "@/lib/paths/company";

import type { HostingPlanRow } from "@/types/hosting-automation";

import type { CompanyWithIndustry } from "@/types/database";



export function CompanyHostingOrderClient({

  slug,

  company,

  plans,

  billingEmail,

}: {

  slug: string;

  company: CompanyWithIndustry;

  plans: HostingPlanRow[];

  billingEmail?: string | null;

}) {

  const [planId, setPlanId] = useState(plans[0]?.id ?? "");

  const [domainName, setDomainName] = useState("");

  const [domainType, setDomainType] = useState<"new" | "existing">("existing");

  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">("monthly");

  const [error, setError] = useState<string | null>(null);

  const [pending, startTransition] = useTransition();



  const selectedPlan = plans.find((p) => p.id === planId);

  const amount =

    selectedPlan &&

    (billingCycle === "yearly"

      ? selectedPlan.yearly_price_cents

      : selectedPlan.monthly_price_cents);



  const onSubmit = () => {

    setError(null);

    startTransition(async () => {

      const result = await createHostingOrderAction({

        companyId: company.id,

        companySlug: slug,

        planId,

        domainName,

        domainType,

        billingCycle,

      });



      if (!result.ok) {

        setError(result.error);

        return;

      }



      if (!result.invoiceId || !result.orderId) {

        setError("Order created but payment details missing.");

        return;

      }



      const email = company.primary_contact_email?.trim() || billingEmail?.trim();

      if (!email) {

        setError("Missing billing email.");

        return;

      }



      const payRes = await fetch("/api/paystack/hosting/initialize", {

        method: "POST",

        headers: { "Content-Type": "application/json" },

        body: JSON.stringify({

          companyId: company.id,

          email,

          orderId: result.orderId,

          invoiceId: result.invoiceId,

          plan: selectedPlan?.slug,

        }),

      });

      const payJson = await payRes.json();

      if (!payRes.ok || !payJson.authorizationUrl) {

        setError(payJson.error ?? "Could not start payment.");

        return;

      }

      if (payJson.reference) {
        rememberHostingPaymentReference(company.id, payJson.reference as string);
      }

      window.location.href = payJson.authorizationUrl as string;

    });

  };



  return (

    <>

      <h1 className="text-2xl font-bold tracking-tight text-slate-900">Order hosting</h1>

      <p className="mt-2 text-sm text-slate-500">

        Select a plan, enter your domain, and pay via Paystack.

      </p>



      <div className="mt-6 space-y-4 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">

        <label className="block text-xs font-semibold text-slate-600">

          Hosting plan

          <select

            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"

            value={planId}

            onChange={(e) => setPlanId(e.target.value)}

          >

            {plans.map((plan) => (

              <option key={plan.id} value={plan.id}>

                {plan.name}

              </option>

            ))}

          </select>

        </label>



        <label className="block text-xs font-semibold text-slate-600">

          Domain name

          <input

            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"

            value={domainName}

            onChange={(e) => setDomainName(e.target.value)}

            placeholder="example.co.za"

          />

        </label>



        <div className="grid gap-3 sm:grid-cols-2">

          <label className="block text-xs font-semibold text-slate-600">

            Domain type

            <select

              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"

              value={domainType}

              onChange={(e) => setDomainType(e.target.value as "new" | "existing")}

            >

              <option value="existing">Use existing domain</option>

              <option value="new">Register new domain</option>

            </select>

          </label>

          <label className="block text-xs font-semibold text-slate-600">

            Billing cycle

            <select

              className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"

              value={billingCycle}

              onChange={(e) => setBillingCycle(e.target.value as "monthly" | "yearly")}

            >

              <option value="monthly">Monthly</option>

              <option value="yearly">Yearly</option>

            </select>

          </label>

        </div>



        {amount != null && (

          <p className="text-sm font-semibold text-slate-900">

            Total due: {formatHostingAmount(amount)}

          </p>

        )}



        {error && <p className="text-sm text-red-600">{error}</p>}



        <div className="flex flex-wrap gap-2">

          <Button disabled={pending || !planId || !domainName} onClick={onSubmit}>

            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create order & pay"}

          </Button>

          <Link

            href={companyHostingInvoicesPath(slug)}

            className="inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium"

          >

            View invoices

          </Link>

        </div>

      </div>

    </>

  );

}

