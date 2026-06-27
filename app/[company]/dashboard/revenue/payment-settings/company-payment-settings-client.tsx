"use client";

import { RisePaymentSettings } from "@/components/company/rise-payment-settings";
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
  return <RisePaymentSettings slug={slug} company={company} settings={settings} />;
}
