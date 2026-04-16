import { NextResponse } from "next/server";

import { createClient } from "@/lib/supabase/server";

type ResendRequest = {
  email?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as ResendRequest;
  const email = typeof body.email === "string" ? body.email.trim() : "";

  if (!email) {
    return NextResponse.json(
      { ok: false, error: "Email is required." },
      { status: 400 }
    );
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
  });

  if (error) {
    return NextResponse.json(
      { ok: false, error: error.message },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
