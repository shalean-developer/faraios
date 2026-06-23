"use client";

import { useState } from "react";

import { CustomerFormPopover } from "@/components/company/customer-form-popover";
import { Button } from "@/components/ui/button";
import type { Customer } from "@/types/database";

export function CompanyCustomerDetailHeader({
  slug,
  companyId,
  customer,
}: {
  slug: string;
  companyId: string;
  customer: Customer;
}) {
  const [showCustomerForm, setShowCustomerForm] = useState(false);

  return (
    <>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-violet-600">
            Customer
          </p>
          <h1 className="mt-1 text-2xl font-bold text-slate-900">{customer.name}</h1>
        </div>
        <Button
          type="button"
          className="rounded-xl"
          onClick={() => setShowCustomerForm(true)}
        >
          Edit customer
        </Button>
      </div>

      <CustomerFormPopover
        open={showCustomerForm}
        onClose={() => setShowCustomerForm(false)}
        slug={slug}
        companyId={companyId}
        customer={customer}
      />
    </>
  );
}
