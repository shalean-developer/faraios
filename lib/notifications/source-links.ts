import {
  companyAutomationsPath,
  companyBookingPath,
  companyCustomerPath,
  companyInvoicePath,
  companyQuotePath,
  companyTasksPath,
} from "@/lib/paths/company";

export function notificationEntityPath(
  slug: string,
  entityType: string | null,
  entityId: string | null
): string | null {
  if (!entityType || !entityId) return null;

  switch (entityType) {
    case "booking":
      return companyBookingPath(slug, entityId);
    case "customer":
      return companyCustomerPath(slug, entityId);
    case "quote":
      return companyQuotePath(slug, entityId);
    case "invoice":
      return companyInvoicePath(slug, entityId);
    case "task":
      return companyTasksPath(slug);
    case "workflow":
    case "automation":
      return companyAutomationsPath(slug);
    default:
      return null;
  }
}

export function notificationTypeLabel(type: string): string {
  return type.replace(/_/g, " ");
}
