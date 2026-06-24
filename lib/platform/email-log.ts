import { tryCreateAdminClient } from "@/lib/supabase/admin";

export type PlatformEmailLogInput = {
  to: string;
  subject?: string | null;
  template?: string | null;
  status: "sent" | "failed" | "queued";
  companyId?: string | null;
  provider?: string;
  errorMessage?: string | null;
};

export async function logPlatformEmail(input: PlatformEmailLogInput): Promise<void> {
  const admin = tryCreateAdminClient();
  if (!admin.ok) return;

  try {
    await admin.client.from("platform_email_logs").insert({
      provider: input.provider ?? "resend",
      template: input.template ?? null,
      to_address: input.to,
      subject: input.subject ?? null,
      status: input.status,
      company_id: input.companyId ?? null,
      error_message: input.errorMessage ?? null,
    });
  } catch (error) {
    console.error("[platform] logPlatformEmail", error);
  }
}
