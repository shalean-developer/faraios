import { PublicSite } from "@/components/website-builder/public-site";
import { getPublicBuilderSiteData } from "@/lib/website-builder/service";
import type { Website } from "@/types/database";
import type { LandingPageContent } from "@/types/website-builder";

export type TenantWebsiteRow = Website & {
  builder_mode?: boolean;
  slug?: string | null;
};

export function isTenantBuilderWebsite(
  website: Website | null | undefined
): website is TenantWebsiteRow & { builder_mode: true; slug: string } {
  if (!website) return false;
  const row = website as TenantWebsiteRow;
  return Boolean(row.builder_mode && row.slug?.trim());
}

export async function renderTenantBuilderPublicSite(website: TenantWebsiteRow) {
  const companySlug = website.slug!.trim();
  const data = await getPublicBuilderSiteData(companySlug);
  if (!data?.company || !data.website) {
    return null;
  }

  const landingPage = data.pages.find((page) => page.page_type === "landing");
  const landing = (landingPage?.content ?? null) as LandingPageContent | null;

  return (
    <PublicSite
      companySlug={companySlug}
      companyId={data.company.id as string}
      companyName={data.company.name as string}
      website={data.website}
      landing={landing}
      servicePages={data.servicePages}
      contentPosts={data.contentPosts}
      preview={data.preview}
    />
  );
}
