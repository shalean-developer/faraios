import { NextResponse, type NextRequest } from "next/server";

import { resolvePostLoginPath } from "@/lib/auth/post-login-redirect";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ path: "/auth/sign-in" });
  }

  const next = request.nextUrl.searchParams.get("next");
  const path = await resolvePostLoginPath(supabase, user.id, next);
  return NextResponse.json({ path });
}
