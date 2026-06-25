"use server";

import { revalidatePath } from "next/cache";

import { applyIndustryTemplate } from "@/lib/industry-templates/apply-template";
import { requireCompanyOwner } from "@/lib/services/company-access";
import { getIndustryById } from "@/lib/services/industries";
import { companyDashboardPath, companySettingsPath } from "@/lib/paths/company";

export type IndustryTemplateActionResult =
  | { ok: true; industryName: string; servicesCreated: number; servicesSkipped: number }
  | { ok: false; error: string };

export async function applyCompanyIndustryTemplateAction(input: {
  companyId: string;
  companySlug: string;
  industryId: string;
  businessName: string;
  overwriteTemplateServices?: boolean;
  resetBookingForm?: boolean;
}): Promise<IndustryTemplateActionResult> {
  const access = await requireCompanyOwner(input.companyId);
  if (!access.ok) return access;

  const industry = await getIndustryById(input.industryId);
  if (!industry?.slug) {
    return { ok: false, error: "Industry not found." };
  }

  const result = await applyIndustryTemplate({
    companyId: input.companyId,
    industryId: input.industryId,
    industrySlug: industry.slug,
    businessName: input.businessName,
    overwriteTemplateServices: input.overwriteTemplateServices,
    resetBookingForm: input.resetBookingForm,
  });

  if (!result.ok) return result;

  revalidatePath(companySettingsPath(input.companySlug));
  revalidatePath(companyDashboardPath(input.companySlug));
  revalidatePath(`/${input.companySlug}/dashboard/services`);
  revalidatePath(`/${input.companySlug}/dashboard/booking-form`);

  return {
    ok: true,
    industryName: result.industryName,
    servicesCreated: result.servicesCreated,
    servicesSkipped: result.servicesSkipped,
  };
}
