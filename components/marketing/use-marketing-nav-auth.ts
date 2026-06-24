"use client";

import { useEffect, useState } from "react";

import { loadMarketingNavAuth } from "@/lib/auth/marketing-nav-auth";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";

export function useMarketingNavAuth() {
  const [navAuth, setNavAuth] = useState({
    isAuthenticated: false,
    companySlug: null as string | null,
    isPlatformAdmin: false,
  });

  useEffect(() => {
    loadMarketingNavAuth(getSupabaseBrowserClient()).then(setNavAuth);
  }, []);

  const onLogout = async () => {
    await getSupabaseBrowserClient().auth.signOut();
    window.location.href = "/";
  };

  return { ...navAuth, onLogout };
}
