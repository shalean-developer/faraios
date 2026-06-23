import {
  companyBookingPath,
  companyCustomerPath,
  companyInvoicePath,
  companyQuotePath,
} from "@/lib/paths/company";

export function taskSourcePath(
  slug: string,
  sourceType: string | null,
  sourceId: string | null
): string | null {
  if (!sourceType || !sourceId) return null;

  switch (sourceType) {
    case "booking":
      return companyBookingPath(slug, sourceId);
    case "customer":
      return companyCustomerPath(slug, sourceId);
    case "quote":
      return companyQuotePath(slug, sourceId);
    case "invoice":
      return companyInvoicePath(slug, sourceId);
    default:
      return null;
  }
}

export function taskSourceLabel(sourceType: string | null): string | null {
  if (!sourceType) return null;
  return sourceType.replace(/_/g, " ");
}
