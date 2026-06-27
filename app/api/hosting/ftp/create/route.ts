import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { adminCreateFtpAccount } from "@/lib/services/hosting-resources";
import { isCurrentUserPlatformAdmin } from "@/lib/services/admin";

export async function POST(req: Request) {
  const body = (await req.json()) as {
    serviceId?: string;
    username?: string;
    homeDirectory?: string;
  };

  if (!body.serviceId || !body.username) {
    return NextResponse.json(
      { ok: false, error: "serviceId and username are required." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized." }, { status: 401 });
  }

  const isAdmin = await isCurrentUserPlatformAdmin();
  if (!isAdmin) {
    const { data: service } = await supabase
      .from("hosting_services")
      .select("company_id")
      .eq("id", body.serviceId)
      .maybeSingle();

    if (!service) {
      return NextResponse.json({ ok: false, error: "Service not found." }, { status: 404 });
    }

    const { data: membership } = await supabase
      .from("memberships")
      .select("id")
      .eq("company_id", service.company_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!membership) {
      return NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 });
    }
  }

  const result = await adminCreateFtpAccount({
    serviceId: body.serviceId,
    username: body.username,
    homeDirectory: body.homeDirectory,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, username: result.username });
}
