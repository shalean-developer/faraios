"use client";

import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import {
  MarketingNav,
  type MarketingNavActive,
} from "@/components/marketing/MarketingNav";
import { useMarketingNavAuth } from "@/components/marketing/use-marketing-nav-auth";

type Props = {
  children: React.ReactNode;
  active?: MarketingNavActive;
};

export function MarketingPageShell({ children, active }: Props) {
  const auth = useMarketingNavAuth();

  return (
    <div className="min-h-screen overflow-x-hidden bg-white font-sans">
      <MarketingNav
        isAuthenticated={auth.isAuthenticated}
        companySlug={auth.companySlug}
        isPlatformAdmin={auth.isPlatformAdmin}
        active={active}
        onLogout={auth.onLogout}
      />
      {children}
      <MarketingFooter />
    </div>
  );
}
