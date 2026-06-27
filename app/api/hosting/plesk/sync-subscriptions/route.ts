import { NextResponse } from "next/server";
import { requireHostingAdmin } from "@/lib/hosting/api-auth";
import { runSyncPleskSubscriptions } from "@/lib/services/hosting-plesk-admin";

export async function POST(req: Request) {
  const auth = await requireHostingAdmin();
  if (!auth.ok) return auth.response;

  const body = (await req.json()) as { serverId?: string };
  if (!body.serverId) {
    return NextResponse.json({ ok: false, error: "serverId is required." }, { status: 400 });
  }

  const result = await runSyncPleskSubscriptions(body.serverId);
  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    count: result.count,
    synced: result.synced,
  });
}
