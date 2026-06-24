import { tryCreateAdminClient } from "@/lib/supabase/admin";

export type CompanyNotificationPreferences = {  emailBookingAlerts: boolean;
  emailInvoiceAlerts: boolean;
  emailLeadAlerts: boolean;
  emailMarketingDigest: boolean;
};

export const DEFAULT_NOTIFICATION_PREFERENCES: CompanyNotificationPreferences = {
  emailBookingAlerts: true,
  emailInvoiceAlerts: true,
  emailLeadAlerts: true,
  emailMarketingDigest: false,
};

export function parseNotificationPreferences(
  raw: unknown
): CompanyNotificationPreferences {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_NOTIFICATION_PREFERENCES };
  const record = raw as Record<string, unknown>;
  return {
    emailBookingAlerts:
      record.emailBookingAlerts !== undefined
        ? Boolean(record.emailBookingAlerts)
        : DEFAULT_NOTIFICATION_PREFERENCES.emailBookingAlerts,
    emailInvoiceAlerts:
      record.emailInvoiceAlerts !== undefined
        ? Boolean(record.emailInvoiceAlerts)
        : DEFAULT_NOTIFICATION_PREFERENCES.emailInvoiceAlerts,
    emailLeadAlerts:
      record.emailLeadAlerts !== undefined
        ? Boolean(record.emailLeadAlerts)
        : DEFAULT_NOTIFICATION_PREFERENCES.emailLeadAlerts,
    emailMarketingDigest:
      record.emailMarketingDigest !== undefined
        ? Boolean(record.emailMarketingDigest)
        : DEFAULT_NOTIFICATION_PREFERENCES.emailMarketingDigest,
  };
}

export async function companyAllowsNotificationEmail(
  companyId: string | undefined,
  key: keyof CompanyNotificationPreferences
): Promise<boolean> {
  if (!companyId) return true;
  const admin = tryCreateAdminClient();
  if (!admin.ok) return true;

  const { data } = await admin.client
    .from("companies")
    .select("notification_preferences")
    .eq("id", companyId)
    .maybeSingle();

  const prefs = parseNotificationPreferences(data?.notification_preferences);
  return prefs[key];
}
