"use client";

import { useEffect } from "react";

import { safeGetUser } from "@/lib/auth/invalid-refresh-token";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

function hasSupabaseAuthCookie(): boolean {
  return document.cookie
    .split(";")
    .some(
      (part) =>
        part.trim().startsWith("sb-") && part.includes("-auth-token")
    );
}

/**
 * Clears stale Supabase auth cookies so expired/revoked refresh tokens do not
 * spam the browser console on every page load.
 */
export function AuthSessionRecovery() {
  useEffect(() => {
    if (!hasSupabaseAuthCookie()) return;

    void safeGetUser(getSupabaseBrowserClient());
  }, []);

  return null;
}
