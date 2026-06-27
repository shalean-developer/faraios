import { NextResponse } from "next/server";
import { requireHostingAdmin } from "@/lib/hosting/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { unsuspendHostingService } from "@/lib/hosting/plesk/provisioning";
import { notifyServiceUnsuspended } from "@/lib/services/hosting-notifications";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireHostingAdmin();
  if (!auth.ok) return auth.response;

  const { id: serviceId } = await params;
  const admin = createAdminClient();
  const { data: service } = await admin
    .from("hosting_services")
    .select("*")
    .eq("id", serviceId)
    .maybeSingle();

  if (!service?.plesk_subscription_id) {
    return NextResponse.json({ ok: false, error: "Service not found." }, { status: 404 });
  }

  const result = await unsuspendHostingService(serviceId, service.plesk_subscription_id);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  await admin
    .from("hosting_services")
    .update({ status: "active", suspended_at: null })
    .eq("id", serviceId);

  await notifyServiceUnsuspended(service.company_id, service.domain_name);
  return NextResponse.json({ ok: true });
}
