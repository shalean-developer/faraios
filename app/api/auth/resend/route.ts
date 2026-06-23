import { NextResponse } from "next/server";

import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

const RESEND_LIMIT = 3;
const RESEND_WINDOW_MS = 15 * 60 * 1000;

export async function POST(request: Request) {
  const ip = getClientIp(request);
  const limited = rateLimit(`auth-resend:${ip}`, RESEND_LIMIT, RESEND_WINDOW_MS);
  if (!limited.ok) {
    return NextResponse.json(
      {
        ok: false,
        error: `Too many requests. Try again in ${limited.retryAfterSec} seconds.`,
      },
      {
        status: 429,
        headers: { "Retry-After": String(limited.retryAfterSec) },
      }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.json(
      { ok: false, error: "Sign in to resend your verification email." },
      { status: 401 }
    );
  }

  const { error } = await supabase.auth.resend({
    type: "signup",
    email: user.email,
  });

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
