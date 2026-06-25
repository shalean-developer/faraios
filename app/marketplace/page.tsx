import {
  listMarketplaceBusinessesPublic,
} from "@/lib/services/marketplace";
import { loadMarketingNavAuth } from "@/lib/auth/marketing-nav-auth";
import { createClient } from "@/lib/supabase/server";
import { MarketplaceDirectory } from "@/components/marketplace/marketplace-directory";

export const metadata = {
  title: "Marketplace — Shalean",
  description:
    "Discover local service businesses on Shalean. View their websites and book services online.",
};

export const dynamic = "force-dynamic";

export default async function MarketplacePage() {
  const supabase = await createClient();
  const auth = await loadMarketingNavAuth(supabase);
  const listings = await listMarketplaceBusinessesPublic();

  return (
    <MarketplaceDirectory
      listings={listings}
      isAuthenticated={auth.isAuthenticated}
      companySlug={auth.companySlug}
      isPlatformAdmin={auth.isPlatformAdmin}
    />
  );
}
