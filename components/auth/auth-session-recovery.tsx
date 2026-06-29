"use client";

import { useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  hasSupabaseAuthCookies,
  isProtectedAppPath,
  recoverBrowserAuthSession,
  signInUrlForExpiredSession,
} from "@/lib/auth/invalid-refresh-token";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

/**
 * Clears stale Supabase auth cookies so expired/revoked refresh tokens do not
 * spam the browser console on every page load.
 */
export function AuthSessionRecovery() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (!hasSupabaseAuthCookies()) return;

    void recoverBrowserAuthSession(getSupabaseBrowserClient()).then((expired) => {
      if (!expired) return;
      if (!isProtectedAppPath(pathname)) return;

      const search = searchParams.toString();
      router.replace(
        signInUrlForExpiredSession(pathname, search ? `?${search}` : "")
      );
    });
  }, [pathname, router, searchParams]);

  return null;
}
