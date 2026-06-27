import {
  listMarketplaceBusinessesPublic,
} from "@/lib/services/marketplace";
import { loadMarketingNavAuth } from "@/lib/auth/marketing-nav-auth";
import { createClient } from "@/lib/supabase/server";
import { MarketplaceDirectory } from "@/components/marketplace/marketplace-directory";
import { platformPageMetadata } from "@/lib/seo/platform-metadata";

export const metadata = platformPageMetadata({
  title: "Marketplace — FaraiOS",
  description:
    "Discover local service businesses on FaraiOS. View their websites and book services online.",
  path: "/marketplace",
});

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
