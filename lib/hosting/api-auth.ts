import { NextResponse } from "next/server";
import { isCurrentUserPlatformAdmin } from "@/lib/services/admin";

export async function requireHostingAdmin(): Promise<
  | { ok: true }
  | { ok: false; response: NextResponse }
> {
  if (!(await isCurrentUserPlatformAdmin())) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: "Forbidden." }, { status: 403 }),
    };
  }
  return { ok: true };
}
