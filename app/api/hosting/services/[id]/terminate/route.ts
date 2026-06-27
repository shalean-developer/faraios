import { NextResponse } from "next/server";
import { requireHostingAdmin } from "@/lib/hosting/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { terminateHostingService } from "@/lib/hosting/plesk/provisioning";

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

  const result = await terminateHostingService(serviceId, service.plesk_subscription_id);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  await admin
    .from("hosting_services")
    .update({
      status: "terminated",
      terminated_at: new Date().toISOString(),
    })
    .eq("id", serviceId);

  return NextResponse.json({ ok: true });
}
