import { Suspense } from "react";
import type { Metadata } from "next";

import { CustomWebsiteService } from "@/components/CustomWebsiteService";
import { listMemberCompaniesWithIndustry } from "@/lib/services/companies";
import { listFeatures } from "@/lib/services/features";
import { listIndustries } from "@/lib/services/industries";
import { createClient } from "@/lib/supabase/server";
import { renderWebsiteTemplate } from "@/lib/services/render-website-template";
import { getTenantContext, getTenantMetadata } from "@/lib/services/tenant-site";
import { TenantHomeSchema } from "@/lib/services/tenant-seo";
import {
  isTenantBuilderWebsite,
  renderTenantBuilderPublicSite,
} from "@/lib/website-builder/tenant-public-site";
import {
  buildPlatformOpenGraph,
  buildPlatformTwitter,
  FARAIOS_DEFAULT_DESCRIPTION,
  FARAIOS_DEFAULT_TITLE,
} from "@/lib/seo/platform-metadata";
import { PlatformHomeSchema } from "@/lib/seo/platform-schema";

import { HomeFallback } from "./home-fallback";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const ctx = await getTenantContext();
  if (ctx.mainHost) {
    return {
      title: FARAIOS_DEFAULT_TITLE,
      description: FARAIOS_DEFAULT_DESCRIPTION,
      alternates: { canonical: "/" },
      openGraph: buildPlatformOpenGraph(),
      twitter: buildPlatformTwitter(),
    };
  }
  return getTenantMetadata("home");
}

async function HomeData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [industries, features, companies] = await Promise.all([
    listIndustries(),
    listFeatures(),
    user ? listMemberCompaniesWithIndustry(user.id) : Promise.resolve([]),
  ]);

  return (
    <CustomWebsiteService
      industries={industries}
      features={features}
      initialCompanies={companies}
    />
  );
}

export default async function HomePage() {
  const ctx = await getTenantContext();
  const isMainExperience = ctx.mainHost;

  if (isMainExperience) {
    return (
      <>
        <PlatformHomeSchema />
        <Suspense fallback={<HomeFallback />}>
          <HomeData />
        </Suspense>
      </>
    );
  }

  const website = ctx.website;
  if (!website) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-600">
        Website not configured
      </div>
    );
  }

  if (website.status !== "published") {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-600">
        Coming soon
      </div>
    );
  }

  if (isTenantBuilderWebsite(website)) {
    const builderSite = await renderTenantBuilderPublicSite(website);
    if (builderSite) {
      return builderSite;
    }
  }

  return (
    <>
      <TenantHomeSchema
        companyId={website.client_id}
        websiteName={website.name}
        host={ctx.host}
        websiteContent={ctx.content.map((c) => ({
          section: c.section,
          content: c.content as Record<string, unknown>,
        }))}
      />
      {renderWebsiteTemplate(website, ctx.content, "home", {
        bookingUrl: ctx.bookingUrl,
        marketplaceBookingUrl: ctx.marketplaceBookingUrl,
        companyBranding: ctx.companyBranding,
      })}
    </>
  );
}
